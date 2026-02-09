import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const [sedes, plantas, tipos] = await Promise.all([
    prisma.sede.findMany({ orderBy: { nombre: "asc" } }),
    prisma.planta.findMany({ orderBy: { nombre: "asc" } }),
    prisma.tipoReclamo.findMany({ orderBy: { nombre: "asc" } }),
  ]);

  return NextResponse.json({ sedes, plantas, tipos });
}
