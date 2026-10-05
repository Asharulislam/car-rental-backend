const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
const password = process.env.ADMIN_PASSWORD;

if (!email) throw new Error("ADMIN_EMAIL is not set in .env");
if (!password) throw new Error("ADMIN_PASSWORD is not set in .env");

export const ADMIN_EMAIL = email;
export const ADMIN_PASSWORD = password;
