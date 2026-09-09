import Stripe from "stripe";
import { NextResponse } from "next/server";

const priceByProduct: Record<string, string | undefined> = {
  ocr: process.env.STRIPE_PRICE_OCR,
  signature: process.env.STRIPE_PRICE_SIGNATURE,
  partage: process.env.STRIPE_PRICE_PARTAGE,
  comptabilite: process.env.STRIPE_PRICE_COMPTABILITE,
  classification: process.env.STRIPE_PRICE_CLASSIFICATION,
  cloud: process.env.STRIPE_PRICE_CLOUD,
  api: process.env.STRIPE_PRICE_API,
  "mobile-scan": process.env.STRIPE_PRICE_MOBILE_SCAN,
  "etaticiel-global": process.env.STRIPE_PRICE_ETATICIEL_GLOBAL,
  "etaticiel-naissance": process.env.STRIPE_PRICE_ETATICIEL_NAISSANCE,
  "etaticiel-deces": process.env.STRIPE_PRICE_ETATICIEL_DECES,
  "etaticiel-mariage": process.env.STRIPE_PRICE_ETATICIEL_MARIAGE,
};

export async function POST(request: Request) {
  const secretKey = process.env.STRIPE_SECRET_KEY;

  if (!secretKey) {
    return NextResponse.json(
      { error: "Stripe n'est pas encore configuré. Ajoutez STRIPE_SECRET_KEY dans .env.local." },
      { status: 503 }
    );
  }

  const { product } = await request.json();
  const priceId = priceByProduct[product];

  if (!priceId) {
    return NextResponse.json(
      { error: "Ce produit Stripe n'est pas encore configuré." },
      { status: 400 }
    );
  }

  try {
    const stripe = new Stripe(secretKey);
    const origin = request.headers.get("origin") ?? "http://localhost:3000";
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}/accounting?payment=success`,
      cancel_url: `${origin}/pricing?payment=cancelled`,
      billing_address_collection: "required",
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    if (error instanceof Stripe.errors.StripeError) {
      const isModeMismatch =
        error.code === "resource_missing" && error.message.includes("live mode");
      return NextResponse.json(
        {
          error: isModeMismatch
            ? "Ce prix Stripe est en mode live. Utilisez le prix du mode test avec une clé sk_test_..."
            : "Stripe a refusé le paiement. Vérifiez le produit et son prix.",
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Impossible de contacter Stripe pour le moment." },
      { status: 502 }
    );
  }
}
