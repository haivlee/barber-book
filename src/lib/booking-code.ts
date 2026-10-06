import { customAlphabet } from "nanoid";

const generate = customAlphabet("23456789ABCDEFGHJKLMNPQRSTUVWXYZ", 6);

export function newBookingCode(): string {
  return generate();
}
