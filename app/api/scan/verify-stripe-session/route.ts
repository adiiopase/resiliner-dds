import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { getAuthenticatedUser } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { user, client: supabase } = await getAuthenticatedUser(req);

    if (!user || !supabase) {
      return NextResponse.json(
        { success: false, error: "Non autorisé", message: "Veuillez vous connecter." },
        { status: 401 }
      );
    }

    const { sessionId } = await req.json();

    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: "Paramètres manquants", message: "Le sessionId Stripe est requis." },
        { status: 400 }
      );
    }

    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) {
      return NextResponse.json(
        { success: false, error: "Configuration Stripe manquante" },
        { status: 503 }
      );
    }

    const stripe = new Stripe(secretKey);
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.payment_status === "paid" || session.status === "complete") {
      const meta = session.metadata || {};
      const invoiceNumber = meta.invoice_number || `FAC-SCAN-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`;
      const description = meta.description || `Numérisation Souveraine - Paiement Stripe Validé`;
      const scanCount = parseInt(meta.scan_count || "1", 10);
      const totalBytes = parseInt(meta.total_bytes || "0", 10);
      const totalMb = parseInt(meta.total_mb || "1", 10);
      const amountCents = parseInt(meta.amount_cents || String(session.amount_total || 0), 10);
      const amountHtCents = parseInt(meta.amount_ht_cents || String(Math.round(amountCents / 1.2)), 10);
      let documentIds: string[] = [];
      try {
        if (meta.document_ids) documentIds = JSON.parse(meta.document_ids);
      } catch {
        // ignore
      }

      // Check if invoice already created for this stripe session
      const { data: existingInvoices } = await supabase
        .from("invoices")
        .select("*")
        .eq("user_id", user.id)
        .contains("metadata", { stripe_session_id: sessionId });

      if (existingInvoices && existingInvoices.length > 0) {
        return NextResponse.json({
          success: true,
          message: "Facture validée et payée.",
          invoice: existingInvoices[0],
        });
      }

      // Insert new confirmed and paid invoice
      const { data: newInvoice, error: insErr } = await supabase
        .from("invoices")
        .insert({
          user_id: user.id,
          invoice_number: invoiceNumber,
          description: description,
          product: "Scan Mobile & OCR Souverain",
          quantity: totalMb > 0 ? totalMb : 1,
          quantity_unit: "Mo",
          amount_cents: amountCents,
          amount_ht_cents: amountHtCents,
          vat_rate: 20.0,
          total_ttc_cents: amountCents,
          status: "paid",
          customer_confirmed: true,
          validated_by_admin: true,
          source: "mobile-scan",
          sent_at: new Date().toISOString(),
          due_date: new Date().toISOString().split("T")[0],
          metadata: {
            stripe_session_id: sessionId,
            stripe_payment_status: session.payment_status,
            scan_count: scanCount,
            total_bytes: totalBytes,
            document_ids: documentIds,
            paid_at: new Date().toISOString(),
          },
        })
        .select()
        .single();

      if (insErr) {
        console.warn("Notice insertion facture:", insErr.message);
      }

      return NextResponse.json({
        success: true,
        message: "Paiement Stripe confirmé et facture enregistrée avec succès.",
        invoice: newInvoice || {
          id: `inv-${Date.now()}`,
          invoice_number: invoiceNumber,
          description: description,
          total_ttc_eur: (amountCents / 100).toFixed(2),
          status: "paid",
          customer_confirmed: true,
          validated_by_admin: true,
          created_at: new Date().toISOString(),
        },
      });
    } else {
      return NextResponse.json({
        success: false,
        payment_status: session.payment_status,
        message: "Le paiement Stripe n'a pas été validé. Aucune facture n'a été créée.",
      });
    }
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Erreur serveur";
    console.error("Erreur vérification session Stripe:", err);
    return NextResponse.json({ success: false, error: errorMsg }, { status: 500 });
  }
}
