import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";
import { requireApiAdmin } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

const createUserSchema = z.object({
  username: z.string().min(3),
  nombre: z.string().min(1).optional(),
  password: z.string().min(8),
  role: z.enum(["admin", "usuario"]).default("usuario"),
});

export async function GET() {
  const { response } = await requireApiAdmin();
  if (response) return response;

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      username: true,
      nombre: true,
      role: true,
      isActive: true,
      createdAt: true,
      createdBy: {
        select: { username: true },
      },
    },
  });

  const userSedeRows = await prisma.$queryRawUnsafe<
    Array<{ id: string; sedeNombre: string | null }>
  >(
    'SELECT u."id", s."nombre" as "sedeNombre" FROM "User" u LEFT JOIN "Sede" s ON s."id" = u."sedeId"',
  );
  const sedeByUserId = new Map(userSedeRows.map((row) => [row.id, row.sedeNombre]));
  const usersWithSede = users.map((user) => ({
    ...user,
    sede: sedeByUserId.get(user.id) ? { nombre: sedeByUserId.get(user.id) as string } : null,
  }));

  return NextResponse.json({ users: usersWithSede });
}

export async function POST(request: Request) {
  const { user: admin, response } = await requireApiAdmin();
  if (response) return response;

  const payload = await request.json();
  const parsed = createUserSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos inválidos", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const exists = await prisma.user.findUnique({
    where: { username: parsed.data.username },
    select: { id: true },
  });
  if (exists) {
    return NextResponse.json({ error: "Usuario ya existe" }, { status: 400 });
  }

  const passwordHash = await hashPassword(parsed.data.password);
  const created = await prisma.user.create({
    data: {
      username: parsed.data.username,
      nombre: parsed.data.nombre,
      passwordHash,
      role: parsed.data.role,
      createdById: admin?.id,
    },
    select: {
      id: true,
      username: true,
      nombre: true,
      role: true,
      isActive: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ user: created }, { status: 201 });
}
