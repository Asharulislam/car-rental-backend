import type { Request, Response } from "express";
import { getCustomer, loginAdmin, loginCustomer, refreshTokens, signupCustomer } from "./auth.service.js";
import { loginSchema, refreshSchema, signupSchema } from "./auth.validation.js";

export async function signup(req: Request, res: Response) {
  try {
    const parsed = signupSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: "validation failed",
        details: parsed.error.issues.map((i) => i.message),
      });
    }

    const result = await signupCustomer(parsed.data);
    return res.status(201).json(result);
  } catch (err: any) {
    if (err.message === "EMAIL_TAKEN") return res.status(409).json({ error: "email already registered" });
    console.error(err);
    return res.status(500).json({ error: "something went wrong" });
  }
}

export async function login(req: Request, res: Response) {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: "validation failed",
        details: parsed.error.issues.map((i) => i.message),
      });
    }

    const result = await loginCustomer(parsed.data);
    return res.status(200).json(result);
  } catch (err: any) {
    if (err.message === "INVALID_CREDENTIALS") {
      return res.status(401).json({ error: "invalid email or password" });
    }
    console.error(err);
    return res.status(500).json({ error: "something went wrong" });
  }
}

export async function adminLogin(req: Request, res: Response) {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: "validation failed",
        details: parsed.error.issues.map((i) => i.message),
      });
    }

    const result = await loginAdmin(parsed.data);
    return res.status(200).json(result);
  } catch (err: any) {
    if (err.message === "INVALID_CREDENTIALS") {
      return res.status(401).json({ error: "invalid email or password" });
    }
    console.error(err);
    return res.status(500).json({ error: "something went wrong" });
  }
}

export async function refresh(req: Request, res: Response) {
  try {
    const parsed = refreshSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: "validation failed",
        details: parsed.error.issues.map((i) => i.message),
      });
    }

    const tokens = await refreshTokens(parsed.data);
    return res.status(200).json(tokens);
  } catch (err: any) {
    if (err.message === "INVALID_REFRESH_TOKEN") {
      return res.status(401).json({ error: "invalid or expired refresh token" });
    }
    console.error(err);
    return res.status(500).json({ error: "something went wrong" });
  }
}

export async function me(req: Request, res: Response) {
  try {
    const user = await getCustomer(req.user!.sub);
    return res.status(200).json(user);
  } catch (err: any) {
    if (err.message === "USER_NOT_FOUND") return res.status(404).json({ error: "user not found" });
    console.error(err);
    return res.status(500).json({ error: "something went wrong" });
  }
}
