import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateCaseNumber } from "@/lib/case-number";
import { pqrsCreateSchemaWithDateCheck, pqrsFilterSchema } from "@/lib/validators/pqrs";
import { Prisma } from "@prisma/client";
import { requireApiAdmin, requireApiUser } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

async function ensureCatalogExists(sedeId: string, plantaId: string, tipoReclamoId: string) {
  const [sede, planta, tipo] = await Promise.all([
    prisma.sede.findUnique({ where: { id: sedeId }, select: { id: true } }),
    prisma.planta.findUnique({ where: { id: plantaId }, select: { id: true } }),
    prisma.tipoReclamo.findUnique({ where: { id: tipoReclamoId }, select: { id: true } }),
  ]);

  if (!sede || !planta || !tipo) {
    return false;
  }
  return true;
}

export async function POST(request: Request) {
  const { user, response } = await requireApiUser();
  if (response) return response;

  const payload = await request.json();
  const parsed = pqrsCreateSchemaWithDateCheck.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos inválidos", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { evidencias, ...data } = parsed.data;
  const catalogsOk = await ensureCatalogExists(data.sedeId, data.plantaId, data.tipoReclamoId);
  if (!catalogsOk) {
    return NextResponse.json({ error: "Catálogos inválidos" }, { status: 400 });
  }

  let created;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      created = await prisma.pqrs.create({
        data: {
          ...data,
          caseNumber: generateCaseNumber(),
          createdById: user?.id,
          evidencias: evidencias?.length
            ? {
                createMany: {
                  data: evidencias.map((item) => ({
                    url: item.url,
                    key: item.key,
                    mimeType: item.mimeType,
                    size: item.size,
                  })),
                },
              }
            : undefined,
        },
      });
      break;
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        continue;
      }
      throw error;
    }
  }

  if (!created) {
    return NextResponse.json({ error: "No se pudo generar el número de caso" }, { status: 500 });
  }

  return NextResponse.json({ id: created.id, caseNumber: created.caseNumber });
}

export async function GET(request: Request) {
  const { response } = await requireApiAdmin();
  if (response) return response;

  const { searchParams } = new URL(request.url);
  const filter = pqrsFilterSchema.safeParse({
    sedeId: searchParams.get("sedeId") || undefined,
    plantaId: searchParams.get("plantaId") || undefined,
    estado: searchParams.get("estado") || undefined,
  });

  if (!filter.success) {
    return NextResponse.json({ error: "Filtros inválidos" }, { status: 400 });
  }

  const where: Prisma.PqrsWhereInput = {
    sedeId: filter.data.sedeId,
    plantaId: filter.data.plantaId,
    estado: filter.data.estado,
  };

  const items = await prisma.pqrs.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      sede: true,
      planta: true,
      tipoReclamo: true,
      evidencias: true,
    },
  });

  return NextResponse.json({ items });
}
