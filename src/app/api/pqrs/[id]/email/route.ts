import { NextResponse } from "next/server";
import { requireApiAdmin } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import {
  getRequestBaseUrl,
  sendPqrsCreationNotificationEmail,
} from "@/lib/pqrs-notification-email";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { response } = await requireApiAdmin();
  if (response) return response;

  const { id } = await params;
  const exists = await prisma.pqrs.findUnique({
    where: { id },
    select: { id: true },
  });

  if (!exists) {
    return NextResponse.json({ error: "PQRS no encontrado" }, { status: 404 });
  }

  const result = await sendPqrsCreationNotificationEmail({
    pqrsId: id,
    appBaseUrl: getRequestBaseUrl(request),
  });

  if (!result.ok) {
    return NextResponse.json(
      {
        error: result.error ?? "No se pudo reenviar el correo",
        attempted: result.attempted,
        accepted: result.accepted,
        failed: result.failed,
        failures: result.failures ?? [],
      },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    message: "Correo reenviado",
    attempted: result.attempted,
    accepted: result.accepted,
    failed: result.failed,
  });
}
