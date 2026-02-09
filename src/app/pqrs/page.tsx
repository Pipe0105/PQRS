import PqrsForm from "./_components/PqrsForm";

export default function PqrsPage() {
  return (
    <div className="min-h-screen px-4 py-10">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
        <header className="rounded-3xl bg-white/90 p-6 shadow-xl shadow-blue-200/40">
          <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-blue-600 to-lime-400 text-white flex items-center justify-center text-2xl font-bold">
                M
              </div>
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-500">
                  PQRS
                </p>
                <h1 className="text-2xl font-semibold text-slate-900">
                  PQRS Planta Mercamio
                </h1>
                <p className="text-sm text-slate-600">
                  Formulario para la recepción de Peticiones, Quejas, Reclamos,
                  Solicitudes de Información y Sugerencias.
                </p>
              </div>
            </div>
            <div className="rounded-full bg-blue-50 px-4 py-2 text-xs font-semibold text-blue-700">
              * Indica que la pregunta es obligatoria
            </div>
          </div>
        </header>

        <PqrsForm />
      </div>
    </div>
  );
}
