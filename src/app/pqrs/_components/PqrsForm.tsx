"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { isAllowedMimeType } from "@/lib/validators/pqrs";

type CatalogoItem = {
  id: string;
  nombre: string;
};

type CatalogosResponse = {
  sedes: CatalogoItem[];
  plantas: CatalogoItem[];
  tipos: CatalogoItem[];
};

const formSchema = z
  .object({
    sedeId: z.string().min(1, "Sede es obligatoria"),
    plantaId: z.string().min(1, "Planta destino es obligatoria"),
    fechaReciboProducto: z.string().min(1, "Fecha de recibo es obligatoria"),
    tipoReclamoId: z.string().min(1, "Tipo de reclamo es obligatorio"),
    nombre: z.string().min(1, "Nombre es obligatorio"),
    numeroContacto: z
      .string()
      .regex(
        /^\d{7,15}$/,
        "Número de la persona que genera la PQRS debe tener 7 a 15 dígitos",
      ),
    correo: z.string().email("Correo inválido"),
    descripcion: z.string().min(10, "Descripción mínima de 10 caracteres"),
  })
  .superRefine((data, ctx) => {
    const value = new Date(`${data.fechaReciboProducto}T00:00:00`);
    if (Number.isNaN(value.getTime())) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["fechaReciboProducto"],
        message: "Fecha inválida",
      });
      return;
    }
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    if (value > today) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["fechaReciboProducto"],
        message: "La fecha no puede ser futura",
      });
    }
  });

type FormValues = z.infer<typeof formSchema>;

const MAX_FILES = 5;
const MAX_SIZE = 10 * 1024 * 1024;

