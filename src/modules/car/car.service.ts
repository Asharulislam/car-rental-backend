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
  const { page, limit, search } = input;
  const where: Prisma.CarWhereInput = {};

  if (search) {
    where.OR = [
      { brand: { contains: search, mode: "insensitive" } },
      { category: { name: { contains: search, mode: "insensitive" } } },
    ];
  }

  const [cars, total] = await Promise.all([
    prisma.car.findMany({
      where,
      include: carInclude,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip: (page - 1) * limit,
      take: limit,
    }),

    prisma.car.count({ where }),
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
