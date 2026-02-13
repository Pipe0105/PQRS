import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiUser } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const { user, response } = await requireApiUser();
  if (response) return response;

  const userRows = await prisma.$queryRawUnsafe<Array<{ sedeId: string | null }>>(
    'SELECT "sedeId" FROM "User" WHERE "id" = $1 LIMIT 1',
    user.id,
  );
  const userSedeId = userRows[0]?.sedeId ?? null;

  const [sedes, plantas, tipos] = userSedeId
    ? await Promise.all([
        prisma.sede.findMany({ where: { id: userSedeId }, orderBy: { nombre: "asc" } }),
        prisma.planta.findMany({ orderBy: { nombre: "asc" } }),
        prisma.tipoReclamo.findMany({ orderBy: { nombre: "asc" } }),
      ])
    : await Promise.all([
        prisma.sede.findMany({ orderBy: { nombre: "asc" } }),
        prisma.planta.findMany({ orderBy: { nombre: "asc" } }),
        prisma.tipoReclamo.findMany({ orderBy: { nombre: "asc" } }),
      ]);

  return NextResponse.json({ sedes, plantas, tipos });
}
