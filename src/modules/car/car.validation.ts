import { z } from "zod";

export const carIdSchema = z.object({
  id: z.uuid("id must be a valid uuid"),
});