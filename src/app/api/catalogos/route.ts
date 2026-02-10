import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiUser } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const { response } = await requireApiUser();
  if (response) return response;

  const [sedes, plantas, tipos] = await Promise.all([
    prisma.sede.findMany({ orderBy: { nombre: "asc" } }),
    prisma.planta.findMany({ orderBy: { nombre: "asc" } }),
    prisma.tipoReclamo.findMany({ orderBy: { nombre: "asc" } }),
  ]);

  return NextResponse.json({ sedes, plantas, tipos });
}
