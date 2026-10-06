"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { notifyBooking } from "@/lib/notify";
import {
  adminPassword,
  createSessionToken,
  SESSION_COOKIE,
  sessionCookieOptions,
  verifySessionToken,
} from "@/lib/session";

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

async function requireBarber() {
  const store = await cookies();
  if (!(await verifySessionToken(store.get(SESSION_COOKIE)?.value))) {
    throw new Error("Unauthorized");
  }
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
