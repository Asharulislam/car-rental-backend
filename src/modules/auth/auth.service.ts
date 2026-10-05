import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import bcrypt from "bcrypt";
import prisma from "../../core/config/prisma.js";
import { ADMIN_EMAIL, ADMIN_PASSWORD } from "../../core/config/admin.js";
import { REFRESH_TOKEN_TTL_DAYS } from "../../core/config/jwt.js";
import { signToken } from "../../core/utils/jwt.js";
import { Actor } from "../../core/constants/actor.js";
import type { LoginInput, RefreshInput, SignupInput } from "./auth.validation.js";

// Compared against when the email is unknown, so a miss takes as long as a hit.
const DUMMY_HASH = bcrypt.hashSync("timing-equaliser", 12);

const publicUser = {
  id: true,
  name: true,
  email: true,
  phone: true,
  createdAt: true,
} as const;

function safeEqual(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

// The refresh token is random, not a JWT. Only its SHA-256 hash is stored, so a
// leaked database can't be used to mint sessions.
function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

// userId is null for the admin, who has no users row.
async function issueTokens(userId: string | null, actor: Actor) {
  const accessToken = signToken({ sub: userId ?? "admin", actor });

  const refreshToken = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);
  await prisma.refreshToken.create({
    data: { tokenHash: hashToken(refreshToken), userId, expiresAt },
  });

  return { accessToken, refreshToken };
}

export async function signupCustomer(input: SignupInput) {
  if (input.email === ADMIN_EMAIL) throw new Error("EMAIL_TAKEN");

  const existing = await prisma.user.findUnique({
    where: { email: input.email },
  });
  if (existing) throw new Error("EMAIL_TAKEN");

  const passwordHash = await bcrypt.hash(input.password, 12);
  const user = await prisma.user.create({
    data: {
      name: input.name,
      email: input.email,
      phone: input.phone,
      passwordHash,
    },
    select: publicUser,
  });

  const tokens = await issueTokens(user.id, Actor.customer);
  return { ...tokens, user };
}

export async function loginCustomer(input: LoginInput) {
  const user = await prisma.user.findUnique({ where: { email: input.email } });

  const ok = await bcrypt.compare(
    input.password,
    user?.passwordHash ?? DUMMY_HASH,
  );
  if (!user || !user.passwordHash || !ok)
    throw new Error("INVALID_CREDENTIALS");

  const tokens = await issueTokens(user.id, Actor.customer);
  const { passwordHash: _, updatedAt: __, ...safeUser } = user;
  return { ...tokens, user: safeUser };
}

export async function loginAdmin(input: LoginInput) {
  const emailOk = safeEqual(input.email, ADMIN_EMAIL);
  const passwordOk = safeEqual(input.password, ADMIN_PASSWORD);
  if (!emailOk || !passwordOk) throw new Error("INVALID_CREDENTIALS");

  const tokens = await issueTokens(null, Actor.admin);
  return { ...tokens, admin: { email: ADMIN_EMAIL } };
}

// Rotation: every refresh token works once. Using it revokes it and returns a new pair.
export async function refreshTokens(input: RefreshInput) {
  const stored = await prisma.refreshToken.findUnique({
    where: { tokenHash: hashToken(input.refreshToken) },
  });
  if (!stored || stored.revokedAt || stored.expiresAt <= new Date()) {
    throw new Error("INVALID_REFRESH_TOKEN");
  }

  // Revoke only if still active, so two requests racing with the same token
  // can't both succeed.
  const { count } = await prisma.refreshToken.updateMany({
    where: { id: stored.id, revokedAt: null },
    data: { revokedAt: new Date() },
  });
  if (count === 0) throw new Error("INVALID_REFRESH_TOKEN");

  const actor = stored.userId ? Actor.customer : Actor.admin;
  return issueTokens(stored.userId, actor);
}

export async function getCustomer(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: publicUser,
  });
  if (!user) throw new Error("USER_NOT_FOUND");
  return user;
}
