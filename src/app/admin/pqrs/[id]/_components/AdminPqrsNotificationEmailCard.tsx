"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  pqrsId: string;
  status: "pending" | "sent" | "failed";
  error: string | null;
  attemptedAt: string | null;
  sentAt: string | null;
};

const statusStyles: Record<Props["status"], string> = {
  pending: "bg-amber-50 text-amber-700",
  sent: "bg-emerald-50 text-emerald-700",
  failed: "bg-red-50 text-red-700",
};

const statusLabels: Record<Props["status"], string> = {
  pending: "Pendiente",
  sent: "Enviado",
  failed: "Fallido",
};

function formatDateTime(value: string | null) {
  if (!value) return "Sin registro";

  return new Intl.DateTimeFormat("es-CO", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default function AdminPqrsNotificationEmailCard({
  pqrsId,
  status,
  error,
  attemptedAt,
  sentAt,
}: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleRetry() {
    setLoading(true);
    setRequestError(null);
    setSuccess(null);

    try {
      const res = await fetch(`/api/pqrs/${pqrsId}/email`, {
        method: "POST",
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.failures?.[0] ?? data?.error ?? "No se pudo reenviar el correo");
      }

      setSuccess("Correo reenviado. Actualizando estado...");
      router.refresh();
    } catch (err) {
      setRequestError(err instanceof Error ? err.message : "Error reintentando el correo");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="rounded-3xl bg-white/95 p-6 shadow-xl shadow-blue-200/40">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Correo de notificacion</h2>
          <p className="text-sm text-slate-600">
            Estado del correo que se envia a los destinatarios internos al crear la PQRS.
          </p>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold ${statusStyles[status]}`}
        >
          {statusLabels[status]}
        </span>
      </div>

      <dl className="mt-4 grid gap-4 md:grid-cols-2">
        <div>
          <dt className="text-xs uppercase tracking-[0.2em] text-slate-400">Ultimo intento</dt>
          <dd className="text-sm font-semibold text-slate-800">{formatDateTime(attemptedAt)}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-[0.2em] text-slate-400">Fecha envio</dt>
          <dd className="text-sm font-semibold text-slate-800">{formatDateTime(sentAt)}</dd>
        </div>
      </dl>

      {error ? (
        <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}
      {requestError ? (
        <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {requestError}
        </div>
      ) : null}
      {success ? (
        <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {success}
        </div>
      ) : null}

      {status !== "sent" ? (
        <button
          type="button"
          onClick={handleRetry}
          disabled={loading}
          className="mt-4 inline-flex items-center justify-center rounded-full bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-300/60 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
        >
          {loading
            ? "Reintentando..."
            : status === "pending"
              ? "Enviar notificacion"
              : "Reintentar envio"}
        </button>
      ) : null}
    </section>
  );
}
