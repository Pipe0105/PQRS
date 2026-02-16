import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApiAdmin } from "@/lib/api-auth";
import { sendPqrsResponseEmail } from "@/lib/mailer";
import { fileMetaSchema } from "@/lib/validators/pqrs";
import { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const respuestaSchema = z.object({
  mensaje: z.string().min(3, "La respuesta es obligatoria"),
  estado: z.enum(["abierto", "en_proceso", "cerrado"]),
});

const MAX_FILES = 5;

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { user: admin, response } = await requireApiAdmin();
  if (response) return response;

  const { id } = await params;
  const contentType = request.headers.get("content-type") ?? "";
  let parsed: ReturnType<typeof respuestaSchema.safeParse> | null = null;
  let files: File[] = [];

  if (contentType.includes("multipart/form-data")) {
    const formData = await request.formData();
    parsed = respuestaSchema.safeParse({
      mensaje: formData.get("mensaje"),
      estado: formData.get("estado"),
    });

    files = formData
      .getAll("files")
      .filter((value): value is File => value instanceof File);
  } else {
    const payload = await request.json();
    parsed = respuestaSchema.safeParse(payload);
  }

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos invalidos", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  if (files.length > MAX_FILES) {
    return NextResponse.json({ error: "Maximo 5 archivos" }, { status: 400 });
  }

  const validatedFiles: Array<{
    fileName: string;
    mimeType: string;
    size: number;
    data: Prisma.Bytes;
  }> = [];

  for (const file of files) {
    const metaParsed = fileMetaSchema.safeParse({
      name: file.name,
      mimeType: file.type,
      size: file.size,
    });
    if (!metaParsed.success) {
      return NextResponse.json({ error: "Archivo invalido" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const data = new Uint8Array(arrayBuffer) as unknown as Prisma.Bytes;
    validatedFiles.push({
      fileName: metaParsed.data.name,
      mimeType: metaParsed.data.mimeType,
      size: metaParsed.data.size,
      data,
    });
  }

  const pqrs = await prisma.pqrs.findUnique({
    where: { id },
    include: {
      sede: true,
      planta: true,
      tipoReclamo: true,
    },
  });
  if (!pqrs) {
    return NextResponse.json({ error: "PQRS no encontrado" }, { status: 404 });
  }

  const [respuesta] = await prisma.$transaction([
    prisma.pqrsRespuesta.create({
      data: {
        pqrsId: id,
        mensaje: parsed.data.mensaje,
        estado: parsed.data.estado,
        createdById: admin?.id,
        evidencias: validatedFiles.length
          ? {
              create: validatedFiles.map((file) => ({
                fileName: file.fileName,
                mimeType: file.mimeType,
                size: file.size,
                data: file.data,
              })),
            }
          : undefined,
      },
    }),
    prisma.pqrs.update({
      where: { id },
      data: { estado: parsed.data.estado },
    }),
  ]);

  let emailStatus: "sent" | "failed" | "skipped" = "skipped";
  if (parsed.data.estado === "cerrado") {
    const email = await sendPqrsResponseEmail({
      caseNumber: pqrs.caseNumber,
      sede: pqrs.sede.nombre,
      planta: pqrs.planta.nombre,
      tipoReclamo: pqrs.tipoReclamo.nombre,
      fechaReciboProducto: pqrs.fechaReciboProducto,
      nombre: pqrs.nombre,
      numeroContacto: pqrs.numeroContacto,
      correo: pqrs.correo,
      lote: pqrs.lote,
      descripcion: pqrs.descripcion,
      createdBy: admin?.username ?? null,
      respuesta: parsed.data.mensaje,
      estado: parsed.data.estado,
      attachments: validatedFiles.map((file) => ({
        fileName: file.fileName,
        mimeType: file.mimeType,
        data: Buffer.from(file.data as unknown as Uint8Array),
      })),
    });

    emailStatus = email.ok ? "sent" : "failed";
    if (!email.ok) {
      console.warn("response email failed", email.error);
    }
  }

  return NextResponse.json(
    { respuesta, email: emailStatus },
    { status: 201 },
  );
}





