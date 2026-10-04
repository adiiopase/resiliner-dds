import { createServerClient } from "@supabase/ssr";
import { Resend } from "resend";
import { NextResponse, type NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  const response = NextResponse.json({ sent: false });
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookies) =>
          cookies.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          ),
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    return NextResponse.json({ error: "Utilisateur non connecté" }, { status: 401 });
  }

  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json(
      { sent: false, error: "RESEND_API_KEY non configuré dans .env.local" },
      { status: 503 }
    );
  }

  try {
    const resend = new Resend(process.env.RESEND_API_KEY);

    await resend.emails.send({
      from: process.env.RESEND_FROM || "onboarding@resend.dev",
      to: user.email,
      subject: "Votre quota Digital Docs Solutions est atteint",
      text: "Votre quota de stockage est atteint. Aucun nouvel upload ne sera accepté pendant la période de blocage prévue.",
    });

    return NextResponse.json({ sent: true });
  } catch (error) {
    console.error("Erreur envoi notification quota", error);
    return NextResponse.json({ sent: false, error: "Erreur envoi email" }, { status: 500 });
  }
}
