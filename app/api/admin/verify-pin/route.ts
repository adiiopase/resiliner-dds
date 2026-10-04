import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/supabaseServer";
import {
  ADMIN_PIN_COOKIE,
  createAdminPinSessionToken,
  verifyConfiguredAdminPin,
} from "@/lib/adminPin";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const { user } = await getAuthenticatedUser(req);
  if (!user) {
    return NextResponse.json({ error: "Authentification requise." }, { status: 401 });
  }

  const email = user.email?.toLowerCase();
  const isAdmin = user.app_metadata?.role === "manager" ||
    email === "adiiopase@gmail.com" ||
    email === "adiopa@yahoo.fr";
  if (!isAdmin) {
    return NextResponse.json({ error: "Accès administrateur requis." }, { status: 403 });
  }

  if (!process.env.ADMIN_PIN) {
    return NextResponse.json(
      { error: "Le PIN administrateur doit être configuré côté serveur." },
      { status: 503 },
    );
  }

  const body = await req.json().catch(() => null) as { pin?: unknown } | null;
  const pin = typeof body?.pin === "string" ? body.pin : "";
  if (!verifyConfiguredAdminPin(pin)) {
    return NextResponse.json({ error: "Code PIN administrateur invalide." }, { status: 401 });
  }

  const token = createAdminPinSessionToken();
  if (!token) {
    return NextResponse.json(
      { error: "La signature de session administrateur n’est pas configurée." },
      { status: 503 },
    );
  }

  const response = NextResponse.json({ verified: true });
  response.cookies.set(ADMIN_PIN_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 4 * 60 * 60,
  });
  return response;
}
