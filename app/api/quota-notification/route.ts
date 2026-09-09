import { createServerClient } from "@supabase/ssr";
import nodemailer from "nodemailer";
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

  if (
    !process.env.SMTP_HOST ||
    !process.env.SMTP_USER ||
    !process.env.SMTP_PASSWORD
  ) {
    return NextResponse.json(
      { sent: false, error: "SMTP non configuré dans .env.local" },
      { status: 503 }
    );
  }

  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT ?? 587),
      secure: process.env.SMTP_SECURE === "true",
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD },
    });

    await transporter.sendMail({
      from: process.env.SMTP_FROM ?? process.env.SMTP_USER,
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
