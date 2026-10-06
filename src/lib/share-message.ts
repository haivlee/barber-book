import { vi } from "date-fns/locale";
import { shop } from "@/config/shop";
import { formatDuration, formatInShop } from "@/lib/time";

export type MessageLang = "en" | "vi";

export type ShareableBooking = {
  code: string;
  status: string;
  customerName: string;
  serviceName: string;
  durationMin: number;
  barberName: string;
  startAt: string | Date;
};

export function bookingUrl(origin: string, code: string) {
  return `${origin.replace(/\/$/, "")}/booking/${code}`;
}

export function buildBookingMessage(booking: ShareableBooking, lang: MessageLang, url: string) {
  const address = `${shop.address.line1}, ${shop.address.line2}`;
  const pending = booking.status === "PENDING";

  if (lang === "vi") {
    const when = formatInShop(booking.startAt, "EEEE, dd/MM 'lúc' HH:mm", { locale: vi });
    const minutes = `${booking.durationMin} phút`;
    return [
      pending
        ? `Chào ${booking.customerName}, ${shop.name} đã nhận yêu cầu đặt lịch của bạn và sẽ xác nhận sớm.`
        : `Chào ${booking.customerName}, lịch hẹn của bạn tại ${shop.name} đã được xác nhận.`,
      "",
      `Dịch vụ: ${booking.serviceName} (${minutes})`,
      `Thợ: ${booking.barberName}`,
      `Thời gian: ${when}`,
      `Địa chỉ: ${address}`,
      `Mã đặt lịch: ${booking.code}`,
      "",
      `Xem hoặc huỷ lịch: ${url}`,
    ].join("\n");
  }

  const when = formatInShop(booking.startAt, "EEEE, MMMM d 'at' h:mm a");
  return [
    pending
      ? `Hi ${booking.customerName}, ${shop.name} got your booking request and will confirm it shortly.`
      : `Hi ${booking.customerName}, your appointment at ${shop.name} is confirmed.`,
    "",
    `Service: ${booking.serviceName} (${formatDuration(booking.durationMin)})`,
    `Barber: ${booking.barberName}`,
    `When: ${when}`,
    `Address: ${address}`,
    `Booking ref: ${booking.code}`,
    "",
    `View or cancel your booking: ${url}`,
  ].join("\n");
}

/** zalo.me deep link that opens a chat with a phone number registered on Zalo. */
export function zaloChatUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  const digits = value.replace(/\D/g, "");
  return digits.length >= 9 && digits.length <= 15 ? `https://zalo.me/${digits}` : null;
}

/** First phone-number-looking sequence (9-15 digits) in free text, e.g. a pasted Zalo message. */
export function extractPhone(text: string): string | null {
  const matches = text.match(/\+?\d[\d\s.\-()]{7,18}\d/g) ?? [];
  for (const m of matches) {
    const digits = m.replace(/\D/g, "");
    if (digits.length >= 9 && digits.length <= 15) return m.trim();
  }
  return null;
}
