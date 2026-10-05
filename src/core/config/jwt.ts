const secret = process.env.JWT_SECRET;
if (!secret) throw new Error("JWT_SECRET is not set in .env");

export const JWT_SECRET = secret;
export const ACCESS_TOKEN_EXPIRES_IN = process.env.ACCESS_TOKEN_EXPIRES_IN ?? "15m";
export const REFRESH_TOKEN_TTL_DAYS = Number(process.env.REFRESH_TOKEN_TTL_DAYS ?? 7);
