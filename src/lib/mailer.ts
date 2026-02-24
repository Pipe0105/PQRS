import "server-only";

import nodemailer from "nodemailer";

type MailPayload = {
  caseNumber: string;
  sede: string;
  planta: string;
  tipoReclamo: string;
  fechaReciboProducto: Date;
  nombre: string;
  numeroContacto: string;
  correo: string;
  lote: string | null;
  descripcion: string;
  createdBy?: string | null;
  attachments?: Array<{
    fileName: string;
    mimeType: string;
    data: Buffer;
  }>;
  appBaseUrl?: string | null;
};

type ResponsePayload = MailPayload & {
  respuesta: string;
  estado: "abierto" | "en_proceso" | "cerrado";
  attachments?: Array<{
    fileName: string;
    mimeType: string;
    data: Buffer;
  }>;
};

type NotificationResult = {
  ok: boolean;
  error?: string;
  attempted: string[];
  accepted: string[];
  failed: string[];
  failures?: string[];
};

function getTransport() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT ?? 0);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const secure = process.env.SMTP_SECURE === "true";

  if (!host || !port || !user || !pass) {
    return null;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: {
      user,
      pass,
    },
  });
}

function getCaseUrl(caseNumber: string, appBaseUrl?: string | null) {
  const baseUrl = (appBaseUrl ?? process.env.APP_URL ?? "http://localhost:3000").replace(
    /\/+$/,
    "",
  );
  return `${baseUrl}/pqrs/confirmacion/${encodeURIComponent(caseNumber)}`;
}

function getNotificationRecipients() {
  const raw = process.env.SMTP_TO ?? "";
  const parsed = raw
    .split(/[;,]/)
    .map((item) => item.trim())
    .filter(Boolean);

  return Array.from(new Set(parsed));
}

export async function sendPqrsNotification(payload: MailPayload) {
  const transport = getTransport();
  const recipients = getNotificationRecipients();
  const from = process.env.SMTP_FROM ?? process.env.SMTP_USER;
  const caseUrl = getCaseUrl(payload.caseNumber, payload.appBaseUrl);

  if (!transport || recipients.length === 0 || !from) {
    return {
      ok: false,
      error: "SMTP no configurado",
      attempted: recipients,
      accepted: [],
      failed: recipients,
    } satisfies NotificationResult;
  }

  const caseLabel = `Caso ${payload.caseNumber} - ${payload.planta}`;
  const subject = `[PQRS] ${caseLabel}`;
  const fecha = new Intl.DateTimeFormat("es-CO", { dateStyle: "medium" }).format(
    payload.fechaReciboProducto,
  );

  const text = `${caseLabel}
Sede: ${payload.sede}
Planta: ${payload.planta}
Tipo reclamo: ${payload.tipoReclamo}
Fecha recibo: ${fecha}
Nombre: ${payload.nombre}
Contacto: ${payload.numeroContacto}
Correo: ${payload.correo}
Lote: ${payload.lote ?? "No aplica"}
Usuario: ${payload.createdBy ?? "No aplica"}
Ver caso: ${caseUrl}

Descripcion:
${payload.descripcion}
`;

  const html = `
    <h2>${caseLabel}</h2>
    <p><strong>Sede:</strong> ${payload.sede}</p>
    <p><strong>Planta:</strong> ${payload.planta}</p>
    <p><strong>Tipo reclamo:</strong> ${payload.tipoReclamo}</p>
    <p><strong>Fecha recibo:</strong> ${fecha}</p>
    <p><strong>Nombre:</strong> ${payload.nombre}</p>
    <p><strong>Contacto:</strong> ${payload.numeroContacto}</p>
    <p><strong>Correo:</strong> ${payload.correo}</p>
    <p><strong>Lote:</strong> ${payload.lote ?? "No aplica"}</p>
    <p><strong>Usuario:</strong> ${payload.createdBy ?? "No aplica"}</p>
    <p><strong>Ver caso:</strong> <a href="${caseUrl}">${caseUrl}</a></p>
    <p><strong>Descripcion:</strong></p>
    <pre style="white-space: pre-wrap; font-family: inherit;">${payload.descripcion}</pre>
  `;

  const attachments = payload.attachments?.map((file) => ({
    filename: file.fileName,
    content: file.data,
    contentType: file.mimeType,
  }));

  const acceptedRecipients: string[] = [];
  const failedRecipients: string[] = [];
  const failures: string[] = [];

  for (const recipient of recipients) {
    try {
      const info = await transport.sendMail({
        from,
        to: recipient,
        subject,
        text,
        html,
        attachments,
      });

      if (info.rejected?.length) {
        failedRecipients.push(recipient);
        failures.push(`${recipient}: rechazado por SMTP (${info.rejected.join(", ")})`);
      } else {
        acceptedRecipients.push(recipient);
      }
    } catch (error) {
      failedRecipients.push(recipient);
      const message = error instanceof Error ? error.message : "Error enviando correo";
      failures.push(`${recipient}: ${message}`);
    }
  }

  if (failedRecipients.length > 0) {
    return {
      ok: false,
      error: `No se pudo enviar a: ${failedRecipients.join(", ")}`,
      attempted: recipients,
      accepted: acceptedRecipients,
      failed: failedRecipients,
      failures,
    };
  }

  return {
    ok: true,
    attempted: recipients,
    accepted: acceptedRecipients,
    failed: [],
  };
}

export async function sendPqrsResponseEmail(payload: ResponsePayload) {
  const transport = getTransport();
  const from = process.env.SMTP_FROM ?? process.env.SMTP_USER;

  if (!transport || !from) {
    return { ok: false, error: "SMTP no configurado" };
  }

  const caseLabel = `Caso ${payload.caseNumber} - ${payload.planta}`;
  const subject = `[PQRS] Respuesta ${caseLabel}`;
  const fecha = new Intl.DateTimeFormat("es-CO", { dateStyle: "medium" }).format(
    payload.fechaReciboProducto,
  );

  const text = `Se registro una respuesta a tu ${caseLabel}
Estado: ${payload.estado}
Sede: ${payload.sede}
Planta: ${payload.planta}
Tipo reclamo: ${payload.tipoReclamo}
Fecha recibo: ${fecha}

Respuesta:
${payload.respuesta}
`;

  const html = `
    <h2>Respuesta a tu ${caseLabel}</h2>
    <p><strong>Estado:</strong> ${payload.estado}</p>
    <p><strong>Sede:</strong> ${payload.sede}</p>
    <p><strong>Planta:</strong> ${payload.planta}</p>
    <p><strong>Tipo reclamo:</strong> ${payload.tipoReclamo}</p>
    <p><strong>Fecha recibo:</strong> ${fecha}</p>
    <p><strong>Respuesta:</strong></p>
    <pre style="white-space: pre-wrap; font-family: inherit;">${payload.respuesta}</pre>
  `;

  try {
    await transport.sendMail({
      from,
      to: payload.correo,
      subject,
      text,
      html,
      attachments: payload.attachments?.map((file) => ({
        filename: file.fileName,
        content: file.data,
        contentType: file.mimeType,
      })),
    });
    return { ok: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error enviando correo";
    return { ok: false, error: message };
  }
}

