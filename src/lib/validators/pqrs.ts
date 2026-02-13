import { z } from "zod";

export const allowedMimeTypes = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "application/pdf",
] as const;

export type AllowedMimeType = (typeof allowedMimeTypes)[number];

export function isAllowedMimeType(value: string): value is AllowedMimeType {
  return allowedMimeTypes.includes(value as AllowedMimeType);
}

export const pqrsCreateSchema = z.object({
  sedeId: z.string().min(1),
  plantaId: z.string().min(1),
  tipoReclamoId: z.string().min(1),
  fechaReciboProducto: z.string().min(1, "Fecha de recibo es obligatoria"),
  nombre: z.string().min(1, "Nombre es obligatorio"),
  numeroContacto: z
    .string()
    .regex(/^\d{7,15}$/, "Numero de contacto invalido"),
  correo: z.string().email("Correo invalido"),
  descripcion: z.string().min(10, "Descripcion minima de 10 caracteres"),
});

export const pqrsCreateSchemaWithDateCheck = pqrsCreateSchema
  .superRefine((data, ctx) => {
    const value = new Date(`${data.fechaReciboProducto}T00:00:00`);
    if (Number.isNaN(value.getTime())) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Fecha invalida",
        path: ["fechaReciboProducto"],
      });
      return;
    }
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    if (value > today) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "La fecha no puede ser futura",
        path: ["fechaReciboProducto"],
      });
    }
  })
  .transform((data) => ({
    ...data,
    fechaReciboProducto: new Date(`${data.fechaReciboProducto}T00:00:00`),
  }));

export const pqrsFilterSchema = z.object({
  sedeId: z.string().optional(),
  plantaId: z.string().optional(),
  estado: z.enum(["abierto", "en_proceso", "cerrado", "todos"]).optional(),
});

export const fileMetaSchema = z.object({
  name: z.string().min(1),
  mimeType: z.enum(allowedMimeTypes),
  size: z.number().int().positive().max(10 * 1024 * 1024),
});
