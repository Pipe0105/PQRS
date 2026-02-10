"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { isAllowedMimeType } from "@/lib/validators/pqrs";

type Props = {
  pqrsId: string;
  estadoActual: "abierto" | "en_proceso" | "cerrado";
};

const MAX_FILES = 5;
const MAX_SIZE = 10 * 1024 * 1024;

export default function AdminPqrsRespuestaForm({ pqrsId, estadoActual }: Props) {
  const router = useRouter();
  const [mensaje, setMensaje] = useState("");
  const [estado, setEstado] = useState<Props["estadoActual"]>(estadoActual);
  const [files, setFiles] = useState<File[]>([]);
  const [filesError, setFilesError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

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
      setFilesError(`Maximo ${MAX_FILES} archivos.`);
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
      setFilesError("Cada archivo debe ser maximo 10MB.");
      event.currentTarget.value = "";
      return;
    }

    setFilesError(null);
    setFiles(unique);
    event.currentTarget.value = "";
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    if (filesError) {
      setError(filesError);
      return;
    }
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append("mensaje", mensaje);
      formData.append("estado", estado);
      files.forEach((file) => formData.append("files", file));

      const res = await fetch(`/api/pqrs/${pqrsId}/respuestas`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "No se pudo guardar la respuesta");
      }

      setMensaje("");
      setFiles([]);
      setSuccess("Respuesta guardada en el historial.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar respuesta");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700">
        Respuesta / seguimiento
        <textarea
          value={mensaje}
          onChange={(event) => setMensaje(event.target.value)}
          rows={4}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm"
          required
        />
      </label>

      <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
        <div className="flex flex-col gap-2 text-sm font-semibold text-slate-700">
          Adjuntar evidencias
          <span className="text-xs font-normal text-slate-500">
            Suba hasta 5 archivos compatibles. El tamano maximo es de 10MB por archivo.
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
                  {file.name} x
                </button>
              ))}
            </div>
          ) : null}
          {filesError ? <p className="text-xs text-red-600">{filesError}</p> : null}
        </div>
      </div>

      <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700">
        Estado
        <select
          value={estado}
          onChange={(event) => setEstado(event.target.value as Props["estadoActual"])}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm"
        >
          <option value="abierto">Abierto</option>
          <option value="en_proceso">En proceso</option>
          <option value="cerrado">Cerrado</option>
        </select>
      </label>

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}
      {success ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {success}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={loading}
        className="inline-flex items-center justify-center rounded-full bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-300/60 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
      >
        {loading ? "Guardando..." : "Guardar respuesta"}
      </button>
    </form>
  );
}


