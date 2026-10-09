import { z } from "zod";

export const carIdSchema = z.object({
  id: z.uuid("id must be a valid uuid"),
});

export const listCarsSchema = z.object({
  page: z.coerce.number().int().min(1, "page must be at least 1").default(1),
  limit: z.coerce
    .number()
    .int()
    .min(1, "limit must be at least 1")
    .max(50, "limit can be at most 50")
    .default(12),
  search: z
    .string()
    .trim()
    .max(50, "search can be at most 50 characters")
    .optional()
    .transform((value) => value || undefined),
});

export type CarIdInput = z.infer<typeof carIdSchema>;
export type ListCarsInput = z.infer<typeof listCarsSchema>;
