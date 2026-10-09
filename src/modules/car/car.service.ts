import prisma from "../../core/config/prisma.js";
import type { Prisma } from "../../generated/prisma/client.js";
import type { ListCarsInput } from "./car.validation.js";

const carInclude = {
  category: { select: { id: true, name: true, slug: true } },
} as const;

function toCarResponse<T extends { pricePerDay: Prisma.Decimal }>(car: T) {
  return { ...car, pricePerDay: car.pricePerDay.toNumber() };
}

export async function getCars(input: ListCarsInput) {
  const { page, limit } = input;

  const [cars, total] = await prisma.$transaction([
    prisma.car.findMany({
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      include: carInclude,
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.car.count(),
  ]);

  return {
    items: cars.map(toCarResponse),
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export async function getCarById(id: string) {
  const car = await prisma.car.findUnique({
    where: { id },
    include: carInclude,
  });
  if (!car) throw new Error("CAR_NOT_FOUND");
  return toCarResponse(car);
}