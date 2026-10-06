"use server";

import { Prisma } from "@prisma/client";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireBarber } from "@/lib/auth";
import { resolveSlot } from "@/lib/availability";
import { newBookingCode } from "@/lib/booking-code";
import { db } from "@/lib/db";
import { notifyBooking } from "@/lib/notify";
import { adminPassword, createSessionToken, SESSION_COOKIE, sessionCookieOptions } from "@/lib/session";
import { manualBookingSchema, type ManualBookingInput } from "@/lib/validation";

export type LoginState = { error?: string };

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "/admin");
  if (password !== adminPassword()) {
    return { error: "Incorrect password" };
  }
  const store = await cookies();
  store.set(SESSION_COOKIE, await createSessionToken(), sessionCookieOptions);
  redirect(next.startsWith("/admin") ? next : "/admin");
}

export async function logout() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
  redirect("/admin/login");
}

type DecisionResult = { ok: boolean; message?: string };

async function decide(
  id: string,
  status: "CONFIRMED" | "DECLINED" | "CANCELLED",
  decisionNote?: string,
): Promise<DecisionResult> {
  await requireBarber();
  const booking = await db.booking.findUnique({ where: { id } });
  if (!booking) return { ok: false, message: "Booking not found" };

  const allowedFrom: Record<typeof status, string[]> = {
    CONFIRMED: ["PENDING"],
    DECLINED: ["PENDING"],
    CANCELLED: ["PENDING", "CONFIRMED"],
  };
  if (!allowedFrom[status].includes(booking.status)) {
    return { ok: false, message: `This booking is already ${booking.status.toLowerCase()}` };
  }

  const updated = await db.booking.update({
    where: { id },
    data: { status, decisionNote: decisionNote?.trim() || null, decidedAt: new Date() },
    include: { barber: true, service: true },
  });
  const event = status === "CONFIRMED" ? "confirmed" : status === "DECLINED" ? "declined" : "cancelled";
  await notifyBooking(event, updated);
  revalidatePath("/admin");
  revalidatePath(`/booking/${updated.code}`);
  return { ok: true };
}

export async function confirmBooking(id: string) {
  return decide(id, "CONFIRMED");
}

export async function declineBooking(id: string, note?: string) {
  return decide(id, "DECLINED", note);
}

export async function cancelBookingAsBarber(id: string, note?: string) {
  return decide(id, "CANCELLED", note);
}

export type ManualBookingResult =
  | {
      ok: true;
      booking: {
        id: string;
        code: string;
        status: string;
        source: string;
        customerName: string;
        customerPhone: string | null;
        customerZalo: string | null;
        serviceName: string;
        durationMin: number;
        barberName: string;
        startAt: string;
      };
    }
  | { ok: false; reason: "invalid" | "slot_taken" | "error"; message: string };

class SlotTakenError extends Error {}

/** Records a booking that arrived outside the website (Zalo, phone, walk-in). */
export async function createManualBooking(input: ManualBookingInput): Promise<ManualBookingResult> {
  await requireBarber();
  const parsed = manualBookingSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      reason: "invalid",
      message: parsed.error.issues[0]?.message ?? "Please check the booking details",
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
          staff: true,
        });
        if (!barberId) throw new SlotTakenError();

        const service = await tx.service.findUniqueOrThrow({ where: { id: data.serviceId } });
        return tx.booking.create({
          data: {
            code: newBookingCode(),
            barberId,
            serviceId: service.id,
            source: data.source,
            customerName: data.customerName,
            customerPhone: data.customerPhone || null,
            customerZalo: data.customerZalo || null,
            note: data.note || null,
            startAt,
            endAt: new Date(startAt.getTime() + service.durationMin * 60_000),
            status: data.status,
            decidedAt: data.status === "CONFIRMED" ? new Date() : null,
          },
          include: { barber: true, service: true },
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );

    await notifyBooking("logged", booking);
    revalidatePath("/admin");
    revalidatePath("/book");
    return {
      ok: true,
      booking: {
        id: booking.id,
        code: booking.code,
        status: booking.status,
        source: booking.source,
        customerName: booking.customerName,
        customerPhone: booking.customerPhone,
        customerZalo: booking.customerZalo,
        serviceName: booking.service.name,
        durationMin: booking.service.durationMin,
        barberName: booking.barber.name,
        startAt: booking.startAt.toISOString(),
      },
    };
  } catch (err) {
    if (err instanceof SlotTakenError) {
      return {
        ok: false,
        reason: "slot_taken",
        message: "That time was just taken. Pick another slot.",
      };
    }
    console.error("createManualBooking failed", err);
    return { ok: false, reason: "error", message: "Could not save the booking. Please try again." };
  }
}
