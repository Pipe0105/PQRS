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
  descripcion: string;
  createdBy?: string | null;
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

export async function sendPqrsNotification(payload: MailPayload) {
  const transport = getTransport();
  const to = process.env.SMTP_TO;
  const from = process.env.SMTP_FROM ?? process.env.SMTP_USER;

  if (!transport || !to || !from) {
    return { ok: false, error: "SMTP no configurado" };
  }

  const subject = `[PQRS] Nuevo caso ${payload.caseNumber}`;
  const fecha = new Intl.DateTimeFormat("es-CO", { dateStyle: "medium" }).format(
    payload.fechaReciboProducto,
  );

  const text = `Nuevo caso PQRS ${payload.caseNumber}
Sede: ${payload.sede}
Planta: ${payload.planta}
Tipo reclamo: ${payload.tipoReclamo}
Fecha recibo: ${fecha}
Nombre: ${payload.nombre}
Contacto: ${payload.numeroContacto}
Correo: ${payload.correo}
Usuario: ${payload.createdBy ?? "No aplica"}

Descripcion:
${payload.descripcion}
`;

  const html = `
    <h2>Nuevo caso PQRS ${payload.caseNumber}</h2>
    <p><strong>Sede:</strong> ${payload.sede}</p>
    <p><strong>Planta:</strong> ${payload.planta}</p>
    <p><strong>Tipo reclamo:</strong> ${payload.tipoReclamo}</p>
    <p><strong>Fecha recibo:</strong> ${fecha}</p>
    <p><strong>Nombre:</strong> ${payload.nombre}</p>
    <p><strong>Contacto:</strong> ${payload.numeroContacto}</p>
    <p><strong>Correo:</strong> ${payload.correo}</p>
    <p><strong>Usuario:</strong> ${payload.createdBy ?? "No aplica"}</p>
    <p><strong>Descripcion:</strong></p>
    <pre style="white-space: pre-wrap; font-family: inherit;">${payload.descripcion}</pre>
  `;

  try {
    await transport.sendMail({
      from,
      to,
      subject,
      text,
      html,
    });
    return { ok: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error enviando correo";
    return { ok: false, error: message };
  }
}

export async function sendPqrsResponseEmail(payload: ResponsePayload) {
  const transport = getTransport();
  const from = process.env.SMTP_FROM ?? process.env.SMTP_USER;

  if (!transport || !from) {
    return { ok: false, error: "SMTP no configurado" };
  }

  const subject = `[PQRS] Respuesta caso ${payload.caseNumber}`;
  const fecha = new Intl.DateTimeFormat("es-CO", { dateStyle: "medium" }).format(
    payload.fechaReciboProducto,
  );

  const text = `Se registro una respuesta a tu caso PQRS ${payload.caseNumber}
Estado: ${payload.estado}
Sede: ${payload.sede}
Planta: ${payload.planta}
Tipo reclamo: ${payload.tipoReclamo}
Fecha recibo: ${fecha}

Respuesta:
${payload.respuesta}
`;

  const html = `
    <h2>Respuesta a tu caso PQRS ${payload.caseNumber}</h2>
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

