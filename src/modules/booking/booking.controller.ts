import type { Request, Response } from "express";
import { cancelMyBooking, createBooking, getMyBookingById, getMyBookings } from "./booking.service.js";
import { bookingIdSchema, createBookingSchema, listBookingsSchema } from "./booking.validation.js";

export async function create(req: Request, res: Response) {
  try {
    const parsed = createBookingSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: "validation failed",
        details: parsed.error.issues.map((i) => i.message),
      });
    }

    const booking = await createBooking(req.user!.sub, parsed.data);
    return res.status(201).json(booking);
  } catch (err: any) {
    if (err.message === "CAR_NOT_FOUND") {
      return res.status(404).json({ error: "car not found" });
    }
    if (err.message === "CAR_NOT_AVAILABLE") {
      return res.status(409).json({ error: "car is already booked for these dates" });
    }
    console.error(err);
    return res.status(500).json({ error: "something went wrong" });
  }
}

export async function list(req: Request, res: Response) {
  try {
    const parsed = listBookingsSchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({
        error: "validation failed",
        details: parsed.error.issues.map((i) => i.message),
      });
    }

    const result = await getMyBookings(req.user!.sub, parsed.data);
    return res.status(200).json(result);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "something went wrong" });
  }
}

export async function details(req: Request, res: Response) {
  try {
    const parsed = bookingIdSchema.safeParse(req.params);
    if (!parsed.success) {
      return res.status(400).json({
        error: "validation failed",
        details: parsed.error.issues.map((i) => i.message),
      });
    }

    const booking = await getMyBookingById(req.user!.sub, parsed.data.id);
    return res.status(200).json(booking);
  } catch (err: any) {
    if (err.message === "BOOKING_NOT_FOUND") {
      return res.status(404).json({ error: "booking not found" });
    }
    console.error(err);
    return res.status(500).json({ error: "something went wrong" });
  }
}

export async function cancel(req: Request, res: Response) {
  try {
    const parsed = bookingIdSchema.safeParse(req.params);
    if (!parsed.success) {
      return res.status(400).json({
        error: "validation failed",
        details: parsed.error.issues.map((i) => i.message),
      });
    }

    const booking = await cancelMyBooking(req.user!.sub, parsed.data.id);
    return res.status(200).json(booking);
  } catch (err: any) {
    if (err.message === "BOOKING_NOT_FOUND") {
      return res.status(404).json({ error: "booking not found" });
    }
    if (err.message === "BOOKING_NOT_CANCELLABLE") {
      return res.status(409).json({ error: "booking is already cancelled or completed" });
    }
    if (err.message === "BOOKING_ALREADY_STARTED") {
      return res.status(409).json({ error: "booking can only be cancelled before the rental date" });
    }
    console.error(err);
    return res.status(500).json({ error: "something went wrong" });
  }
}
