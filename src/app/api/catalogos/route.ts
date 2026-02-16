import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiUser } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const { user, response } = await requireApiUser();
  if (response) return response;

  let userSedeId: string | null = null;
  try {
    const userWithSede = await prisma.user.findUnique({
      where: { id: user.id },
      select: { sedeId: true },
    });
    userSedeId = userWithSede?.sedeId ?? null;
  } catch (error) {
    console.error("catalogos: failed to resolve user sede", error);
  }

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
