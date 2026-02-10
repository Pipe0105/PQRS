import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import LogoutButton from "@/components/LogoutButton";
import AdminPqrsList from "./_components/AdminPqrsList";

export default async function AdminPqrsPage({
  searchParams,
}: {
  searchParams?: Promise<{
    sedeId?: string;
    plantaId?: string;
    estado?: string;
  }>;
}) {
  await requireAdmin();
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const initialFilters = {
    sedeId: resolvedSearchParams?.sedeId ?? "",
    plantaId: resolvedSearchParams?.plantaId ?? "",
    estado: resolvedSearchParams?.estado ?? "",
  };

  return (
    <div className="min-h-screen px-4 py-10">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <header className="rounded-3xl bg-white/95 p-6 shadow-xl shadow-blue-200/40">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-500">
                Panel interno
              </p>
              <h1 className="text-2xl font-semibold text-slate-900">
                Solicitudes PQRS
              </h1>
              <p className="text-sm text-slate-600">
                Filtra por sede, planta o estado y revisa el detalle de cada caso.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                href="/admin/pqrs"
                className="rounded-full border border-blue-200 bg-blue-50 px-4 py-2 text-xs font-semibold text-blue-700 shadow-sm hover:text-blue-900"
              >
                Pendientes
              </Link>
              <Link
                href="/admin/pqrs?estado=cerrado"
                className="rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-semibold text-emerald-700 shadow-sm hover:text-emerald-900"
              >
                Historial (resueltos)
              </Link>
              <Link
                href="/pqrs"
                className="rounded-full border border-blue-200 bg-blue-50 px-4 py-2 text-xs font-semibold text-blue-700 shadow-sm hover:text-blue-900"
              >
                Ir al formulario
              </Link>
              <Link
                href="/admin/usuarios"
                className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 shadow-sm hover:text-slate-900"
              >
                Usuarios
              </Link>
              <LogoutButton />
            </div>
          </div>
        </header>

        <AdminPqrsList initialFilters={initialFilters} />
      </div>
    </div>
  );
}
