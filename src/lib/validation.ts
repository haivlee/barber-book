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

export type CustomerDetails = z.infer<typeof customerDetailsSchema>;
export type CreateBookingInput = z.infer<typeof createBookingSchema>;
