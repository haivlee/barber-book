import { z } from "zod";

export const customerDetailsSchema = z.object({
  customerName: z.string().trim().min(2, "Please enter your name").max(80),
  customerPhone: z
    .string()
    .trim()
    .refine((v) => v.replace(/\D/g, "").length >= 7, "Please enter a valid phone number")
    .refine((v) => v.length <= 30, "Phone number is too long"),
  customerEmail: z
    .union([z.literal(""), z.email("Please enter a valid email")])
    .optional(),
  note: z.string().trim().max(300, "Keep notes under 300 characters").optional(),
});

export const createBookingSchema = customerDetailsSchema.extend({
  serviceId: z.string().min(1),
  barberId: z.string().min(1).nullable(),
  startAt: z.iso.datetime(),
});

export const BOOKING_SOURCES = ["ZALO", "PHONE", "WALK_IN"] as const;

const optionalPhone = z
  .string()
  .trim()
  .max(30, "Phone number is too long")
  .refine((v) => v === "" || v.replace(/\D/g, "").length >= 7, "Please enter a valid phone number")
  .optional();

export const manualBookingSchema = z
  .object({
    source: z.enum(BOOKING_SOURCES),
    customerName: z.string().trim().min(1, "Enter the customer's name").max(80),
    customerPhone: optionalPhone,
    customerZalo: z.string().trim().max(80).optional(),
    note: z.string().trim().max(500, "Keep notes under 500 characters").optional(),
    status: z.enum(["CONFIRMED", "PENDING"]),
    serviceId: z.string().min(1, "Choose a service"),
    barberId: z.string().min(1).nullable(),
    startAt: z.iso.datetime({ message: "Choose a time" }),
  })
  .refine((v) => v.source !== "ZALO" || !!v.customerZalo || !!v.customerPhone, {
    message: "Add the customer's Zalo name or phone so you can reply",
    path: ["customerZalo"],
  });

export type ManualBookingInput = z.infer<typeof manualBookingSchema>;
export type CustomerDetails = z.infer<typeof customerDetailsSchema>;
export type CreateBookingInput = z.infer<typeof createBookingSchema>;
