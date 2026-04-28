"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type CatalogoItem = {
  id: string;
  nombre: string;
};

type CatalogosResponse = {
  sedes: CatalogoItem[];
  plantas: CatalogoItem[];
  tipos: CatalogoItem[];
};

type PqrsItem = {
  id: string;
  caseNumber: string;
  estado: "abierto" | "en_proceso" | "cerrado";
  notificationEmailStatus: "pending" | "sent" | "failed";
  createdAt: string;
  sede: CatalogoItem;
  planta: CatalogoItem;
  tipoReclamo: CatalogoItem;
};

type Filters = {
  sedeId: string;
  plantaId: string;
  estado: string;
};

type Props = {
  initialFilters?: Partial<Filters>;
};

const estadoLabels: Record<PqrsItem["estado"], string> = {
  abierto: "Abierto",
  en_proceso: "En proceso",
  cerrado: "Cerrado",
};

const emailStatusLabels: Record<PqrsItem["notificationEmailStatus"], string> = {
  pending: "Pendiente",
  sent: "Enviado",
  failed: "Fallido",
};

const emailStatusStyles: Record<PqrsItem["notificationEmailStatus"], string> = {
  pending: "bg-amber-50 text-amber-700",
  sent: "bg-emerald-50 text-emerald-700",
  failed: "bg-red-50 text-red-700",
};

export default function AdminPqrsList({ initialFilters }: Props) {
  const [catalogos, setCatalogos] = useState<CatalogosResponse | null>(null);
  const [filters, setFilters] = useState<Filters>(() => ({
    sedeId: initialFilters?.sedeId ?? "",
    plantaId: initialFilters?.plantaId ?? "",
    estado: initialFilters?.estado ?? "todos",
  }));
  const [items, setItems] = useState<PqrsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    if (filters.sedeId) params.set("sedeId", filters.sedeId);
    if (filters.plantaId) params.set("plantaId", filters.plantaId);
    if (filters.estado) params.set("estado", filters.estado);
    return params.toString();
  }, [filters]);

  useEffect(() => {
    let mounted = true;
    async function loadCatalogos() {
      try {
        const res = await fetch("/api/catalogos");
        if (!res.ok) throw new Error("No se pudieron cargar catalogos.");
        const data = (await res.json()) as CatalogosResponse;
        if (mounted) {
          setCatalogos(data);
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : "Error cargando catalogos");
        }
      }
    }

    loadCatalogos();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    async function loadItems() {
      try {
        setLoading(true);
        const res = await fetch(`/api/pqrs${queryString ? `?${queryString}` : ""}`);
        if (!res.ok) throw new Error("No se pudo cargar la lista.");
        const data = (await res.json()) as { items: PqrsItem[] };
        if (mounted) {
          setItems(data.items);
          setError(null);
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : "Error cargando solicitudes");
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadItems();
    return () => {
      mounted = false;
    };
  }, [queryString]);

  return (
    <section className="rounded-3xl bg-white/95 p-6 shadow-xl shadow-blue-200/40">
      <div className="grid gap-4 md:grid-cols-3">
        <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700">
          Sede
          <select
            value={filters.sedeId}
            onChange={(event) =>
              setFilters((prev) => ({ ...prev, sedeId: event.target.value }))
            }
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm"
          >
            <option value="">Todas</option>
            {catalogos?.sedes.map((sede) => (
              <option key={sede.id} value={sede.id}>
                {sede.nombre}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700">
          Planta
          <select
            value={filters.plantaId}
            onChange={(event) =>
              setFilters((prev) => ({ ...prev, plantaId: event.target.value }))
            }
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm"
          >
            <option value="">Todas</option>
            {catalogos?.plantas.map((planta) => (
              <option key={planta.id} value={planta.id}>
                {planta.nombre}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700">
          Estado
          <select
            value={filters.estado}
            onChange={(event) =>
              setFilters((prev) => ({ ...prev, estado: event.target.value }))
            }
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm"
          >
            <option value="">Pendientes</option>
            <option value="todos">Todos</option>
            <option value="abierto">Abierto</option>
            <option value="en_proceso">En proceso</option>
            <option value="cerrado">Cerrado</option>
          </select>
        </label>
      </div>

      {error ? (
        <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div className="mt-6 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="py-2">Caso</th>
              <th className="py-2">Sede</th>
              <th className="py-2">Planta</th>
              <th className="py-2">Tipo</th>
              <th className="py-2">Estado</th>
              <th className="py-2">Correo</th>
              <th className="py-2">Fecha</th>
              <th className="py-2"></th>
            </tr>
          </thead>
          <tbody className="text-slate-700">
            {loading ? (
              <tr>
                <td colSpan={8} className="py-6 text-center text-slate-500">
                  Cargando solicitudes...
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-6 text-center text-slate-500">
                  No hay solicitudes con estos filtros.
                </td>
              </tr>
            ) : (
              items.map((item) => (
                <tr key={item.id} className="border-t border-slate-100">
                  <td className="py-3 font-semibold text-slate-900">{item.caseNumber}</td>
                  <td className="py-3">{item.sede?.nombre}</td>
                  <td className="py-3">{item.planta?.nombre}</td>
                  <td className="py-3">{item.tipoReclamo?.nombre}</td>
                  <td className="py-3">
                    <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                      {estadoLabels[item.estado]}
                    </span>
                  </td>
                  <td className="py-3">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${emailStatusStyles[item.notificationEmailStatus]}`}
                    >
                      {emailStatusLabels[item.notificationEmailStatus]}
                    </span>
                  </td>
                  <td className="py-3">
                    {new Intl.DateTimeFormat("es-CO", {
                      dateStyle: "medium",
                    }).format(new Date(item.createdAt))}
                  </td>
                  <td className="py-3 text-right">
                    <Link
                      className="text-sm font-semibold text-blue-600 hover:text-blue-800"
                      href={`/admin/pqrs/${item.id}`}
                    >
                      Ver detalle
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
