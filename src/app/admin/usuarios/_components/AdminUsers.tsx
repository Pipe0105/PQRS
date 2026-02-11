"use client";

import { useEffect, useState } from "react";

type UserRow = {
  id: string;
  username: string;
  nombre: string | null;
  sede?: { nombre: string } | null;
  role: "admin" | "usuario";
  isActive: boolean;
  createdAt: string;
  createdBy?: { username: string } | null;
};

export default function AdminUsers() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    username: "",
    nombre: "",
    password: "",
    role: "usuario",
  });
  const [resetTokens, setResetTokens] = useState<Record<string, string>>({});

  async function loadUsers() {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/users");
      if (!res.ok) throw new Error("No se pudieron cargar los usuarios");
      const data = (await res.json()) as { users: UserRow[] };
      setUsers(data.users);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error cargando usuarios");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadUsers();
  }, []);

  async function handleCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setCreating(true);
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: form.username,
          nombre: form.nombre || undefined,
          password: form.password,
          role: form.role,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "No se pudo crear el usuario");
      }
      setForm({ username: "", nombre: "", password: "", role: "usuario" });
      await loadUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al crear usuario");
    } finally {
      setCreating(false);
    }
  }

  async function handleToggleActive(user: UserRow) {
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: user.isActive ? "DELETE" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: user.isActive ? undefined : JSON.stringify({ isActive: true }),
      });
      if (!res.ok) throw new Error("No se pudo actualizar el usuario");
      await loadUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error actualizando usuario");
    }
  }

  async function handleRoleChange(user: UserRow, role: "admin" | "usuario") {
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      if (!res.ok) throw new Error("No se pudo actualizar el rol");
      await loadUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error actualizando rol");
    }
  }

  async function handleResetToken(user: UserRow) {
    try {
      const res = await fetch(`/api/admin/users/${user.id}/reset`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("No se pudo generar el token");
      const data = (await res.json()) as { token: string; expiresAt: string };
      setResetTokens((prev) => ({
        ...prev,
        [user.id]: `Token: ${data.token} (expira ${new Intl.DateTimeFormat("es-CO", {
          dateStyle: "short",
          timeStyle: "short",
        }).format(new Date(data.expiresAt))})`,
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error generando token");
    }
  }

  return (
    <section className="rounded-3xl bg-white/95 p-6 shadow-xl shadow-blue-200/40">
      <form onSubmit={handleCreate} className="grid gap-4 md:grid-cols-5">
        <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700">
          Usuario
          <input
            type="text"
            value={form.username}
            onChange={(event) => setForm((prev) => ({ ...prev, username: event.target.value }))}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm"
            required
          />
        </label>
        <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700">
          Nombre
          <input
            type="text"
            value={form.nombre}
            onChange={(event) => setForm((prev) => ({ ...prev, nombre: event.target.value }))}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm"
          />
        </label>
        <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700">
          Contraseña
          <input
            type="password"
            value={form.password}
            onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm"
            required
          />
        </label>
        <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700">
          Rol
          <select
            value={form.role}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, role: event.target.value }))
            }
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm"
          >
            <option value="usuario">Usuario</option>
            <option value="admin">Administrador</option>
          </select>
        </label>
        <div className="flex items-end">
          <button
            type="submit"
            disabled={creating}
            className="w-full rounded-full bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-300/60 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
          >
            {creating ? "Creando..." : "Crear usuario"}
          </button>
        </div>
      </form>

      {error ? (
        <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div className="mt-6 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="py-2">Usuario</th>
              <th className="py-2">Nombre</th>
              <th className="py-2">Sede</th>
              <th className="py-2">Rol</th>
              <th className="py-2">Estado</th>
              <th className="py-2">Creado</th>
              <th className="py-2"></th>
            </tr>
          </thead>
          <tbody className="text-slate-700">
            {loading ? (
              <tr>
                <td colSpan={7} className="py-6 text-center text-slate-500">
                  Cargando usuarios...
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-6 text-center text-slate-500">
                  No hay usuarios aún.
                </td>
              </tr>
            ) : (
              users.map((user) => (
                <tr key={user.id} className="border-t border-slate-100">
                  <td className="py-3 font-semibold text-slate-900">{user.username}</td>
                  <td className="py-3">{user.nombre ?? "-"}</td>
                  <td className="py-3">{user.sede?.nombre ?? "-"}</td>
                  <td className="py-3">
                    <select
                      value={user.role}
                      onChange={(event) =>
                        handleRoleChange(user, event.target.value as "admin" | "usuario")
                      }
                      className="rounded-xl border border-slate-200 bg-white px-2 py-1 text-xs shadow-sm"
                    >
                      <option value="usuario">Usuario</option>
                      <option value="admin">Administrador</option>
                    </select>
                  </td>
                  <td className="py-3">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        user.isActive
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {user.isActive ? "Activo" : "Inactivo"}
                    </span>
                  </td>
                  <td className="py-3 text-xs text-slate-500">
                    {new Intl.DateTimeFormat("es-CO", {
                      dateStyle: "short",
                    }).format(new Date(user.createdAt))}
                  </td>
                  <td className="py-3 text-right">
                    <div className="flex flex-col items-end gap-2">
                      <button
                        type="button"
                        onClick={() => handleResetToken(user)}
                        className="text-xs font-semibold text-blue-600 hover:text-blue-800"
                      >
                        Generar token
                      </button>
                      <button
                        type="button"
                        onClick={() => handleToggleActive(user)}
                        className="text-xs font-semibold text-slate-600 hover:text-slate-900"
                      >
                        {user.isActive ? "Desactivar" : "Activar"}
                      </button>
                      {resetTokens[user.id] ? (
                        <p className="max-w-xs text-right text-xs text-slate-500">
                          {resetTokens[user.id]}
                        </p>
                      ) : null}
                    </div>
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
