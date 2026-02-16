import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import AdminPqrsRespuestaForm from "./_components/AdminPqrsRespuestaForm";

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
      evidencias: {
        select: {
          id: true,
          fileName: true,
          mimeType: true,
          size: true,
          createdAt: true,
        },
      },
      respuestas: {
        orderBy: { createdAt: "desc" },
        include: {
          createdBy: {
            select: {
              username: true,
              nombre: true,
            },
          },
          evidencias: {
            select: {
              id: true,
              fileName: true,
              mimeType: true,
              size: true,
              createdAt: true,
            },
          },
        },
      },
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
                Numero de celular de la persona que genera la PQRS
              </dt>
              <dd className="text-sm font-semibold text-slate-800">{item.numeroContacto}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-[0.2em] text-slate-400">Correo</dt>
              <dd className="text-sm font-semibold text-slate-800">{item.correo}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-[0.2em] text-slate-400">Lote</dt>
              <dd className="text-sm font-semibold text-slate-800">
                {item.lote ?? "No aplica"}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-[0.2em] text-slate-400">
                Fecha creacion
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
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Descripcion</p>
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
                      href={`/api/pqrs/${item.id}/evidencias/${evidencia.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-semibold text-blue-600 hover:text-blue-800"
                    >
                      {evidencia.fileName}
                    </a>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-slate-500">Sin archivos adjuntos.</p>
            )}
          </div>
        </section>

        <section className="rounded-3xl bg-white/95 p-6 shadow-xl shadow-blue-200/40">
          <h2 className="text-lg font-semibold text-slate-900">Respuesta y seguimiento</h2>
          <p className="text-sm text-slate-600">
            Agrega una respuesta y actualiza el estado para dejarlo en el historial.
          </p>
          <div className="mt-4">
            <AdminPqrsRespuestaForm pqrsId={item.id} estadoActual={item.estado} />
          </div>
        </section>

        <section className="rounded-3xl bg-white/95 p-6 shadow-xl shadow-blue-200/40">
          <h2 className="text-lg font-semibold text-slate-900">Historial</h2>
          {item.respuestas.length ? (
            <ul className="mt-4 flex flex-col gap-4">
              {item.respuestas.map((respuesta) => (
                <li
                  key={respuesta.id}
                  className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                    <span>
                      {respuesta.createdBy?.nombre ||
                        respuesta.createdBy?.username ||
                        "Administrador"}
                    </span>
                    <span>
                      {new Intl.DateTimeFormat("es-CO", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      }).format(new Date(respuesta.createdAt))}
                    </span>
                  </div>
                  <div className="mt-2 text-xs font-semibold uppercase tracking-[0.2em] text-blue-500">
                    Estado: {respuesta.estado}
                  </div>
                  <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">
                    {respuesta.mensaje}
                  </p>
                  {respuesta.evidencias.length ? (
                    <div className="mt-3">
                      <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                        Adjuntos
                      </p>
                      <ul className="mt-2 flex flex-col gap-2">
                        {respuesta.evidencias.map((archivo) => (
                          <li key={archivo.id}>
                            <a
                              href={`/api/pqrs/${item.id}/respuestas/${respuesta.id}/evidencias/${archivo.id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm font-semibold text-blue-600 hover:text-blue-800"
                            >
                              {archivo.fileName}
                            </a>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-slate-500">Sin respuestas registradas.</p>
          )}
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

