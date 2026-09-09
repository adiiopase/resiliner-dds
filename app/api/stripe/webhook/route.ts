import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const signature = request.headers.get("stripe-signature");

  if (!secretKey || !webhookSecret || !serviceRoleKey || !signature) {
    return NextResponse.json(
      { error: "Configuration webhook Stripe incomplète sur le serveur." },
      { status: 400 }
    );
  }

  try {
    const stripe = new Stripe(secretKey);
    const body = await request.text();
    const event = stripe.webhooks.constructEvent(body, signature, webhookSecret);

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const invoiceId = session.metadata?.invoice_id;

      if (invoiceId) {
        const supabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          serviceRoleKey,
          { auth: { autoRefreshToken: false, persistSession: false } }
        );

        const { error } = await supabase
          .from("invoices")
          .update({
            status: "paid",
            updated_at: new Date().toISOString(),
          })
          .eq("id", invoiceId);

        if (error) {
          console.error("Erreur mise à jour facture payée", error);
          throw error;
        }
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Stripe webhook failed", error);
    return NextResponse.json(
      { error: "Signature ou événement Stripe invalide." },
      { status: 400 }
    );
  }
}
