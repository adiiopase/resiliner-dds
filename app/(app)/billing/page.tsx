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
};

function statusLabel(status: Invoice["status"]) {
  if (status === "paid") return "Payée";
  if (status === "cancelled") return "Annulée";
  if (status === "draft") return "En cours";
  return "Non payée";
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
      ? "Paiement transmis. La facture sera marquée comme payée après confirmation."
      : payment === "cancelled"
        ? "Paiement abandonné. Vous pourrez réessayer depuis cette facture."
        : "";

  useEffect(() => {
    async function loadInvoices() {
      const { data: userData } = await supabase.auth.getUser();
      setIsManager(userData.user?.app_metadata?.role === "manager");

      const { data, error } = await supabase
        .from("invoices")
        .select(
          "id, invoice_number, order_number, description, product, quantity, quantity_unit, amount_ht_cents, vat_rate, total_ttc_cents, status, due_date"
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
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">Espace client</p>
        <h1 className="mt-2 text-3xl font-bold text-slate-900">Mes factures</h1>
        <p className="mt-2 text-slate-600">Retrouvez vos factures et leur état de paiement.</p>
      </div>

      {(message || paymentMessage) && (
        <p className="rounded-lg bg-blue-50 p-4 text-sm text-blue-900">
          {message || paymentMessage}
        </p>
      )}

      {loading ? (
        <p className="text-slate-600">Chargement des factures...</p>
      ) : invoices.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center">
          <h2 className="text-xl font-bold text-slate-900">Aucune facture disponible</h2>
          <p className="mt-2 text-slate-600">Vous n&apos;avez encore aucune facture associée à votre compte.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="border-b bg-slate-50 text-slate-700">
              <tr>
                <th className="p-4">Facture</th>
                <th className="p-4">Bon de commande</th>
                <th className="p-4">Produit</th>
                <th className="p-4">Quantité</th>
                <th className="p-4">Total TTC</th>
                <th className="p-4">TVA</th>
                <th className="p-4">Échéance</th>
                <th className="p-4">Statut</th>
                <th className="p-4">Action</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((invoice) => {
                const canPay =
                  !isManager &&
                  invoice.status !== "paid" &&
                  invoice.status !== "cancelled" &&
                  !hiddenIds.includes(invoice.id);

                return (
                  <tr key={invoice.id} className="border-b last:border-0 hover:bg-slate-50">
                    <td className="p-4 font-semibold text-slate-900">{invoice.invoice_number}</td>
                    <td className="p-4 text-emerald-700">
                      {invoice.order_number ?? "Bon de commande"}
                    </td>
                    <td className="p-4">{invoice.product ?? invoice.description}</td>
                    <td className="p-4">
                      {invoice.quantity ? `${invoice.quantity} ${invoice.quantity_unit ?? ""}` : "-"}
                    </td>
                    <td className="p-4 font-semibold text-slate-900">
                      {((invoice.total_ttc_cents || 0) / 100).toFixed(2)} €
                    </td>
                    <td className="p-4">{invoice.vat_rate}%</td>
                    <td className="p-4">
                      {invoice.due_date ? new Date(invoice.due_date).toLocaleDateString("fr-FR") : "-"}
                    </td>
                    <td className="p-4">
                      <span
                        className={`rounded px-2 py-1 text-xs font-semibold ${invoice.status === "paid"
                            ? "bg-emerald-100 text-emerald-800"
                            : invoice.status === "cancelled"
                              ? "bg-red-100 text-red-800"
                              : "bg-amber-100 text-amber-800"
                          }`}
                      >
                        {statusLabel(invoice.status)}
                      </span>
                    </td>
                    <td className="p-4">
                      {canPay ? (
                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={() => payInvoice(invoice.id)}
                            disabled={payingId !== null}
                            className="rounded-lg bg-blue-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-800 disabled:opacity-60 transition"
                          >
                            {payingId === invoice.id ? "Ouverture..." : "Payer"}
                          </button>
                          <button
                            onClick={() => hidePaymentAction(invoice.id)}
                            className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
                          >
                            Masquer
                          </button>
                        </div>
                      ) : (
                        <span className="text-slate-400">—</span>
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
    <Suspense fallback={<p className="text-slate-600">Chargement des factures...</p>}>
      <BillingContent />
    </Suspense>
  );
}


