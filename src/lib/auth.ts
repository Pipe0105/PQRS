import "server-only";

import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createHash, randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";

const SESSION_COOKIE = "pqrs_session";
const SESSION_TTL_DAYS = Number(process.env.SESSION_TTL_DAYS ?? 7);
const RESET_TTL_MINUTES = Number(process.env.RESET_TTL_MINUTES ?? 30);

export type AuthUser = {
  id: string;
  username: string;
  nombre: string | null;
  role: "admin" | "usuario";
  isActive: boolean;
};

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export async function createSession(userId: string) {
  const token = randomBytes(32).toString("hex");
  const tokenHash = hashToken(token);
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + SESSION_TTL_DAYS);

  await prisma.session.create({
    data: {
      userId,
      tokenHash,
      expiresAt,
    },
  });

  return { token, expiresAt };
}

export async function deleteSession(token: string) {
  const tokenHash = hashToken(token);
  await prisma.session.deleteMany({ where: { tokenHash } });
}

export async function getSessionTokenFromCookies() {
  const cookieStore = await cookies();
  return cookieStore.get(SESSION_COOKIE)?.value ?? null;
}

export async function getSessionUser(): Promise<AuthUser | null> {
  const token = await getSessionTokenFromCookies();
  if (!token) return null;

  const tokenHash = hashToken(token);
  const session = await prisma.session.findUnique({
    where: { tokenHash },
    include: {
      user: {
        select: {
          id: true,
          username: true,
          nombre: true,
          role: true,
          isActive: true,
        },
      },
    },
  });

  if (!session || session.expiresAt < new Date() || !session.user.isActive) {
    await prisma.session.deleteMany({ where: { tokenHash } });
    return null;
  }

  return session.user;
}

export async function requireUser() {
  const user = await getSessionUser();
  if (!user) {
    redirect("/login");
  }
  return user;
}

export async function requireAdmin() {
  const user = await getSessionUser();
  if (!user || user.role !== "admin") {
    redirect("/login");
  }
  return user;
}

export async function createPasswordResetToken(userId: string, createdById?: string | null) {
  const token = randomBytes(20).toString("hex");
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + RESET_TTL_MINUTES * 60 * 1000);

  await prisma.passwordResetToken.create({
    data: {
      userId,
      tokenHash,
      expiresAt,
      createdById: createdById ?? undefined,
    },
  });

  return { token, expiresAt };
}

export async function consumePasswordResetToken(userId: string, token: string) {
  const tokenHash = hashToken(token);
  const record = await prisma.passwordResetToken.findFirst({
    where: {
      userId,
      tokenHash,
      usedAt: null,
      expiresAt: { gt: new Date() },
    },
  });

  if (!record) return false;

  await prisma.passwordResetToken.update({
    where: { id: record.id },
    data: { usedAt: new Date() },
  });

  return true;
}
