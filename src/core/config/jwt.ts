const secret = process.env.JWT_SECRET;
if (!secret) throw new Error("JWT_SECRET is not set in .env");

export const JWT_SECRET = secret;
export const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN ?? "1d";
