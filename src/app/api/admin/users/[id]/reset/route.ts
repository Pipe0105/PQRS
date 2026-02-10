import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createPasswordResetToken } from "@/lib/auth";
import { requireApiAdmin } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { user: admin, response } = await requireApiAdmin();
  if (response) return response;

  const { id } = await params;
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user || !user.isActive) {
    return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
  }

  const { token, expiresAt } = await createPasswordResetToken(user.id, admin?.id);
  return NextResponse.json({ token, expiresAt });
}
