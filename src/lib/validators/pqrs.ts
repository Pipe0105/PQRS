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

export const evidenceSchema = z.object({
  url: z.string().url(),
  key: z.string().min(1),
  mimeType: z.enum(allowedMimeTypes),
  size: z.number().int().positive().max(10 * 1024 * 1024),
  originalName: z.string().min(1),
});

export const pqrsCreateSchema = z.object({
  sedeId: z.string().min(1),
  plantaId: z.string().min(1),
  tipoReclamoId: z.string().min(1),
  fechaReciboProducto: z.coerce.date(),
  nombre: z.string().min(1, "Nombre es obligatorio"),
  numeroContacto: z
    .string()
    .regex(/^\d{7,15}$/, "Número de contacto inválido"),
  correo: z.string().email("Correo inválido"),
  descripcion: z.string().min(10, "Descripción mínima de 10 caracteres"),
  evidencias: z.array(evidenceSchema).max(5).optional(),
});

export const pqrsCreateSchemaWithDateCheck = pqrsCreateSchema.superRefine(
  (data, ctx) => {
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    if (data.fechaReciboProducto > today) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "La fecha no puede ser futura",
        path: ["fechaReciboProducto"],
      });
    }
  },
);

export const pqrsFilterSchema = z.object({
  sedeId: z.string().optional(),
  plantaId: z.string().optional(),
  estado: z.enum(["abierto", "en_proceso", "cerrado"]).optional(),
});

export const presignSchema = z.object({
  files: z
    .array(
      z.object({
        name: z.string().min(1),
        mimeType: z.enum(allowedMimeTypes),
        size: z.number().int().positive().max(10 * 1024 * 1024),
      }),
    )
    .min(1)
    .max(5),
});
