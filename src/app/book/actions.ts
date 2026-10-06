"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { resolveSlot } from "@/lib/availability";
import { newBookingCode } from "@/lib/booking-code";
import { db } from "@/lib/db";
import { notifyBooking } from "@/lib/notify";
import { createBookingSchema, type CreateBookingInput } from "@/lib/validation";

export type CreateBookingResult =
  | { ok: true; code: string }
  | { ok: false; reason: "invalid" | "slot_taken" | "error"; message: string };

class SlotTakenError extends Error {}

export async function createBooking(input: CreateBookingInput): Promise<CreateBookingResult> {
  const parsed = createBookingSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      reason: "invalid",
      message: parsed.error.issues[0]?.message ?? "Please check your details",
    };
  }
  const data = parsed.data;
  const startAt = new Date(data.startAt);

  try {
    const booking = await db.$transaction(
      async (tx) => {
        const barberId = await resolveSlot(tx, {
          serviceId: data.serviceId,
          barberId: data.barberId,
          startAt,
        });
        if (!barberId) throw new SlotTakenError();

        const service = await tx.service.findUniqueOrThrow({ where: { id: data.serviceId } });
        return tx.booking.create({
          data: {
            code: newBookingCode(),
            barberId,
            serviceId: service.id,
            customerName: data.customerName,
            customerPhone: data.customerPhone,
            customerEmail: data.customerEmail || null,
            note: data.note || null,
            startAt,
            endAt: new Date(startAt.getTime() + service.durationMin * 60_000),
          },
          include: { barber: true, service: true },
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );

    await notifyBooking("requested", booking);
    revalidatePath("/admin");
    return { ok: true, code: booking.code };
  } catch (err) {
    if (err instanceof SlotTakenError) {
      return {
        ok: false,
        reason: "slot_taken",
        message: "Sorry, someone just grabbed that time. Please pick another slot.",
      };
    }
    console.error("createBooking failed", err);
    return { ok: false, reason: "error", message: "Something went wrong. Please try again." };
  }
}

export async function cancelBooking(code: string): Promise<{ ok: boolean; message?: string }> {
  const booking = await db.booking.findUnique({
    where: { code },
    include: { barber: true, service: true },
  });
  if (!booking) return { ok: false, message: "Booking not found" };
  if (booking.status === "CANCELLED" || booking.status === "DECLINED") {
    return { ok: false, message: "This booking is no longer active" };
  }
  if (booking.startAt.getTime() < Date.now()) {
    return { ok: false, message: "This appointment has already started" };
  }

  await db.booking.update({ where: { code }, data: { status: "CANCELLED" } });
  await notifyBooking("cancelled", booking);
  revalidatePath(`/booking/${code}`);
  revalidatePath("/admin");
  return { ok: true };
}
