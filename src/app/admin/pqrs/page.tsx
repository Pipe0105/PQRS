import AdminPqrsList from "./_components/AdminPqrsList";

export default function AdminPqrsPage() {
  return (
    <div className="min-h-screen px-4 py-10">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <header className="rounded-3xl bg-white/95 p-6 shadow-xl shadow-blue-200/40">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-500">
            Panel interno
          </p>
          <h1 className="text-2xl font-semibold text-slate-900">Solicitudes PQRS</h1>
          <p className="text-sm text-slate-600">
            Filtra por sede, planta o estado y revisa el detalle de cada caso.
          </p>
        </header>

        <AdminPqrsList />
      </div>
    </div>
  );
}
