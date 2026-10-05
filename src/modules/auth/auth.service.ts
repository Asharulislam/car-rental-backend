import { timingSafeEqual } from "node:crypto";
import bcrypt from "bcrypt";
import prisma from "../../core/config/prisma.js";
import { ADMIN_EMAIL, ADMIN_PASSWORD } from "../../core/config/admin.js";
import { signToken } from "../../core/utils/jwt.js";
import { Actor } from "../../core/constants/actor.js";
import type { LoginInput, SignupInput } from "./auth.validation.js";

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

  const token = signToken({ sub: user.id, actor: Actor.customer });
  return { token, user };
}

export async function loginCustomer(input: LoginInput) {
  const user = await prisma.user.findUnique({ where: { email: input.email } });

  const ok = await bcrypt.compare(
    input.password,
    user?.passwordHash ?? DUMMY_HASH,
  );
  if (!user || !user.passwordHash || !ok)
    throw new Error("INVALID_CREDENTIALS");

  const token = signToken({ sub: user.id, actor: Actor.customer });
  const { passwordHash: _, updatedAt: __, ...safeUser } = user;
  return { token, user: safeUser };
}

export async function loginAdmin(input: LoginInput) {
  const emailOk = safeEqual(input.email, ADMIN_EMAIL);
  const passwordOk = safeEqual(input.password, ADMIN_PASSWORD);
  if (!emailOk || !passwordOk) throw new Error("INVALID_CREDENTIALS");

  const token = signToken({ sub: "admin", actor: Actor.admin });
  return { token, admin: { email: ADMIN_EMAIL } };
}

export async function getCustomer(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: publicUser,
  });
  if (!user) throw new Error("USER_NOT_FOUND");
  return user;
}
