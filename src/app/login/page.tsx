import { redirect } from "next/navigation";
import LoginForm from "./_components/LoginForm";
import { getSessionUser } from "@/lib/auth";

export default async function LoginPage() {
  const user = await getSessionUser();
  if (user) {
    redirect(user.role === "admin" ? "/admin/pqrs" : "/pqrs");
  }

  return (
    <div className="min-h-screen px-4 py-16">
      <div className="mx-auto flex w-full max-w-md flex-col gap-6 rounded-3xl bg-white/95 p-8 shadow-xl shadow-blue-200/40">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-500">
            Acceso
          </p>
          <h1 className="text-2xl font-semibold text-slate-900">Iniciar sesión</h1>
          <p className="text-sm text-slate-600">
            Ingresa tu usuario y contraseña para continuar.
          </p>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}
