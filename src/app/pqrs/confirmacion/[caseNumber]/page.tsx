import Link from "next/link";

export default async function ConfirmacionPage({
  params,
}: {
  params: Promise<{ caseNumber: string }>;
}) {
  const { caseNumber } = await params;

  return (
    <div className="min-h-screen px-4 py-16">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 rounded-3xl bg-white/95 p-8 shadow-xl shadow-blue-200/40">
        <div className="rounded-2xl bg-blue-50 px-4 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-blue-600">
          Confirmación
        </div>
        <h1 className="text-2xl font-semibold text-slate-900">
          Tu solicitud fue registrada correctamente.
        </h1>
        <p className="text-slate-600">
          Conserva este número de caso para cualquier seguimiento.
        </p>
        <div className="rounded-2xl border border-blue-200 bg-blue-50 px-6 py-4 text-2xl font-bold text-blue-700">
          {caseNumber}
        </div>
        <Link
          href="/pqrs"
          className="inline-flex w-fit items-center justify-center rounded-full bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-300/60 transition hover:bg-blue-700"
        >
          Enviar otra solicitud
        </Link>
      </div>
    </div>
  );
}
