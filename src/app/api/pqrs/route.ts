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
import {
  getRequestBaseUrl,
  sendPqrsCreationNotificationEmail,
} from "@/lib/pqrs-notification-email";
import { z } from "zod";

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
  const userEmailParsed = z.string().email().safeParse(user.username);
  if (!userEmailParsed.success) {
    return NextResponse.json(
      { error: "El usuario no tiene un correo valido en su cuenta" },
      { status: 400 },
    );
  }
  const userEmail = userEmailParsed.data;

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
      correo: userEmail,
      lote: getFormField(formData, "lote"),
      descripcion: getFormField(formData, "descripcion"),
    });

    files = formData
      .getAll("files")
      .filter((value): value is File => value instanceof File);
  } else {
    const payload = await request.json();
    parsed = pqrsCreateSchemaWithDateCheck.safeParse({
      ...payload,
      correo: userEmail,
    });
  }

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos inválidos", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  let userSedeId: string | null = null;
  try {
    const userWithSede = await prisma.user.findUnique({
      where: { id: user.id },
      select: { sedeId: true },
    });
    userSedeId = userWithSede?.sedeId ?? null;
  } catch (error) {
    console.error("pqrs: failed to resolve user sede", error);
  }
  const effectiveSedeId = userSedeId ?? parsed.data.sedeId;
  if (!effectiveSedeId) {
    return NextResponse.json(
      { error: "Debes seleccionar una sede" },
      { status: 400 },
    );
  }

  const payloadWithUserSede = {
    ...parsed.data,
    sedeId: effectiveSedeId,
  };

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
    payloadWithUserSede.sedeId,
    payloadWithUserSede.plantaId,
    payloadWithUserSede.tipoReclamoId,
  );
  if (!catalogsOk) {
    return NextResponse.json({ error: "Catálogos inválidos" }, { status: 400 });
  }

  const [sede, planta, tipo] = await Promise.all([
    prisma.sede.findUnique({ where: { id: payloadWithUserSede.sedeId }, select: { nombre: true } }),
    prisma.planta.findUnique({
      where: { id: payloadWithUserSede.plantaId },
      select: { nombre: true },
    }),
    prisma.tipoReclamo.findUnique({
      where: { id: payloadWithUserSede.tipoReclamoId },
      select: { nombre: true },
    }),
  ]);

  if (!sede || !planta || !tipo) {
    return NextResponse.json({ error: "Catálogos inválidos" }, { status: 400 });
  }

  let created;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      const caseNumber = await generateCaseNumber(prisma, {
        sedeId: payloadWithUserSede.sedeId,
        plantaId: payloadWithUserSede.plantaId,
        sedeNombre: sede.nombre,
        plantaNombre: planta.nombre,
      });
      created = await prisma.pqrs.create({
        data: {
          ...payloadWithUserSede,
          caseNumber,
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

  const email = await sendPqrsCreationNotificationEmail({
    pqrsId: created.id,
    appBaseUrl: getRequestBaseUrl(request),
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
  if (filter.data.estado && filter.data.estado !== "todos") {
    where.estado = filter.data.estado;
  } else if (!filter.data.estado) {
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

