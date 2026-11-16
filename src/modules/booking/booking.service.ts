import prisma from "../../core/config/prisma.js";
import type { Prisma } from "../../generated/prisma/client.js";
import type {
  CreateBookingInput,
  ListBookingsInput,
} from "./booking.validation.js";

//One day in milliseconds, used to turn two dates into a number of days.
const DAY_MS = 24 * 60 * 60 * 1000;

// Bookings in these states hold the car; cancelled/completed ones free it up.
const ACTIVE_STATUSES = ["pending", "confirmed"] as const;

const bookingInclude = {
  car: { select: { id: true, brand: true, image: true, pricePerDay: true } },
} as const;

type BookingRow = Prisma.BookingGetPayload<{ include: typeof bookingInclude }>;

const toDateString = (d: Date) => d.toISOString().slice(0, 10);

function toBookingResponse(booking: BookingRow) {
  return {
    ...booking,
    rentalDate: toDateString(booking.rentalDate),
    returnDate: toDateString(booking.returnDate),
    totalPrice: booking.totalPrice.toNumber(),
    car: { ...booking.car, pricePerDay: booking.car.pricePerDay.toNumber() },
  };
}

export async function createBooking(userId: string, input: CreateBookingInput) {
  const rentalDate = new Date(input.rentalDate);
  const returnDate = new Date(input.returnDate);
  
  const days = Math.round(
    (returnDate.getTime() - rentalDate.getTime()) / DAY_MS,
  );

  const booking = await prisma.$transaction(async (tx) => {
    // Lock the car row so two overlapping requests for the same car can't both pass the check below.
    const locked = await tx.$queryRaw<{ id: string }[]>`
      SELECT id FROM cars WHERE id = ${input.carId}::uuid FOR UPDATE
    `;
    if (locked.length === 0) throw new Error("CAR_NOT_FOUND");

    // Half-open ranges: a car returned on the 10th can be picked up again on the 10th.
    const clash = await tx.booking.findFirst({
      where: {
        carId: input.carId,
        status: { in: [...ACTIVE_STATUSES] },
        rentalDate: { lt: returnDate },
        returnDate: { gt: rentalDate },
      },
      select: { id: true },
    });
    if (clash) throw new Error("CAR_NOT_AVAILABLE");

    const car = await tx.car.findUniqueOrThrow({
      where: { id: input.carId },
      select: { pricePerDay: true },
    });

    return tx.booking.create({
      data: {
        userId,
        carId: input.carId,
        placeOfRental: input.placeOfRental,
        placeOfReturn: input.placeOfReturn,
        rentalDate,
        returnDate,
        totalPrice: car.pricePerDay.mul(days),
        // No payment step yet, so bookings are confirmed straight away.
        // Switch to "pending" once payments are added and let the payment confirm it.
        status: "confirmed",
      },
      include: bookingInclude,
    });
  });

  return toBookingResponse(booking);
}

export async function getMyBookings(userId: string, input: ListBookingsInput) {
  const { page, limit } = input;
  const where: Prisma.BookingWhereInput = { userId };

  const [bookings, total] = await Promise.all([
    prisma.booking.findMany({
      where,
      include: bookingInclude,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip: (page - 1) * limit,
      take: limit,
    }),

    prisma.booking.count({ where }),
  ]);

  return {
    items: bookings.map(toBookingResponse),
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export async function getMyBookingById(userId: string, id: string) {
  // Filtering by userId too means another customer's booking looks the same as a missing one.
  const booking = await prisma.booking.findFirst({
    where: { id, userId },
    include: bookingInclude,
  });

  if (!booking) throw new Error("BOOKING_NOT_FOUND");

  return toBookingResponse(booking);
}

export async function cancelMyBooking(userId: string, id: string) {
  const booking = await prisma.booking.findFirst({
    where: { id, userId },
    select: { status: true, rentalDate: true },
  });

  if (!booking) throw new Error("BOOKING_NOT_FOUND");
  if (
    !ACTIVE_STATUSES.includes(
      booking.status as (typeof ACTIVE_STATUSES)[number],
    )
  ) {
    throw new Error("BOOKING_NOT_CANCELLABLE");
  }
  // Can cancel up to the day before pickup.
  if (toDateString(booking.rentalDate) <= toDateString(new Date())) {
    throw new Error("BOOKING_ALREADY_STARTED");
  }

  const updated = await prisma.booking.update({
    where: { id },
    data: { status: "cancelled" },
    include: bookingInclude,
  });

  return toBookingResponse(updated);
}