export default function PqrsForm() {
  const router = useRouter();
  const [catalogos, setCatalogos] = useState<CatalogosResponse | null>(null);
  const [catalogosError, setCatalogosError] = useState<string | null>(null);
  const [catalogosLoading, setCatalogosLoading] = useState(true);
  const [files, setFiles] = useState<File[]>([]);
  const [filesError, setFilesError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    mode: "onBlur",
  });

  useEffect(() => {
    let mounted = true;
    async function loadCatalogos() {
      try {
        setCatalogosLoading(true);
        const res = await fetch("/api/catalogos");
        if (!res.ok) {
          throw new Error("No se pudieron cargar los catálogos");
        }
        const data = (await res.json()) as CatalogosResponse;
        if (mounted) {
          setCatalogos(data);
        }
      } catch (error) {
        if (mounted) {
          setCatalogosError(
            error instanceof Error ? error.message : "Error cargando catálogos",
          );
        }
      } finally {
        if (mounted) {
          setCatalogosLoading(false);
        }
      }
    }

    loadCatalogos();
    return () => {
      mounted = false;
    };
  }, []);

  const fileListText = useMemo(() => {
    if (!files.length) return "Sin archivos seleccionados";
    return files.map((file) => file.name).join(", ");
  }, [files]);

  function onFilesChange(event: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(event.target.files ?? []);
    if (!selected.length) {
      return;
    }

    const merged = [...files, ...selected];
    const unique = merged.filter(
      (file, index, self) =>
        self.findIndex((item) => item.name === file.name && item.size === file.size) === index,
    );

    if (unique.length > MAX_FILES) {
      setFilesError(`Máximo ${MAX_FILES} archivos.`);
      setFiles(unique.slice(0, MAX_FILES));
      event.currentTarget.value = "";
      return;
    }

    const invalidType = unique.find((file) => !isAllowedMimeType(file.type));
    if (invalidType) {
      setFilesError("Solo se permiten archivos JPG, PNG o PDF.");
      event.currentTarget.value = "";
      return;
    }

    const tooLarge = unique.find((file) => file.size > MAX_SIZE);
    if (tooLarge) {
      setFilesError("Cada archivo debe ser máximo 10MB.");
      event.currentTarget.value = "";
      return;
    }

    setFilesError(null);
    setFiles(unique);
    event.currentTarget.value = "";
  }

  async function onSubmit(values: FormValues) {
    setSubmitError(null);
    setSubmitting(true);
    try {
      if (filesError) {
        throw new Error(filesError);
      }

      const formData = new FormData();
      formData.append("sedeId", values.sedeId);
      formData.append("plantaId", values.plantaId);
      formData.append("tipoReclamoId", values.tipoReclamoId);
      formData.append("fechaReciboProducto", values.fechaReciboProducto);
      formData.append("nombre", values.nombre);
      formData.append("numeroContacto", values.numeroContacto);
      formData.append("correo", values.correo);
      formData.append("descripcion", values.descripcion);
      files.forEach((file) => formData.append("files", file));

      const res = await fetch("/api/pqrs", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "No se pudo enviar la solicitud.");
      }

      const data = (await res.json()) as { caseNumber: string };
      router.push(`/pqrs/confirmacion/${data.caseNumber}`);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Error al enviar");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="flex flex-col gap-6 rounded-3xl bg-white/95 p-6 shadow-xl shadow-blue-200/40"
    >
      <div className="w-fit rounded-2xl border border-blue-100 bg-blue-50 px-4 py-2 text-xs font-semibold text-blue-700 shadow-sm">
        * Indica que la pregunta es obligatoria
      </div>
      {catalogosError ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {catalogosError}
        </div>
      ) : null}

      <div className="grid gap-4">
        <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700">
          Sede *
          <select
            {...register("sedeId")}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm"
            disabled={catalogosLoading}
          >
            <option value="">Elegir</option>
            {catalogos?.sedes.map((sede) => (
              <option key={sede.id} value={sede.id}>
                {sede.nombre}
              </option>
            ))}
          </select>
          {errors.sedeId ? (
            <span className="text-xs font-normal text-red-600">{errors.sedeId.message}</span>
          ) : null}
        </label>

        <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700">
          Seleccione a qué planta se dirige. *
          <select
            {...register("plantaId")}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm"
            disabled={catalogosLoading}
          >
            <option value="">Elegir</option>
            {catalogos?.plantas.map((planta) => (
              <option key={planta.id} value={planta.id}>
                {planta.nombre}
              </option>
            ))}
          </select>
          {errors.plantaId ? (
            <span className="text-xs font-normal text-red-600">{errors.plantaId.message}</span>
          ) : null}
        </label>

        <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700">
          Fecha de recibo de producto *
          <input
            type="date"
            {...register("fechaReciboProducto")}
            max={new Date().toISOString().split("T")[0]}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm"
          />
          {errors.fechaReciboProducto ? (
            <span className="text-xs font-normal text-red-600">
              {errors.fechaReciboProducto.message}
            </span>
          ) : null}
        </label>

        <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700">
          Tipo de reclamo *
          <select
            {...register("tipoReclamoId")}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm"
            disabled={catalogosLoading}
          >
            <option value="">Elegir</option>
            {catalogos?.tipos.map((tipo, index) => (
              <option key={tipo.id} value={tipo.id}>
                {index === catalogos.tipos.length - 1 ? `${tipo.nombre}, Rótulo` : tipo.nombre}
              </option>
            ))}
          </select>
          {errors.tipoReclamoId ? (
            <span className="text-xs font-normal text-red-600">
              {errors.tipoReclamoId.message}
            </span>
          ) : null}
        </label>

        <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700">
          Nombre de quien genera la novedad. *
          <input
            type="text"
            {...register("nombre")}
            placeholder="Tu respuesta"
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm"
          />
          {errors.nombre ? (
            <span className="text-xs font-normal text-red-600">{errors.nombre.message}</span>
          ) : null}
        </label>

        <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700">
          Numero de la persona que genera la PQRS *
          <input
            type="tel"
            {...register("numeroContacto")}
            placeholder="Tu respuesta"
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm"
          />
          {errors.numeroContacto ? (
            <span className="text-xs font-normal text-red-600">
              {errors.numeroContacto.message}
            </span>
          ) : null}
        </label>

        <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700">
          Correo electrónico *
          <input
            type="email"
            {...register("correo")}
            placeholder="Tu respuesta"
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm"
          />
          {errors.correo ? (
            <span className="text-xs font-normal text-red-600">{errors.correo.message}</span>
          ) : null}
        </label>

        <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700">
          Describa la novedad *
          <textarea
            {...register("descripcion")}
            placeholder="Tu respuesta"
            rows={4}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm"
          />
          {errors.descripcion ? (
            <span className="text-xs font-normal text-red-600">
              {errors.descripcion.message}
            </span>
          ) : null}
        </label>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
        <div className="flex flex-col gap-2 text-sm font-semibold text-slate-700">
          Adjunte evidencias
          <span className="text-xs font-normal text-slate-500">
            Suba hasta 5 archivos compatibles. El tamaño máximo es de 10MB por archivo.
          </span>
        </div>
        <div className="mt-3 flex flex-col gap-2">
          <label className="inline-flex w-fit cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm">
            <input
              type="file"
              className="hidden"
              multiple
              accept=".jpg,.jpeg,.png,.pdf"
              onChange={onFilesChange}
            />
            Agregar archivo
          </label>
          <p className="text-xs text-slate-500">{fileListText}</p>
          {files.length ? (
            <div className="flex flex-wrap gap-2">
              {files.map((file) => (
                <button
                  type="button"
                  key={file.name}
                  onClick={() => setFiles(files.filter((item) => item !== file))}
                  className="rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs text-blue-700"
                >
                  {file.name} ×
                </button>
              ))}
            </div>
          ) : null}
          {filesError ? <p className="text-xs text-red-600">{filesError}</p> : null}
        </div>
      </div>

      {submitError ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {submitError}
        </div>
      ) : null}

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <button
          type="submit"
          disabled={submitting || catalogosLoading}
          className="inline-flex items-center justify-center rounded-full bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-300/60 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
        >
          {submitting ? "Enviando..." : "Enviar"}
        </button>
        <p className="text-xs text-slate-500">
          Nunca envíes contraseñas a través de este formulario.
        </p>
      </div>
    </form>
  );
}
