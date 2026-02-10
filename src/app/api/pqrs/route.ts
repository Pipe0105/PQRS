import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateCaseNumber } from "@/lib/case-number";
import {
  fileMetaSchema,
  pqrsCreateSchemaWithDateCheck,
  pqrsFilterSchema,
} from "@/lib/validators/pqrs";
import { Prisma } from "@prisma/client";
import { requireApiAdmin, requireApiUser } from "@/lib/api-auth";
import { sendPqrsNotification } from "@/lib/mailer";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function ensureCatalogExists(
  sedeId: string,
  plantaId: string,
  tipoReclamoId: string,
) {
  const [sede, planta, tipo] = await Promise.all([
    prisma.sede.findUnique({ where: { id: sedeId }, select: { id: true } }),
    prisma.planta.findUnique({ where: { id: plantaId }, select: { id: true } }),
    prisma.tipoReclamo.findUnique({ where: { id: tipoReclamoId }, select: { id: true } }),
  ]);

  return Boolean(sede && planta && tipo);
}

function getFormField(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

export async function POST(request: Request) {
  const { user, response } = await requireApiUser();
  if (response) return response;

  const contentType = request.headers.get("content-type") ?? "";
  let parsed:
    | ReturnType<typeof pqrsCreateSchemaWithDateCheck.safeParse>
    | null = null;
  let files: File[] = [];

  if (contentType.includes("multipart/form-data")) {
    const formData = await request.formData();
    parsed = pqrsCreateSchemaWithDateCheck.safeParse({
      sedeId: getFormField(formData, "sedeId"),
      plantaId: getFormField(formData, "plantaId"),
      tipoReclamoId: getFormField(formData, "tipoReclamoId"),
      fechaReciboProducto: getFormField(formData, "fechaReciboProducto"),
      nombre: getFormField(formData, "nombre"),
      numeroContacto: getFormField(formData, "numeroContacto"),
      correo: getFormField(formData, "correo"),
      descripcion: getFormField(formData, "descripcion"),
    });

    files = formData
      .getAll("files")
      .filter((value): value is File => value instanceof File);
  } else {
    const payload = await request.json();
    parsed = pqrsCreateSchemaWithDateCheck.safeParse(payload);
  }

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos inválidos", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  if (files.length > 5) {
    return NextResponse.json({ error: "Máximo 5 archivos" }, { status: 400 });
  }

  const validatedFiles: Array<{
    name: string;
    mimeType: string;
    size: number;
    buffer: Prisma.Bytes;
  }> = [];

  for (const file of files) {
    const metaParsed = fileMetaSchema.safeParse({
      name: file.name,
      mimeType: file.type,
      size: file.size,
    });
    if (!metaParsed.success) {
      return NextResponse.json({ error: "Archivo inválido" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = new Uint8Array(arrayBuffer) as unknown as Prisma.Bytes;
    validatedFiles.push({
      name: metaParsed.data.name,
      mimeType: metaParsed.data.mimeType,
      size: metaParsed.data.size,
      buffer,
    });
  }

  const catalogsOk = await ensureCatalogExists(
    parsed.data.sedeId,
    parsed.data.plantaId,
    parsed.data.tipoReclamoId,
  );
  if (!catalogsOk) {
    return NextResponse.json({ error: "Catálogos inválidos" }, { status: 400 });
  }

  let created;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      created = await prisma.pqrs.create({
        data: {
          ...parsed.data,
          caseNumber: generateCaseNumber(),
          createdById: user?.id,
          evidencias: validatedFiles.length
            ? {
                create: validatedFiles.map((file) => ({
                  fileName: file.name,
                  mimeType: file.mimeType,
                  size: file.size,
                  data: file.buffer,
                })),
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

  const [sede, planta, tipo] = await Promise.all([
    prisma.sede.findUnique({ where: { id: created.sedeId }, select: { nombre: true } }),
    prisma.planta.findUnique({ where: { id: created.plantaId }, select: { nombre: true } }),
    prisma.tipoReclamo.findUnique({
      where: { id: created.tipoReclamoId },
      select: { nombre: true },
    }),
  ]);

  const email = await sendPqrsNotification({
    caseNumber: created.caseNumber,
    sede: sede?.nombre ?? created.sedeId,
    planta: planta?.nombre ?? created.plantaId,
    tipoReclamo: tipo?.nombre ?? created.tipoReclamoId,
    fechaReciboProducto: created.fechaReciboProducto,
    nombre: created.nombre,
    numeroContacto: created.numeroContacto,
    correo: created.correo,
    descripcion: created.descripcion,
    createdBy: user?.username ?? null,
  });

  if (!email.ok) {
    console.warn("email notification failed", email.error);
  }

  return NextResponse.json({
    id: created.id,
    caseNumber: created.caseNumber,
    email: email.ok ? "sent" : "failed",
  });
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
  };
  if (filter.data.estado) {
    where.estado = filter.data.estado;
  } else {
    where.estado = { in: ["abierto", "en_proceso"] };
  }

  const items = await prisma.pqrs.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      sede: true,
      planta: true,
      tipoReclamo: true,
      evidencias: {
        select: {
          id: true,
          fileName: true,
          mimeType: true,
          size: true,
          createdAt: true,
        },
      },
    },
  });

  return NextResponse.json({ items });
}
