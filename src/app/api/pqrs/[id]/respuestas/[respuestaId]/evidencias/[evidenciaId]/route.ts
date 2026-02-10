import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiAdmin } from "@/lib/api-auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(
  _request: Request,
  {
    params,
  }: {
    params: Promise<{ id: string; respuestaId: string; evidenciaId: string }>;
  },
) {
  const { response } = await requireApiAdmin();
  if (response) return response;

  const { id, respuestaId, evidenciaId } = await params;
  const evidencia = await prisma.pqrsRespuestaEvidencia.findFirst({
    where: {
      id: evidenciaId,
      respuestaId,
      respuesta: {
        pqrsId: id,
      },
    },
  });

  if (!evidencia) {
    return NextResponse.json({ error: "Archivo no encontrado" }, { status: 404 });
  }

  return new Response(evidencia.data, {
    headers: {
      "Content-Type": evidencia.mimeType,
      "Content-Length": evidencia.size.toString(),
      "Content-Disposition": `inline; filename="${evidencia.fileName}"`,
    },
  });
}

