import type { Prisma } from "@prisma/client";
import { shop } from "@/config/shop";
import { db } from "@/lib/db";
import { addDaysKey, formatInShop, shopDateTime, todayKey, weekdayOf } from "@/lib/time";

export const ACTIVE_STATUSES = ["PENDING", "CONFIRMED"] as const;

export type Slot = {
  /** "HH:mm" in shop time */
  time: string;
  startAt: string;
  barberIds: string[];
};

type BarberWithHours = {
  id: string;
  workingHours: { weekday: number; startTime: string; endTime: string }[];
};

type BusyRange = { barberId: string; startAt: Date; endAt: Date };

type Client = Prisma.TransactionClient | typeof db;

const MINUTE = 60_000;

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

function toHHMM(minutes: number): string {
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}

export function bookingWindow(now: Date = new Date()) {
  const first = todayKey(now);
  return { first, last: addDaysKey(first, shop.booking.maxDaysAhead) };
}

export function isWithinBookingWindow(dateKey: string, now: Date = new Date()): boolean {
  const { first, last } = bookingWindow(now);
  return dateKey >= first && dateKey <= last;
}

/** Pure slot computation so it can be reused for a single day or a whole range. */
export function computeSlots(opts: {
  dateKey: string;
  durationMin: number;
  barbers: BarberWithHours[];
  busy: BusyRange[];
  now?: Date;
  /** Staff can book inside the customer lead time (walk-ins, same-hour Zalo requests). */
  staff?: boolean;
}): Slot[] {
  const { dateKey, durationMin, barbers, busy } = opts;
  const now = opts.now ?? new Date();
  const leadMin = opts.staff ? 0 : shop.booking.minLeadTimeMin;
  const earliest = now.getTime() + leadMin * MINUTE;
  const weekday = weekdayOf(dateKey);
  const byTime = new Map<string, Slot>();

  for (const barber of barbers) {
    const hours = barber.workingHours.find((h) => h.weekday === weekday);
    if (!hours) continue;
    const open = toMinutes(hours.startTime);
    const close = toMinutes(hours.endTime);
    const barberBusy = busy.filter((b) => b.barberId === barber.id);

    for (let m = open; m + durationMin <= close; m += shop.booking.slotIntervalMin) {
      const time = toHHMM(m);
      const start = shopDateTime(dateKey, time);
      const startMs = start.getTime();
      if (startMs < earliest) continue;
      const endMs = startMs + durationMin * MINUTE;
      const clash = barberBusy.some(
        (b) => b.startAt.getTime() < endMs && b.endAt.getTime() > startMs,
      );
      if (clash) continue;

      const existing = byTime.get(time);
      if (existing) existing.barberIds.push(barber.id);
      else byTime.set(time, { time, startAt: start.toISOString(), barberIds: [barber.id] });
    }
  }

  return [...byTime.values()].sort((a, b) => a.time.localeCompare(b.time));
}

async function loadInputs(
  client: Client,
  opts: { serviceId: string; barberId?: string | null; fromKey: string; toKey: string },
) {
  const service = await client.service.findFirst({
    where: { id: opts.serviceId, active: true },
  });
  if (!service) return null;

  const barbers = await client.barber.findMany({
    where: { active: true, ...(opts.barberId ? { id: opts.barberId } : {}) },
    include: { workingHours: true },
    orderBy: { sortOrder: "asc" },
  });

  const rangeStart = shopDateTime(opts.fromKey, "00:00");
  const rangeEnd = shopDateTime(addDaysKey(opts.toKey, 1), "00:00");
  const busy = await client.booking.findMany({
    where: {
      barberId: { in: barbers.map((b) => b.id) },
      status: { in: [...ACTIVE_STATUSES] },
      startAt: { lt: rangeEnd },
      endAt: { gt: rangeStart },
    },
    select: { barberId: true, startAt: true, endAt: true },
  });

  return { service, barbers, busy };
}

export async function getSlotsForDay(
  opts: { serviceId: string; barberId?: string | null; dateKey: string; staff?: boolean },
  client: Client = db,
): Promise<Slot[] | null> {
  if (!isWithinBookingWindow(opts.dateKey)) return [];
  const inputs = await loadInputs(client, {
    ...opts,
    fromKey: opts.dateKey,
    toKey: opts.dateKey,
  });
  if (!inputs) return null;
  return computeSlots({
    dateKey: opts.dateKey,
    durationMin: inputs.service.durationMin,
    barbers: inputs.barbers,
    busy: inputs.busy,
    staff: opts.staff,
  });
}

/** Number of open slots for each day in the booking window, used to grey out full/closed days. */
export async function getOpenDays(opts: {
  serviceId: string;
  barberId?: string | null;
  staff?: boolean;
}): Promise<Record<string, number> | null> {
  const { first, last } = bookingWindow();
  const inputs = await loadInputs(db, { ...opts, fromKey: first, toKey: last });
  if (!inputs) return null;

  const result: Record<string, number> = {};
  for (let key = first; key <= last; key = addDaysKey(key, 1)) {
    result[key] = computeSlots({
      dateKey: key,
      durationMin: inputs.service.durationMin,
      barbers: inputs.barbers,
      busy: inputs.busy,
      staff: opts.staff,
    }).length;
  }
  return result;
}

/** Earliest open slot across all barbers for a service, looking ahead up to `days` days. */
export async function findNextSlot(serviceId: string, days = 7) {
  const first = todayKey();
  const last = addDaysKey(first, days);
  const inputs = await loadInputs(db, { serviceId, fromKey: first, toKey: last });
  if (!inputs) return null;
  for (let key = first; key <= last; key = addDaysKey(key, 1)) {
    const [slot] = computeSlots({
      dateKey: key,
      durationMin: inputs.service.durationMin,
      barbers: inputs.barbers,
      busy: inputs.busy,
    });
    if (slot) {
      const barber = inputs.barbers.find((b) => b.id === slot.barberIds[0]);
      return { dateKey: key, startAt: slot.startAt, barberName: barber?.name ?? null };
    }
  }
  return null;
}

/** Returns the barber that should take the slot, or null when it is no longer free. */
export async function resolveSlot(
  client: Client,
  opts: { serviceId: string; barberId?: string | null; startAt: Date; staff?: boolean },
): Promise<string | null> {
  const dateKey = formatInShop(opts.startAt, "yyyy-MM-dd");
  const time = formatInShop(opts.startAt, "HH:mm");
  const slots = await getSlotsForDay({ ...opts, dateKey }, client);
  const slot = slots?.find((s) => s.time === time);
  if (!slot) return null;
  if (opts.barberId) return slot.barberIds.includes(opts.barberId) ? opts.barberId : null;
  return pickLeastBusyBarber(client, slot.barberIds, dateKey);
}

async function pickLeastBusyBarber(client: Client, barberIds: string[], dateKey: string) {
  if (barberIds.length <= 1) return barberIds[0] ?? null;
  const counts = await client.booking.groupBy({
    by: ["barberId"],
    where: {
      barberId: { in: barberIds },
      status: { in: [...ACTIVE_STATUSES] },
      startAt: { gte: shopDateTime(dateKey, "00:00"), lt: shopDateTime(addDaysKey(dateKey, 1), "00:00") },
    },
    _count: { _all: true },
  });
  const load = new Map(counts.map((c) => [c.barberId, c._count._all]));
  return [...barberIds].sort((a, b) => (load.get(a) ?? 0) - (load.get(b) ?? 0))[0];
}
