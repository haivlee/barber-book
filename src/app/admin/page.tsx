import type { Prisma } from "@prisma/client";
import type { Metadata } from "next";
import Link from "next/link";
import { CalendarCheck, CalendarDays, ExternalLink, Inbox, LogOut } from "lucide-react";
import { logout } from "@/app/admin/actions";
import { BookingCard, type AdminBooking } from "@/components/admin/booking-card";
import { PendingWatcher } from "@/components/admin/pending-watcher";
import { AutoRefresh } from "@/components/auto-refresh";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { db } from "@/lib/db";
import { addDaysKey, formatDateKeyLong, formatInShop, shopDateTime, todayKey } from "@/lib/time";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Dashboard" };
export const dynamic = "force-dynamic";

type BookingWithRelations = Awaited<ReturnType<typeof loadBookings>>[number];

function loadBookings(where: Prisma.BookingWhereInput) {
  return db.booking.findMany({
    where,
    include: { barber: true, service: true },
    orderBy: { startAt: "asc" },
  });
}

function toAdmin(b: BookingWithRelations): AdminBooking {
  return {
    id: b.id,
    code: b.code,
    status: b.status,
    startAt: b.startAt.toISOString(),
    endAt: b.endAt.toISOString(),
    createdAt: b.createdAt.toISOString(),
    customerName: b.customerName,
    customerPhone: b.customerPhone,
    customerEmail: b.customerEmail,
    note: b.note,
    barberName: b.barber.name,
    serviceName: b.service.name,
    durationMin: b.service.durationMin,
    priceCents: b.service.priceCents,
  };
}

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ barber?: string }>;
}) {
  const { barber: barberSlug } = await searchParams;
  const barbers = await db.barber.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } });
  const selectedBarber = barbers.find((b) => b.slug === barberSlug) ?? null;
  const barberFilter = selectedBarber ? { barberId: selectedBarber.id } : {};

  const now = new Date();
  const today = todayKey(now);
  const startOfToday = shopDateTime(today, "00:00");
  const startOfTomorrow = shopDateTime(addDaysKey(today, 1), "00:00");
  const horizon = shopDateTime(addDaysKey(today, 15), "00:00");

  const [requests, todays, upcoming, pendingTotal] = await Promise.all([
    loadBookings({ ...barberFilter, status: "PENDING", startAt: { gte: now } }),
    loadBookings({
      ...barberFilter,
      status: { in: ["PENDING", "CONFIRMED"] },
      startAt: { gte: startOfToday, lt: startOfTomorrow },
    }),
    loadBookings({
      ...barberFilter,
      status: "CONFIRMED",
      startAt: { gte: startOfTomorrow, lt: horizon },
    }),
    db.booking.count({ where: { status: "PENDING", startAt: { gte: now } } }),
  ]);

  const todayRevenue = todays
    .filter((b) => b.status === "CONFIRMED")
    .reduce((sum, b) => sum + b.service.priceCents, 0);

  const upcomingByDay = new Map<string, BookingWithRelations[]>();
  for (const b of upcoming) {
    const key = formatInShop(b.startAt, "yyyy-MM-dd");
    upcomingByDay.set(key, [...(upcomingByDay.get(key) ?? []), b]);
  }

  return (
    <div className="min-h-dvh bg-secondary/50">
      <AutoRefresh intervalMs={15_000} />
      <PendingWatcher count={pendingTotal} />

      <header className="sticky top-0 z-30 bg-[oklch(0.18_0.012_60)] text-[oklch(0.97_0.01_85)]">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-3 px-4 sm:px-6">
          <Logo href="/admin" />
          <div className="flex items-center gap-1 sm:gap-2">
            <Button
              asChild
              variant="ghost"
              size="lg"
              className="hidden text-inherit hover:bg-white/10 hover:text-inherit sm:inline-flex"
            >
              <Link href="/" target="_blank">
                View site <ExternalLink />
              </Link>
            </Button>
            <form action={logout}>
              <Button
                type="submit"
                variant="ghost"
                size="lg"
                className="text-inherit hover:bg-white/10 hover:text-inherit"
              >
                <LogOut /> <span className="hidden sm:inline">Sign out</span>
              </Button>
            </form>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-10">
        <div className="flex flex-col gap-1">
          <p className="text-sm text-muted-foreground">{formatDateKeyLong(today)}</p>
          <h1 className="font-heading text-3xl font-semibold tracking-tight">
            {pendingTotal > 0
              ? `${pendingTotal} request${pendingTotal === 1 ? "" : "s"} waiting`
              : "You're all caught up"}
          </h1>
        </div>

        <div className="mt-6 grid grid-cols-3 gap-3">
          <Stat label="Pending" value={String(requests.length)} highlight={requests.length > 0} />
          <Stat label="Today" value={String(todays.length)} />
          <Stat
            label="Today's takings"
            value={new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(todayRevenue / 100)}
          />
        </div>

        <div className="-mx-4 mt-6 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
          <FilterChip href="/admin" active={!selectedBarber}>
            All barbers
          </FilterChip>
          {barbers.map((b) => (
            <FilterChip key={b.id} href={`/admin?barber=${b.slug}`} active={selectedBarber?.id === b.id}>
              {b.name}
            </FilterChip>
          ))}
        </div>

        <Tabs defaultValue={requests.length > 0 ? "requests" : "today"} className="mt-6">
          <TabsList className="h-11! w-full sm:w-fit">
            <TabsTrigger value="requests" className="px-3">
              Requests
              {requests.length > 0 && (
                <span className="ml-1 grid min-w-5 place-items-center rounded-full bg-warning px-1.5 text-xs font-semibold text-[oklch(0.25_0.05_65)]">
                  {requests.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="today" className="px-3">
              Today
            </TabsTrigger>
            <TabsTrigger value="upcoming" className="px-3">
              Upcoming
            </TabsTrigger>
          </TabsList>

          <TabsContent value="requests" className="mt-4 space-y-3">
            {requests.length === 0 ? (
              <Empty
                icon={Inbox}
                title="No pending requests"
                body="New booking requests will show up here automatically."
              />
            ) : (
              requests.map((b) => <BookingCard key={b.id} booking={toAdmin(b)} />)
            )}
          </TabsContent>

          <TabsContent value="today" className="mt-4 space-y-3">
            {todays.length === 0 ? (
              <Empty
                icon={CalendarCheck}
                title="Nothing booked today"
                body="Today's confirmed and pending appointments appear here."
              />
            ) : (
              todays.map((b) => <BookingCard key={b.id} booking={toAdmin(b)} showDate={false} />)
            )}
          </TabsContent>

          <TabsContent value="upcoming" className="mt-4 space-y-6">
            {upcomingByDay.size === 0 ? (
              <Empty
                icon={CalendarDays}
                title="No confirmed appointments yet"
                body="Confirmed bookings for the next two weeks will be listed here."
              />
            ) : (
              [...upcomingByDay.entries()].map(([day, list]) => (
                <section key={day}>
                  <h2 className="mb-2 text-sm font-medium text-muted-foreground">
                    {day === addDaysKey(today, 1) ? "Tomorrow" : formatDateKeyLong(day)}
                    <span className="ml-2 text-xs">({list.length})</span>
                  </h2>
                  <div className="space-y-3">
                    {list.map((b) => (
                      <BookingCard key={b.id} booking={toAdmin(b)} showDate={false} />
                    ))}
                  </div>
                </section>
              ))
            )}
          </TabsContent>
        </Tabs>

        <p className="mt-10 text-center text-xs text-muted-foreground">
          This page refreshes every 15 seconds.
        </p>
      </main>
    </div>
  );
}

function Stat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div
      className={cn(
        "rounded-xl border bg-background p-3 sm:p-4",
        highlight && "border-warning/60 bg-warning/10",
      )}
    >
      <p className="text-xs text-muted-foreground sm:text-sm">{label}</p>
      <p className="mt-1 font-heading text-xl font-semibold sm:text-2xl">{value}</p>
    </div>
  );
}

function FilterChip({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "shrink-0 rounded-full border px-3.5 py-1.5 text-sm whitespace-nowrap transition-colors",
        active ? "border-primary bg-primary text-primary-foreground" : "bg-background hover:bg-muted",
      )}
    >
      {children}
    </Link>
  );
}

function Empty({
  icon: Icon,
  title,
  body,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  body: string;
}) {
  return (
    <div className="flex flex-col items-center rounded-xl border border-dashed bg-background/60 px-6 py-14 text-center">
      <span className="grid size-12 place-items-center rounded-full bg-muted">
        <Icon className="size-5 text-muted-foreground" />
      </span>
      <p className="mt-4 font-heading text-lg font-semibold">{title}</p>
      <p className="mt-1 max-w-xs text-sm text-muted-foreground">{body}</p>
    </div>
  );
}
