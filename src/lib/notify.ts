import { formatDateLong, formatTime } from "@/lib/time";

type BookingEvent = "requested" | "logged" | "confirmed" | "declined" | "cancelled";

type BookingSummary = {
  code: string;
  customerName: string;
  customerPhone: string | null;
  source?: string;
  customerEmail: string | null;
  startAt: Date;
  barber: { name: string };
  service: { name: string };
};

/**
 * Single place to send customer/barber notifications. Logs to the server console for now;
 * swap the body for Resend (email) or Twilio (SMS) without touching callers.
 */
export async function notifyBooking(event: BookingEvent, booking: BookingSummary) {
  const when = `${formatDateLong(booking.startAt)} at ${formatTime(booking.startAt)}`;
  const line = `[booking:${event}] ${booking.code} - ${booking.customerName} (${booking.customerPhone ?? "no phone"})${booking.source && booking.source !== "WEBSITE" ? ` via ${booking.source}` : ""} - ${booking.service.name} with ${booking.barber.name} on ${when}`;
  console.info(line);
}
