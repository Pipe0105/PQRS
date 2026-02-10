import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";

export async function requireApiUser() {
  const user = await getSessionUser();
  if (!user) {
    return {
      user: null,
      response: NextResponse.json({ error: "No autorizado" }, { status: 401 }),
    };
  }
  return { user, response: null };
}

export async function requireApiAdmin() {
  const { user, response } = await requireApiUser();
  if (response) return { user: null, response };
  if (user?.role !== "admin") {
    return {
      user: null,
      response: NextResponse.json({ error: "Acceso denegado" }, { status: 403 }),
    };
  }
  return { user, response: null };
}
