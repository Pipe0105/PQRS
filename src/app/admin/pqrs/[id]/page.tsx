import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export default async function AdminPqrsDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;
  const item = await prisma.pqrs.findUnique({
    where: { id },
    include: {
      sede: true,
      planta: true,
      tipoReclamo: true,
      evidencias: true,
    },
  });

  if (!item) {
    notFound();
  }

  return (
    <div className="min-h-screen px-4 py-10">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
        <header className="rounded-3xl bg-white/95 p-6 shadow-xl shadow-blue-200/40">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-500">
            Caso {item.caseNumber}
          </p>
          <h1 className="text-2xl font-semibold text-slate-900">Detalle de solicitud</h1>
          <p className="text-sm text-slate-600">
            Estado actual:{" "}
            <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
              {item.estado}
            </span>
          </p>
        </header>

        <section className="rounded-3xl bg-white/95 p-6 shadow-xl shadow-blue-200/40">
          <dl className="grid gap-4 md:grid-cols-2">
            <div>
              <dt className="text-xs uppercase tracking-[0.2em] text-slate-400">Sede</dt>
              <dd className="text-sm font-semibold text-slate-800">{item.sede.nombre}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-[0.2em] text-slate-400">Planta</dt>
              <dd className="text-sm font-semibold text-slate-800">{item.planta.nombre}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-[0.2em] text-slate-400">Tipo</dt>
              <dd className="text-sm font-semibold text-slate-800">
                {item.tipoReclamo.nombre}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-[0.2em] text-slate-400">
                Fecha recibo producto
              </dt>
              <dd className="text-sm font-semibold text-slate-800">
                {new Intl.DateTimeFormat("es-CO", {
                  dateStyle: "medium",
                }).format(new Date(item.fechaReciboProducto))}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-[0.2em] text-slate-400">
                Nombre contacto
              </dt>
              <dd className="text-sm font-semibold text-slate-800">{item.nombre}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-[0.2em] text-slate-400">
                Número contacto
              </dt>
              <dd className="text-sm font-semibold text-slate-800">{item.numeroContacto}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-[0.2em] text-slate-400">Correo</dt>
              <dd className="text-sm font-semibold text-slate-800">{item.correo}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-[0.2em] text-slate-400">
                Fecha creación
              </dt>
              <dd className="text-sm font-semibold text-slate-800">
                {new Intl.DateTimeFormat("es-CO", {
                  dateStyle: "medium",
                  timeStyle: "short",
                }).format(new Date(item.createdAt))}
              </dd>
            </div>
          </dl>

          <div className="mt-6">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Descripción</p>
            <p className="mt-2 whitespace-pre-wrap rounded-2xl border border-slate-200 bg-slate-50/60 p-4 text-sm text-slate-700">
              {item.descripcion}
            </p>
          </div>

          <div className="mt-6">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Evidencias</p>
            {item.evidencias.length ? (
              <ul className="mt-2 flex flex-col gap-2">
                {item.evidencias.map((evidencia) => (
                  <li key={evidencia.id}>
                    <a
                      href={evidencia.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-semibold text-blue-600 hover:text-blue-800"
                    >
                      {evidencia.key.split("/").pop()}
                    </a>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-slate-500">Sin archivos adjuntos.</p>
            )}
          </div>
        </section>

        <Link
          href="/admin/pqrs"
          className="inline-flex w-fit items-center justify-center rounded-full bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-300/60 transition hover:bg-blue-700"
        >
          Volver al listado
        </Link>
      </div>
    </div>
  );
}
