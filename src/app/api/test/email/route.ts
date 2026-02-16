import { NextResponse } from "next/server";
import { z } from "zod";
import { sendPqrsNotification } from "@/lib/mailer";
import { requireApiAdmin } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

const testSchema = z.object({
  to: z.string().email().optional(),
});

export async function POST(request: Request) {
  const { user, response } = await requireApiAdmin();
  if (response) return response;

  const payload = await request.json().catch(() => ({}));
  const parsed = testSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }

  const overrideTo = parsed.data.to;
  if (overrideTo) {
    process.env.SMTP_TO = overrideTo;
  }

  const result = await sendPqrsNotification({
    caseNumber: "TEST-EMAIL",
    sede: "Sede de prueba",
    planta: "Planta de prueba",
    tipoReclamo: "Reclamo de prueba",
    fechaReciboProducto: new Date(),
    nombre: user?.nombre ?? user?.username ?? "Administrador",
    numeroContacto: "0000000",
    correo: "no-reply@mercamio.com",
    lote: "LOTE123",
    descripcion: "Este es un correo de prueba para validar SMTP.",
    createdBy: user?.username ?? null,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error ?? "Error enviando correo" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, message: "Correo enviado" });
}
