import { z } from "zod";

const email = z.string({ error: "email is required" }).trim().toLowerCase().pipe(z.email("email must be a valid email"));

export const signupSchema = z.object({
  name: z.string({ error: "name is required" }).trim().min(2, "name must be at least 2 characters"),
  email,
  phone: z.string().trim().min(7, "phone must be at least 7 characters").optional(),
  password: z.string({ error: "password is required" }).min(8, "password must be at least 8 characters"),
});

export const loginSchema = z.object({
  email,
  password: z.string({ error: "password is required" }).min(1, "password is required"),
});

export const refreshSchema = z.object({
  refreshToken: z.string({ error: "refreshToken is required" }).min(1, "refreshToken is required"),
});

export type SignupInput = z.infer<typeof signupSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type RefreshInput = z.infer<typeof refreshSchema>;
