import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApiAdmin } from "@/lib/api-auth";
import { hashPassword } from "@/lib/auth";

export const dynamic = "force-dynamic";

const updateUserSchema = z.object({
  nombre: z.string().min(1).optional(),
  role: z.enum(["admin", "usuario"]).optional(),
  isActive: z.boolean().optional(),
  password: z.string().min(8).optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { response } = await requireApiAdmin();
  if (response) return response;

  const { id } = await params;
  const payload = await request.json();
  const parsed = updateUserSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos invalidos", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const data = {
    nombre: parsed.data.nombre,
    role: parsed.data.role,
    isActive: parsed.data.isActive,
    ...(parsed.data.password
      ? { passwordHash: await hashPassword(parsed.data.password) }
      : {}),
  };

  const updated = await prisma.user.update({
    where: { id },
    data,
    select: {
      id: true,
      username: true,
      nombre: true,
      role: true,
      isActive: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ user: updated });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { response } = await requireApiAdmin();
  if (response) return response;

  const { id } = await params;

  await prisma.session.deleteMany({ where: { userId: id } });
  const updated = await prisma.user.update({
    where: { id },
    data: { isActive: false },
    select: {
      id: true,
      username: true,
      nombre: true,
      role: true,
      isActive: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ user: updated });
}
