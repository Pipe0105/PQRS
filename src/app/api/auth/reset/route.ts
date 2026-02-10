import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { consumePasswordResetToken, hashPassword } from "@/lib/auth";

export const dynamic = "force-dynamic";

const resetSchema = z.object({
  username: z.string().min(1),
  token: z.string().min(1),
  newPassword: z.string().min(8, "La contraseña debe tener mínimo 8 caracteres"),
});

export async function POST(request: Request) {
  const payload = await request.json();
  const parsed = resetSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { username: parsed.data.username },
  });

  if (!user || !user.isActive) {
    return NextResponse.json({ error: "Token inválido" }, { status: 400 });
  }

  const isValidToken = await consumePasswordResetToken(user.id, parsed.data.token);
  if (!isValidToken) {
    return NextResponse.json({ error: "Token inválido o expirado" }, { status: 400 });
  }

  const passwordHash = await hashPassword(parsed.data.newPassword);
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash },
  });

  return NextResponse.json({ ok: true });
}
