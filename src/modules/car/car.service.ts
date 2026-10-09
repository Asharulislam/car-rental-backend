import prisma from "../../core/config/prisma.js";

export async function getCars() {
  return prisma.car.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      category: { select: { id: true, name: true, slug: true } },
    },
  });
}