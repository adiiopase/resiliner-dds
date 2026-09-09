import Stripe from "stripe";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function POST(request: Request) {
  const { invoiceId } = await request.json();
  if (!invoiceId) {
    return NextResponse.json({ error: "Facture introuvable." }, { status: 400 });
  }

  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll() {},
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Vous devez être connecté." }, { status: 401 });
  }

  const { data: invoice, error } = await supabase
    .from("invoices")
    .select("id, invoice_number, description, total_ttc_cents, amount_cents, amount_ht_cents, status")
    .eq("id", invoiceId)
    .eq("user_id", user.id)
    .single();

  if (error || !invoice) {
    return NextResponse.json({ error: "Cette facture est introuvable." }, { status: 404 });
  }
  if (invoice.status === "paid" || invoice.status === "cancelled") {
    return NextResponse.json({ error: "Cette facture ne peut plus être payée." }, { status: 400 });
  }

  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    return NextResponse.json({ error: "Stripe n'est pas configuré." }, { status: 503 });
  }

  try {
    const stripe = new Stripe(secretKey);
    const origin = request.headers.get("origin") ?? "http://localhost:3000";
    const amount = invoice.total_ttc_cents ?? invoice.amount_cents ?? ((invoice.amount_ht_cents ?? 0) * 1.2);

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "eur",
            product_data: { name: `Facture ${invoice.invoice_number}` },
            unit_amount: Math.round(amount),
          },
          quantity: 1,
        },
      ],
      metadata: { invoice_id: invoice.id },
      success_url: `${origin}/billing?payment=success&invoice=${invoice.id}`,
      cancel_url: `${origin}/billing?payment=cancelled&invoice=${invoice.id}`,
      billing_address_collection: "required",
    });

    return NextResponse.json({ url: session.url });
  } catch (checkoutError) {
    console.error("Invoice checkout failed", checkoutError);
    return NextResponse.json(
      { error: "Impossible de créer la session de paiement de cette facture." },
      { status: 502 }
    );
  }
}
