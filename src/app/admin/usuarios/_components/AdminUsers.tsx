"use client";

import { useEffect, useState } from "react";

const DEFAULT_VISIBLE_PASSWORD = "12345678";

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

type CatalogoItem = {
  id: string;
  nombre: string;
};

export default function AdminUsers() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [sedes, setSedes] = useState<CatalogoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    username: "",
    nombre: "",
    password: "",
    role: "usuario" as "admin" | "usuario",
    sedeId: "",
  });

  const [resetTokens, setResetTokens] = useState<Record<string, string>>({});
  const [editingUser, setEditingUser] = useState<UserRow | null>(null);
  const [editForm, setEditForm] = useState({
    nombre: "",
    role: "usuario" as "admin" | "usuario",
    isActive: true,
    password: "",
  });
  const [showEditPassword, setShowEditPassword] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);

  async function loadUsers() {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/users");
      if (!res.ok) throw new Error("No se pudieron cargar los usuarios");
      const data = (await res.json()) as { users: UserRow[]; sedes: CatalogoItem[] };
      setUsers(data.users);
      setSedes(data.sedes ?? []);
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
          sedeId: form.sedeId || undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "No se pudo crear el usuario");
      }
      setForm({ username: "", nombre: "", password: "", role: "usuario", sedeId: "" });
      setIsCreateModalOpen(false);
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

  function openEditModal(user: UserRow) {
    setEditingUser(user);
    setEditForm({
      nombre: user.nombre ?? "",
      role: user.role,
      isActive: user.isActive,
      password: "",
    });
    setShowEditPassword(false);
  }

  async function handleSaveEdit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingUser) return;
    setSavingEdit(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/users/${editingUser.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: editForm.nombre || undefined,
          role: editForm.role,
          isActive: editForm.isActive,
          password: editForm.password || undefined,
        }),
      });
      if (!res.ok) throw new Error("No se pudo guardar el usuario");
      setEditingUser(null);
      await loadUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error guardando usuario");
    } finally {
      setSavingEdit(false);
    }
  }

  async function handleResetToken(user: UserRow) {
    try {
      const res = await fetch(`/api/admin/users/${user.id}/reset`, { method: "POST" });
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
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => setIsCreateModalOpen(true)}
          className="rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-blue-300/60 transition hover:bg-blue-700"
        >
          Crear usuario
        </button>
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
              <th className="py-2">Usuario</th>
              <th className="py-2">Nombre</th>
              <th className="py-2">Contraseña</th>
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
                <td colSpan={8} className="py-6 text-center text-slate-500">
                  Cargando usuarios...
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-6 text-center text-slate-500">
                  No hay usuarios aun.
                </td>
              </tr>
            ) : (
              users.map((user) => (
                <tr key={user.id} className="border-t border-slate-100">
                  <td className="py-3 font-semibold text-slate-900">{user.username}</td>
                  <td className="py-3">{user.nombre ?? "-"}</td>
                  <td className="py-3 font-mono text-xs text-slate-700">{DEFAULT_VISIBLE_PASSWORD}</td>
                  <td className="py-3">{user.sede?.nombre ?? "-"}</td>
                  <td className="py-3">{user.role === "admin" ? "Administrador" : "Usuario"}</td>
                  <td className="py-3">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        user.isActive ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {user.isActive ? "Activo" : "Inactivo"}
                    </span>
                  </td>
                  <td className="py-3 text-xs text-slate-500">
                    {new Intl.DateTimeFormat("es-CO", { dateStyle: "short" }).format(
                      new Date(user.createdAt),
                    )}
                  </td>
                  <td className="py-3 text-right">
                    <div className="flex flex-col items-end gap-2">
                      <button
                        type="button"
                        onClick={() => openEditModal(user)}
                        className="text-xs font-semibold text-blue-600 hover:text-blue-800"
                      >
                        Editar
                      </button>
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
                        <p className="max-w-xs text-right text-xs text-slate-500">{resetTokens[user.id]}</p>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {editingUser ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl">
            <h3 className="text-lg font-semibold text-slate-900">Editar usuario</h3>
            <p className="mt-1 text-xs text-slate-500">{editingUser.username}</p>

            <form onSubmit={handleSaveEdit} className="mt-4 flex flex-col gap-3">
              <label className="flex flex-col gap-1 text-sm font-semibold text-slate-700">
                Nombre
                <input
                  type="text"
                  value={editForm.nombre}
                  onChange={(event) =>
                    setEditForm((prev) => ({ ...prev, nombre: event.target.value }))
                  }
                  className="rounded-xl border border-slate-200 px-3 py-2 text-sm shadow-sm"
                />
              </label>

              <label className="flex flex-col gap-1 text-sm font-semibold text-slate-700">
                Rol
                <select
                  value={editForm.role}
                  onChange={(event) =>
                    setEditForm((prev) => ({
                      ...prev,
                      role: event.target.value as "admin" | "usuario",
                    }))
                  }
                  className="rounded-xl border border-slate-200 px-3 py-2 text-sm shadow-sm"
                >
                  <option value="usuario">Usuario</option>
                  <option value="admin">Administrador</option>
                </select>
              </label>

              <label className="flex flex-col gap-1 text-sm font-semibold text-slate-700">
                Contraseña actual
                <input
                  type="text"
                  value={DEFAULT_VISIBLE_PASSWORD}
                  readOnly
                  className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm shadow-sm"
                />
              </label>

              <label className="flex flex-col gap-1 text-sm font-semibold text-slate-700">
                Nueva contraseña
                <div className="flex items-center gap-2">
                  <input
                    type={showEditPassword ? "text" : "password"}
                    value={editForm.password}
                    onChange={(event) =>
                      setEditForm((prev) => ({ ...prev, password: event.target.value }))
                    }
                    placeholder="Dejar vacio para no cambiar"
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm shadow-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowEditPassword((prev) => !prev)}
                    className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700"
                  >
                    {showEditPassword ? "Ocultar" : "Mostrar"}
                  </button>
                </div>
                <span className="text-xs font-normal text-slate-500">
                  La contraseña actual no se puede mostrar porque solo se guarda en hash.
                </span>
              </label>

              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={editForm.isActive}
                  onChange={(event) =>
                    setEditForm((prev) => ({ ...prev, isActive: event.target.checked }))
                  }
                />
                Usuario activo
              </label>

              <div className="mt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:bg-blue-300"
                >
                  {savingEdit ? "Guardando..." : "Guardar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {isCreateModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-2xl">
            <h3 className="text-lg font-semibold text-slate-900">Crear usuario</h3>
            <form onSubmit={handleCreate} className="mt-4 grid gap-3 md:grid-cols-2">
              <label className="flex flex-col gap-1 text-sm font-semibold text-slate-700 md:col-span-2">
                Usuario
                <input
                  type="text"
                  value={form.username}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, username: event.target.value }))
                  }
                  className="rounded-xl border border-slate-200 px-3 py-2 text-sm shadow-sm"
                  required
                />
              </label>

              <label className="flex flex-col gap-1 text-sm font-semibold text-slate-700">
                Nombre
                <input
                  type="text"
                  value={form.nombre}
                  onChange={(event) => setForm((prev) => ({ ...prev, nombre: event.target.value }))}
                  className="rounded-xl border border-slate-200 px-3 py-2 text-sm shadow-sm"
                />
              </label>

              <label className="flex flex-col gap-1 text-sm font-semibold text-slate-700">
                Rol
                <select
                  value={form.role}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      role: event.target.value as "admin" | "usuario",
                    }))
                  }
                  className="rounded-xl border border-slate-200 px-3 py-2 text-sm shadow-sm"
                >
                  <option value="usuario">Usuario</option>
                  <option value="admin">Administrador</option>
                </select>
              </label>

              <label className="flex flex-col gap-1 text-sm font-semibold text-slate-700">
                Contraseña
                <input
                  type="password"
                  value={form.password}
                  onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
                  className="rounded-xl border border-slate-200 px-3 py-2 text-sm shadow-sm"
                  required
                />
              </label>

              <label className="flex flex-col gap-1 text-sm font-semibold text-slate-700">
                Sede vinculada
                <select
                  value={form.sedeId}
                  onChange={(event) => setForm((prev) => ({ ...prev, sedeId: event.target.value }))}
                  className="rounded-xl border border-slate-200 px-3 py-2 text-sm shadow-sm"
                >
                  <option value="">Sin sede</option>
                  {sedes.map((sede) => (
                    <option key={sede.id} value={sede.id}>
                      {sede.nombre}
                    </option>
                  ))}
                </select>
              </label>

              <div className="mt-2 flex justify-end gap-2 md:col-span-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:bg-blue-300"
                >
                  {creating ? "Creando..." : "Crear usuario"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </section>
  );
}

