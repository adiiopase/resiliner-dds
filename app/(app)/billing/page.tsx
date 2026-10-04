"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type Invoice = {
  id: string;
  invoice_number: string;
  order_number: string | null;
  description: string;
  product: string | null;
  quantity: number | null;
  quantity_unit: string | null;
  amount_ht_cents: number | null;
  vat_rate: number;
  total_ttc_cents: number;
  status: "draft" | "sent" | "paid" | "cancelled";
  due_date: string | null;
  created_at: string;
  source?: string | null;
  customer_confirmed?: boolean;
  validated_by_admin?: boolean;
};

function statusLabel(status: Invoice["status"], validated?: boolean) {
  if (status === "paid") {
    return validated ? "✓ Validée & Payée" : "Payée";
  }
  if (status === "cancelled") return "Annulée";
  if (status === "draft") return "En cours";
  return "À régler";
}

function BillingContent() {
  const searchParams = useSearchParams();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [payingId, setPayingId] = useState<string | null>(null);
  const [hiddenIds, setHiddenIds] = useState<string[]>([]);
  const [isManager, setIsManager] = useState(false);
  const [message, setMessage] = useState("");

  const payment = searchParams.get("payment");
  const paymentMessage =
    payment === "success"
      ? "✓ Paiement Stripe validé avec succès ! Votre facture est confirmée et validée par l'administrateur."
      : payment === "cancelled"
      ? "Paiement abandonné. Vous pouvez réessayer directement depuis la liste de vos factures ci-dessous."
      : "";

  useEffect(() => {
    async function loadInvoices() {
      const { data: userData } = await supabase.auth.getUser();
      setIsManager(userData.user?.app_metadata?.role === "manager");

      const { data, error } = await supabase
        .from("invoices")
        .select(
          "id, invoice_number, order_number, description, product, quantity, quantity_unit, amount_ht_cents, vat_rate, total_ttc_cents, status, due_date, created_at, source, customer_confirmed, validated_by_admin"
        )
        .order("created_at", { ascending: false });

      if (error) setMessage(`Impossible de charger les factures : ${error.message}`);
      else setInvoices(data ?? []);
      setLoading(false);
    }

    void loadInvoices();
  }, [searchParams]);

  async function payInvoice(invoiceId: string) {
    setPayingId(invoiceId);
    setMessage("");
    try {
      const response = await fetch("/api/invoice-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invoiceId }),
      });
      const result = await response.json();
      if (!response.ok || !result.url) {
        setMessage(result.error ?? "Impossible de démarrer le paiement.");
        return;
      }
      window.location.assign(result.url);
    } catch {
      setMessage("Impossible de contacter le serveur de paiement.");
    } finally {
      setPayingId(null);
    }
  }

  function hidePaymentAction(invoiceId: string) {
    setHiddenIds((ids) => [...ids, invoiceId]);
    setMessage(
      "Le paiement a été masqué pour cette facture. Vous pourrez actualiser la page pour le retrouver."
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b pb-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-blue-600">Espace Financier Souverain</p>
          <h1 className="mt-1 text-2xl sm:text-3xl font-black text-slate-900 flex items-center gap-2">
            <span>💳</span> Mes Factures & Règlements
          </h1>
          <p className="mt-1 text-xs text-slate-500">
            Retrouvez l&apos;historique de vos factures, scans numériques et validation des paiements Stripe.
          </p>
        </div>
      </div>

      {(message || paymentMessage) && (
        <div
          className={`rounded-2xl p-4 text-xs font-semibold flex items-center gap-2 ${
            payment === "success"
              ? "bg-emerald-50 text-emerald-900 border border-emerald-200"
              : "bg-blue-50 text-blue-900 border border-blue-200"
          }`}
        >
          <span>{payment === "success" ? "✅" : "ℹ️"}</span>
          <span>{message || paymentMessage}</span>
        </div>
      )}

      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-xs text-slate-500">
          Chargement de vos factures en cours...
        </div>
      ) : invoices.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center space-y-3 shadow-sm">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-2xl text-slate-500">
            📄
          </div>
          <h2 className="text-lg font-bold text-slate-900">Aucune facture disponible</h2>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Vous n&apos;avez encore aucune facture émise. Vos scans et commandes apparaîtront automatiquement ici.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-3xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-left text-xs">
            <thead className="border-b bg-slate-50 text-slate-700 font-bold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="p-4">N° Facture</th>
                <th className="p-4">Désignation & Produit</th>
                <th className="p-4">Quantité / Volume</th>
                <th className="p-4">Total TTC</th>
                <th className="p-4">Date</th>
                <th className="p-4">Statut & Validation</th>
                <th className="p-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {invoices.map((invoice) => {
                const isPaid = invoice.status === "paid";
                const canPay =
                  !isManager &&
                  !isPaid &&
                  invoice.status !== "cancelled" &&
                  !hiddenIds.includes(invoice.id);

                return (
                  <tr key={invoice.id} className="hover:bg-slate-50/80 transition">
                    <td className="p-4 font-mono font-bold text-blue-700">
                      {invoice.invoice_number}
                      {invoice.source === "mobile-scan" && (
                        <span className="ml-2 inline-block rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-semibold text-blue-800">
                          Scan
                        </span>
                      )}
                    </td>
                    <td className="p-4 max-w-[240px]">
                      <p className="font-bold text-slate-900 truncate">
                        {invoice.product ?? invoice.description}
                      </p>
                      <p className="text-[11px] text-slate-500 truncate">{invoice.description}</p>
                    </td>
                    <td className="p-4 text-slate-700 font-medium">
                      {invoice.quantity ? `${invoice.quantity} ${invoice.quantity_unit ?? "Mo"}` : "1 unité"}
                    </td>
                    <td className="p-4 font-black text-slate-900 text-sm">
                      {((invoice.total_ttc_cents || 0) / 100).toFixed(2)} €
                    </td>
                    <td className="p-4 text-slate-500">
                      {new Date(invoice.created_at || invoice.due_date || Date.now()).toLocaleDateString("fr-FR")}
                    </td>
                    <td className="p-4">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold ${
                          isPaid
                            ? "bg-emerald-100 text-emerald-800"
                            : invoice.status === "cancelled"
                            ? "bg-red-100 text-red-800"
                            : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        <span>{isPaid ? "✓" : "⏳"}</span>
                        {statusLabel(invoice.status, invoice.validated_by_admin)}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      {canPay ? (
                        <div className="flex justify-end gap-1.5">
                          <button
                            onClick={() => payInvoice(invoice.id)}
                            disabled={payingId !== null}
                            className="rounded-xl bg-blue-700 px-3.5 py-2 text-xs font-bold text-white shadow-sm hover:bg-blue-800 disabled:opacity-60 transition"
                          >
                            {payingId === invoice.id ? "Stripe..." : "Payer (Stripe)"}
                          </button>
                          <button
                            onClick={() => hidePaymentAction(invoice.id)}
                            className="rounded-xl border border-slate-300 px-2.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
                          >
                            Masquer
                          </button>
                        </div>
                      ) : (
                        <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg">
                          Confirmée
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function BillingPage() {
  return (
    <Suspense fallback={<p className="text-slate-600 p-8 text-center text-xs">Chargement des factures...</p>}>
      <BillingContent />
    </Suspense>
  );
}
