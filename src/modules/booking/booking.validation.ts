import { z } from "zod";

// Dates are calendar days ("YYYY-MM-DD"), stored in a DATE column — no time or timezone.
const date = (field: string) => z.iso.date(`${field} must be a date in YYYY-MM-DD format`);

const place = (field: string) =>
  z
    .string({ error: `${field} is required` })
    .trim()
    .min(1, `${field} is required`)
    .max(200, `${field} can be at most 200 characters`);

export const createBookingSchema = z
  .object({
    carId: z.uuid("carId must be a valid uuid"),
    placeOfRental: place("placeOfRental"),
    placeOfReturn: place("placeOfReturn"),
    rentalDate: date("rentalDate"),
    returnDate: date("returnDate"),
  })
  .refine((b) => b.rentalDate >= new Date().toISOString().slice(0, 10), {
    message: "rentalDate cannot be in the past",
  })
  .refine((b) => b.returnDate > b.rentalDate, {
    message: "returnDate must be after rentalDate",
  });

export const bookingIdSchema = z.object({
  id: z.uuid("id must be a valid uuid"),
});

export const listBookingsSchema = z.object({
  page: z.coerce.number().int().min(1, "page must be at least 1").default(1),
  limit: z.coerce
    .number()
    .int()
    .min(1, "limit must be at least 1")
    .max(50, "limit can be at most 50")
    .default(10),
});

export type CreateBookingInput = z.infer<typeof createBookingSchema>;
export type BookingIdInput = z.infer<typeof bookingIdSchema>;
export type ListBookingsInput = z.infer<typeof listBookingsSchema>;
