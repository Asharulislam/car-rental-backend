import prisma from "../../core/config/prisma.js";
import type { Prisma } from "../../generated/prisma/client.js";

const carInclude = {
  category: { select: { id: true, name: true, slug: true } },
} as const;

// Decimal in the database, plain number in the API (for display only)
function toCarResponse<T extends { pricePerDay: Prisma.Decimal }>(car: T) {
  return { ...car, pricePerDay: car.pricePerDay.toNumber() };
}

export async function getCars() {
  const cars = await prisma.car.findMany({
    orderBy: { createdAt: "desc" },
    include: carInclude,
  });
  return cars.map(toCarResponse);
}

export async function getCarById(id: string) {
  const car = await prisma.car.findUnique({
    where: { id },
    include: carInclude,
  });
  if (!car) throw new Error("CAR_NOT_FOUND");
  return toCarResponse(car);
}