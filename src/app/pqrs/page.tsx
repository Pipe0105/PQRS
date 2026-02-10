import Image from "next/image";
import { requireUser } from "@/lib/auth";
import LogoutButton from "@/components/LogoutButton";
import PqrsForm from "./_components/PqrsForm";

export default async function PqrsPage() {
  await requireUser();

  return (
    <div className="min-h-screen px-4 py-10">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
        <header className="relative overflow-hidden rounded-3xl border border-white/60 bg-gradient-to-br from-white via-white to-blue-50/80 p-6 shadow-xl shadow-blue-200/40">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-blue-600 via-sky-500 to-lime-400" />
          <div className="flex flex-col items-start gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-col gap-4">
              <div className="flex w-full items-center justify-center rounded-2xl bg-white/80 px-4 py-3">
                <Image
                  src="/logos/mercamio-mercatodo.jpeg"
                  alt="Logos Mercamio y Mercatodo"
                  width={780}
                  height={220}
                  className="h-24 w-auto sm:h-28"
                  priority
                />
              </div>
              <div className="max-w-2xl">
                <h1 className="text-2xl font-semibold text-slate-900 sm:text-3xl">
                  PQRS Planta Mercamio
                </h1>
                <p className="mt-2 text-sm text-slate-600 sm:text-base">
                  Formulario para la recepción de Peticiones, Quejas, Reclamos,
                  Solicitudes de Información y Sugerencias.
                </p>
              </div>
            </div>
            <LogoutButton />
          </div>
        </header>

        <PqrsForm />
      </div>
    </div>
  );
}
