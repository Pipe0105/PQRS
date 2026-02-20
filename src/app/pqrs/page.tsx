import Image from "next/image";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import LogoutButton from "@/components/LogoutButton";
import PqrsForm from "./_components/PqrsForm";

export default async function PqrsPage() {
  const user = await requireUser();

  return (
    <div className="min-h-screen px-4 py-10">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
        <header className="relative overflow-hidden rounded-3xl border border-white/60 bg-gradient-to-br from-white via-white to-blue-50/80 p-6 shadow-xl shadow-blue-200/40">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-blue-600 via-sky-500 to-lime-400" />

          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="w-full rounded-2xl bg-white/80 px-4 py-3 sm:w-auto">
                <Image
                  src="/logos/mercamio-mercatodo.jpeg"
                  alt="Logos Mercamio y Mercatodo"
                  width={780}
                  height={220}
                  className="h-20 w-auto sm:h-24"
                  priority
                />
              </div>

              <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                {user.role === "admin" ? (
                  <>
                    <Link
                      href="/admin/pqrs"
                      className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
                    >
                      Ir al menu admin
                    </Link>
                    <Link
                      href="/admin/usuarios"
                      className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
                    >
                      Editar usuarios
                    </Link>
                  </>
                ) : null}
                <LogoutButton />
              </div>
            </div>

            <div className="max-w-2xl">
              <h1 className="text-2xl font-semibold text-slate-900 sm:text-3xl">
                PQRS Planta Mercamio
              </h1>
              <p className="mt-2 text-sm text-slate-600 sm:text-base">
                Formulario para la recepcion de Peticiones, Quejas, Reclamos, Solicitudes de
                Informacion y Sugerencias de la planta
              </p>
            </div>
          </div>
        </header>

        <PqrsForm userEmail={user.username} />
      </div>
    </div>
  );
}

