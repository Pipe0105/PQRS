"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginForm() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      if (!res.ok) {
        throw new Error("Credenciales inválidas");
      }

      const data = (await res.json()) as {
        user: { role: "admin" | "usuario" };
      };
      router.push(data.user.role === "admin" ? "/admin/pqrs" : "/pqrs");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al iniciar sesión");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700">
        Usuario
        <input
          type="text"
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm"
        />
      </label>
      <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700">
        Contraseña
        <input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm"
        />
      </label>

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={loading}
        className="inline-flex items-center justify-center rounded-full bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-300/60 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
      >
        {loading ? "Ingresando..." : "Ingresar"}
      </button>

      <a href="/reset-password" className="text-xs font-semibold text-blue-600">
        ¿Olvidaste tu contraseña?
      </a>
    </form>
  );
}
