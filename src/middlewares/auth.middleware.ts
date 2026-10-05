import type { NextFunction, Request, Response } from "express";
import { verifyToken, type TokenPayload } from "../core/utils/jwt.js";
import type { Actor } from "../core/constants/actor.js";

declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload;
    }
  }
}

export function authenticate(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "unauthorized" });
  }

  try {
    req.user = verifyToken(header.slice("Bearer ".length));
    return next();
  } catch {
    return res.status(401).json({ error: "unauthorized" });
  }
}

export function authorize(...actors: Actor[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !actors.includes(req.user.actor)) {
      return res.status(403).json({ error: "forbidden" });
    }
    return next();
  };
}
