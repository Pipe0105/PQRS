import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApiAdmin } from "@/lib/api-auth";

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

  const exists = await prisma.pqrs.findUnique({ where: { id }, select: { id: true } });
  if (!exists) {
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

  return NextResponse.json({ respuesta }, { status: 201 });
}
