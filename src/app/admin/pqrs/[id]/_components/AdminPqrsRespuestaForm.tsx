"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  pqrsId: string;
  estadoActual: "abierto" | "en_proceso" | "cerrado";
};

export default function AdminPqrsRespuestaForm({ pqrsId, estadoActual }: Props) {
  const router = useRouter();
  const [mensaje, setMensaje] = useState("");
  const [estado, setEstado] = useState<Props["estadoActual"]>(estadoActual);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      const res = await fetch(`/api/pqrs/${pqrsId}/respuestas`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mensaje, estado }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "No se pudo guardar la respuesta");
      }

      setMensaje("");
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
