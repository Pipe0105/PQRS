import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import LogoutButton from "@/components/LogoutButton";
import AdminUsers from "./_components/AdminUsers";

export default async function AdminUsersPage() {
  await requireAdmin();

  return (
    <div className="min-h-screen px-4 py-10">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <header className="rounded-3xl bg-white/95 p-6 shadow-xl shadow-blue-200/40">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-500">
                Panel interno
              </p>
              <h1 className="text-2xl font-semibold text-slate-900">Usuarios</h1>
              <p className="text-sm text-slate-600">
                Administra usuarios, roles y tokens de recuperación.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                href="/pqrs"
                className="rounded-full border border-blue-200 bg-blue-50 px-4 py-2 text-xs font-semibold text-blue-700 shadow-sm hover:text-blue-900"
              >
                Ir al formulario
              </Link>
              <Link
                href="/admin/pqrs"
                className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 shadow-sm hover:text-slate-900"
              >
                Solicitudes
              </Link>
              <LogoutButton />
            </div>
          </div>
        </header>

        <AdminUsers />
      </div>
    </div>
  );
}
