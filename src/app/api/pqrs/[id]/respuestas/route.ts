import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApiAdmin } from "@/lib/api-auth";
import { sendPqrsResponseEmail } from "@/lib/mailer";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const respuestaSchema = z.object({
  mensaje: z.string().min(3, "La respuesta es obligatoria"),
  estado: z.enum(["abierto", "en_proceso", "cerrado"]),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { user: admin, response } = await requireApiAdmin();
  if (response) return response;

  const { id } = await params;
  const payload = await request.json();
  const parsed = respuestaSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos inválidos", details: parsed.error.flatten() },
      { status: 400 },
    );
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
      },
    }),
    prisma.pqrs.update({
      where: { id },
      data: { estado: parsed.data.estado },
    }),
  ]);

  const email = await sendPqrsResponseEmail({
    caseNumber: pqrs.caseNumber,
    sede: pqrs.sede.nombre,
    planta: pqrs.planta.nombre,
    tipoReclamo: pqrs.tipoReclamo.nombre,
    fechaReciboProducto: pqrs.fechaReciboProducto,
    nombre: pqrs.nombre,
    numeroContacto: pqrs.numeroContacto,
    correo: pqrs.correo,
    descripcion: pqrs.descripcion,
    createdBy: admin?.username ?? null,
    respuesta: parsed.data.mensaje,
    estado: parsed.data.estado,
  });

  if (!email.ok) {
    console.warn("response email failed", email.error);
  }

  return NextResponse.json(
    { respuesta, email: email.ok ? "sent" : "failed" },
    { status: 201 },
  );
}
