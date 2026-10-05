import jwt, { type SignOptions } from "jsonwebtoken";
import { JWT_EXPIRES_IN, JWT_SECRET } from "../config/jwt.js";
import { isActor, type Actor } from "../constants/actor.js";

export type TokenPayload = { sub: string; actor: Actor };

export function signToken(payload: TokenPayload) {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN as SignOptions["expiresIn"],
  });
}

export function verifyToken(token: string): TokenPayload {
  const decoded = jwt.verify(token, JWT_SECRET) as jwt.JwtPayload;
  if (typeof decoded.sub !== "string") throw new Error("INVALID_TOKEN");
  if (!isActor(decoded.actor)) throw new Error("INVALID_TOKEN");
  return { sub: decoded.sub, actor: decoded.actor };
}
