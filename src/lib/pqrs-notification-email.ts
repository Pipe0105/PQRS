import "server-only";

import { Prisma } from "@prisma/client";
import { sendPqrsNotification } from "@/lib/mailer";
import { prisma } from "@/lib/prisma";

export function getRequestBaseUrl(request: Request) {
  const forwardedHost = request.headers.get("x-forwarded-host");
  const host = forwardedHost ?? request.headers.get("host");
  if (!host) return null;

  const proto = request.headers.get("x-forwarded-proto") ?? "http";
  return `${proto}://${host}`;
}

function buildNotificationEmailErrorMessage(result: Awaited<ReturnType<typeof sendPqrsNotification>>) {
  const parts = [result.error, ...(result.failures ?? [])]
    .map((item) => item?.trim())
    .filter(Boolean);

  return parts.length ? parts.join(" | ") : "Error enviando correo";
}

function getNotificationEmailUpdate(
  result: Awaited<ReturnType<typeof sendPqrsNotification>>,
): Prisma.PqrsUpdateInput {
  const attemptedAt = new Date();

  if (result.ok) {
    return {
      notificationEmailStatus: "sent",
      notificationEmailError: null,
      notificationEmailAttemptedAt: attemptedAt,
      notificationEmailSentAt: attemptedAt,
    };
  }

  return {
    notificationEmailStatus: "failed",
    notificationEmailError: buildNotificationEmailErrorMessage(result),
    notificationEmailAttemptedAt: attemptedAt,
  };
}

export async function sendPqrsCreationNotificationEmail(args: {
  pqrsId: string;
  appBaseUrl?: string | null;
}) {
  const pqrs = await prisma.pqrs.findUnique({
    where: { id: args.pqrsId },
    include: {
      sede: true,
      planta: true,
      tipoReclamo: true,
      createdBy: {
        select: {
          username: true,
        },
      },
      evidencias: {
        select: {
          fileName: true,
          mimeType: true,
          data: true,
        },
      },
    },
  });

  if (!pqrs) {
    return {
      ok: false,
      error: "PQRS no encontrado",
      attempted: [],
      accepted: [],
      failed: [],
      failures: ["PQRS no encontrado"],
    } as const;
  }

  const result = await sendPqrsNotification({
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
    createdBy: pqrs.createdBy?.username ?? null,
    attachments: pqrs.evidencias.map((file) => ({
      fileName: file.fileName,
      mimeType: file.mimeType,
      data: Buffer.from(file.data as unknown as Uint8Array),
    })),
    appBaseUrl: args.appBaseUrl,
  });

  await prisma.pqrs.update({
    where: { id: pqrs.id },
    data: getNotificationEmailUpdate(result),
  });

  return result;
}
