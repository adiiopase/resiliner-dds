"use client";

import { useEffect, useState, type FormEvent } from "react";
import { supabase } from "@/lib/supabaseClient";

type Invoice = {
  id: string;
  user_id: string;
  invoice_number: string;
  order_number: string | null;
  description: string;
  product: string | null;
  quantity: number | null;
  quantity_unit: string | null;
  amount_ht_cents?: number | null;
  amount_cents?: number;
  vat_rate: number;
  total_ttc_cents: number;
  status: "draft" | "sent" | "paid" | "cancelled";
  due_date: string | null;
};

type OrderRequest = {
  id: string;
  user_id: string;
  order_number: string | null;
  product: string;
  quantity: number;
  quantity_unit: string;
  status: "new" | "reviewing" | "confirmed" | "cancelled";
  author_confirmed: boolean;
};

const emptyForm = {
  user_id: "",
  invoice_number: "",
  orderNumber: "",
  description: "",
  product: "",
  quantity: "",
  quantityUnit: "",
  amountHt: "",
  vatRate: "20",
  due_date: "",
};

export default function AccountingPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [orders, setOrders] = useState<OrderRequest[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [, setSelectedOrderId] = useState<string | null>(null);
  const [status, setStatus] = useState("");

  async function loadData() {
    const [{ data: invData }, { data: ordData }] = await Promise.all([
      supabase
        .from("invoices")
        .select("*")
        .order("created_at", { ascending: false }),
      supabase
        .from("order_requests")
        .select("*")
        .order("created_at", { ascending: false }),
    ]);

    setInvoices(invData ?? []);
    setOrders(ordData ?? []);
  }

  useEffect(() => {
    void loadData();
  }, []);

  // async function saveInvoice(e: FormEvent<HTMLFormElement>) {
  //   e.preventDefault();
  //   setStatus("Enregistrement en cours...");

  //   const amountHtCents = Math.round(Number(form.amountHt) * 100);
  //   const vatRateNum = Number(form.vatRate);
  //   const totalTtcCents = Math.round(amountHtCents * (1 + vatRateNum / 100));

  //   const payload = {
  //     user_id: form.user_id,
  //     invoice_number: form.invoice_number,
  //     order_number: form.orderNumber || null,
  //     description: form.description,
  //     product: form.product || null,
  //     quantity: form.quantity ? Number(form.quantity) : null,
  //     quantity_unit: form.quantityUnit || null,
  //     amount_ht_cents: amountHtCents,
  //     vat_rate: vatRateNum,
  //     total_ttc_cents: totalTtcCents,
  //     due_date: form.due_date || null,
  //     status: "draft" as const,
  //   };

  //   if (editingId) {
  //     const { error } = await supabase
  //       .from("invoices")
  //       .update(payload)
  //       .eq("id", editingId);

  //     if (error) {
  //       setStatus(`Erreur modification : ${error.message}`);
  //       return;
  //     }
  //     setStatus("Facture modifiée avec succès.");
  //     setEditingId(null);
  //   } else {
  //     const { error } = await supabase.from("invoices").insert(payload);
  //     if (error) {
  //       setStatus(`Erreur création : ${error.message}`);
  //       return;
  //     }
  //     setStatus("Facture créée avec succès.");
  //   }

  //   setForm(emptyForm);
  //   await loadData();
  // }
  async function saveInvoice(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("Enregistrement en cours...");

    try {
      const quantity = Number(form.quantity);
      let amount_ht_cents = 0;
      let total_ttc_cents = 0;
      const vatRateNum = Number(form.vatRate);

      // Si produit OCR → calcul automatique depuis la table products
      if (form.product === "ocr_simple" || form.product === "ocr_complex") {
        const { data: product, error } = await supabase
          .from("products")
          .select("price_per_page_cents")
          .eq("product_code", form.product)
          .single();

        if (error || !product) {
          setStatus("Erreur : produit OCR introuvable.");
          return;
        }

        amount_ht_cents = product.price_per_page_cents * quantity;
        total_ttc_cents = Math.round(amount_ht_cents * (1 + vatRateNum / 100));
      } else {
        // Cas des autres produits (non OCR)
        amount_ht_cents = Math.round(Number(form.amountHt) * 100);
        total_ttc_cents = Math.round(amount_ht_cents * (1 + vatRateNum / 100));
      }

      const payload = {
        user_id: form.user_id,
        invoice_number: form.invoice_number,
        order_number: form.orderNumber || null,
        description: form.description,
        product: form.product || null,
        quantity: form.quantity ? Number(form.quantity) : null,
        quantity_unit: form.quantityUnit || null,
        amount_ht_cents,
        vat_rate: vatRateNum,
        total_ttc_cents,
        due_date: form.due_date || null,
        status: "draft" as const,
      };

      if (editingId) {
        const { error } = await supabase
          .from("invoices")
          .update(payload)
          .eq("id", editingId);

        if (error) {
          setStatus(`Erreur modification : ${error.message}`);
          return;
        }
        setStatus("Facture modifiée avec succès.");
        setEditingId(null);
      } else {
        const { error } = await supabase.from("invoices").insert(payload);
        if (error) {
          setStatus(`Erreur création : ${error.message}`);
          return;
        }
        setStatus("Facture créée avec succès.");
      }

      setForm(emptyForm);
      await loadData();
    } catch (err) {
      setStatus(`Erreur inattendue : ${err}`);
    }
  }

  async function validateOrder(orderId: string) {
    const { error } = await supabase
      .from("order_requests")
      .update({ status: "confirmed" })
      .eq("id", orderId);

    if (error) {
      setStatus(`Erreur validation commande : ${error.message}`);
      return;
    }
    setStatus("Bon de commande validé.");
    await loadData();
  }

  async function markAsSent(invoiceId: string) {
    const { error } = await supabase
      .from("invoices")
      .update({ status: "sent" })
      .eq("id", invoiceId);

    if (error) {
      setStatus(`Erreur envoi facture : ${error.message}`);
      return;
    }
    setStatus("Facture marquée comme envoyée.");
    await loadData();
  }

  function editInvoice(invoice: Invoice) {
    setEditingId(invoice.id);
    setForm({
      user_id: invoice.user_id,
      invoice_number: invoice.invoice_number,
      orderNumber: invoice.order_number ?? "",
      description: invoice.description,
      product: invoice.product ?? "",
      quantity: invoice.quantity?.toString() ?? "",
      quantityUnit: invoice.quantity_unit ?? "",
      amountHt: (
        ((invoice.amount_ht_cents ?? invoice.amount_cents ?? 0) / 100)
      ).toFixed(2),
      vatRate: invoice.vat_rate?.toString() ?? "20",
      due_date: invoice.due_date ?? "",
    });
  }

  function prepareInvoice(order: OrderRequest) {
    setSelectedOrderId(order.id);
    setEditingId(null);
    setForm({
      ...emptyForm,
      user_id: order.user_id,
      orderNumber: order.order_number ?? "BC-A-COMPLETER",
      description: `Commande ${order.product}`,
      product: order.product,
      quantity: order.quantity.toString(),
      quantityUnit: order.quantity_unit,
    });
    setStatus("Commande sélectionnée pour préparation de facture. Complétez le montant HT et la TVA.");
  }

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">Suivi financier</p>
        <h1 className="mt-2 text-3xl font-bold text-slate-900">Comptabilité et factures</h1>
        <p className="mt-2 text-slate-600">Créez, modifiez et suivez les factures des utilisateurs.</p>
      </div>

      <form
        onSubmit={saveInvoice}
        className="grid gap-4 rounded-xl border border-slate-200 bg-white p-6 md:grid-cols-2 shadow-sm"
      >
        <h2 className="text-xl font-bold text-slate-900 md:col-span-2">
          {editingId ? "Modifier la facture" : "Nouvelle facture"}
        </h2>

        <label className="text-sm font-semibold text-slate-700">
          Identifiant de l&apos;utilisateur
          <input
            value={form.user_id}
            onChange={(e) => setForm({ ...form, user_id: e.target.value })}
            required
            placeholder="UUID Supabase"
            className="mt-2 w-full rounded-lg border border-slate-300 p-3 text-sm"
          />
        </label>

        <label className="text-sm font-semibold text-slate-700">
          Numéro de facture
          <input
            value={form.invoice_number}
            onChange={(e) => setForm({ ...form, invoice_number: e.target.value })}
            required
            placeholder="DDS-2026-001"
            className="mt-2 w-full rounded-lg border border-slate-300 p-3 text-sm"
          />
        </label>

        <label className="text-sm font-semibold text-slate-700">
          Numéro du bon de commande
          <input
            value={form.orderNumber}
            onChange={(e) => setForm({ ...form, orderNumber: e.target.value })}
            placeholder="BC-2026-001"
            className="mt-2 w-full rounded-lg border border-slate-300 p-3 text-sm"
          />
        </label>

        <label className="text-sm font-semibold text-slate-700">
          Description
          <input
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            required
            className="mt-2 w-full rounded-lg border border-slate-300 p-3 text-sm"
          />
        </label>

        <label className="text-sm font-semibold text-slate-700">
          Produit commandé
          <input
            value={form.product}
            onChange={(e) => setForm({ ...form, product: e.target.value })}
            className="mt-2 w-full rounded-lg border border-slate-300 p-3 text-sm"
          />
        </label>

        <div className="grid grid-cols-2 gap-2">
          <label className="text-sm font-semibold text-slate-700">
            Quantité
            <input
              type="number"
              min="0.01"
              step="0.01"
              value={form.quantity}
              onChange={(e) => setForm({ ...form, quantity: e.target.value })}
              className="mt-2 w-full rounded-lg border border-slate-300 p-3 text-sm"
            />
          </label>

          <label className="text-sm font-semibold text-slate-700">
            Unité
            <input
              value={form.quantityUnit}
              onChange={(e) => setForm({ ...form, quantityUnit: e.target.value })}
              placeholder="pages, licences, Go..."
              className="mt-2 w-full rounded-lg border border-slate-300 p-3 text-sm"
            />
          </label>
        </div>

        <label className="text-sm font-semibold text-slate-700">
          Montant HT (€)
          <input
            type="number"
            min="0"
            step="0.01"
            value={form.amountHt}
            onChange={(e) => setForm({ ...form, amountHt: e.target.value })}
            required
            className="mt-2 w-full rounded-lg border border-slate-300 p-3 text-sm"
          />
        </label>

        <label className="text-sm font-semibold text-slate-700">
          Taux de TVA (%)
          <input
            type="number"
            min="0"
            max="100"
            step="0.01"
            value={form.vatRate}
            onChange={(e) => setForm({ ...form, vatRate: e.target.value })}
            required
            className="mt-2 w-full rounded-lg border border-slate-300 p-3 text-sm"
          />
        </label>

        <label className="text-sm font-semibold text-slate-700">
          Échéance
          <input
            type="date"
            value={form.due_date}
            onChange={(e) => setForm({ ...form, due_date: e.target.value })}
            className="mt-2 w-full rounded-lg border border-slate-300 p-3 text-sm"
          />
        </label>

        <div className="flex items-end gap-3 md:col-span-2 mt-2">
          <button
            type="submit"
            className="rounded-lg bg-blue-700 px-6 py-3 font-semibold text-white hover:bg-blue-800 transition"
          >
            {editingId ? "Enregistrer les modifications" : "Créer la facture"}
          </button>
          {editingId && (
            <button
              type="button"
              onClick={() => {
                setEditingId(null);
                setForm(emptyForm);
              }}
              className="rounded-lg border border-slate-300 px-5 py-3 font-semibold text-slate-700 hover:bg-slate-50 transition"
            >
              Annuler
            </button>
          )}
        </div>

        {status && <p className="text-sm text-slate-700 md:col-span-2 p-3 bg-slate-50 rounded">{status}</p>}
      </form>

      {/* Bons de commande */}
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-6">
        <h2 className="text-xl font-bold text-slate-900">Bons de commande en attente</h2>
        {orders.length === 0 ? (
          <p className="mt-3 text-slate-600">Aucun bon de commande enregistré.</p>
        ) : (
          <div className="mt-4 space-y-3">
            {orders.map((order) => (
              <div
                key={order.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-200 bg-white p-4 shadow-sm"
              >
                <div>
                  <p className="font-semibold text-slate-900">
                    {order.order_number ?? "Bon sans numéro"} — {order.product}
                  </p>
                  <p className="text-sm text-slate-600">
                    {order.quantity} {order.quantity_unit} — Client : {order.user_id}
                  </p>
                  <p
                    className={`mt-1 text-sm font-semibold ${order.status === "confirmed"
                        ? "text-emerald-700"
                        : order.status === "cancelled"
                          ? "text-red-700"
                          : "text-amber-700"
                      }`}
                  >
                    {order.status === "confirmed"
                      ? "Validée"
                      : order.author_confirmed
                        ? "Confirmée par le client, à valider"
                        : "En attente de confirmation du client"}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {order.status !== "confirmed" &&
                    order.status !== "cancelled" &&
                    order.author_confirmed && (
                      <button
                        type="button"
                        onClick={() => validateOrder(order.id)}
                        className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 transition"
                      >
                        Valider la commande
                      </button>
                    )}
                  {order.status === "confirmed" && (
                    <button
                      type="button"
                      onClick={() => prepareInvoice(order)}
                      className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800 transition"
                    >
                      Préparer la facture
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Factures existantes */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-bold text-slate-900">Factures enregistrées</h2>
        <div className="mt-5 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b bg-slate-50 text-slate-700">
                <th className="p-3">Numéro</th>
                <th className="p-3">Bon de commande</th>
                <th className="p-3">Produit</th>
                <th className="p-3">Quantité</th>
                <th className="p-3">Total TTC</th>
                <th className="p-3">TVA</th>
                <th className="p-3">Statut</th>
                <th className="p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((invoice) => (
                <tr key={invoice.id} className="border-b last:border-0 hover:bg-slate-50">
                  <td className="p-3 font-semibold text-slate-900">{invoice.invoice_number}</td>
                  <td className="p-3 text-emerald-700">{invoice.order_number ?? "—"}</td>
                  <td className="p-3">{invoice.product ?? invoice.description}</td>
                  <td className="p-3">
                    {invoice.quantity ? `${invoice.quantity} ${invoice.quantity_unit ?? ""}` : "-"}
                  </td>
                  <td className="p-3 font-semibold text-slate-900">
                    {((invoice.total_ttc_cents || 0) / 100).toFixed(2)} €
                  </td>
                  <td className="p-3">{invoice.vat_rate}%</td>
                  <td className="p-3">
                    <span
                      className={`rounded px-2 py-0.5 text-xs font-semibold ${invoice.status === "paid"
                          ? "bg-emerald-100 text-emerald-800"
                          : invoice.status === "sent"
                            ? "bg-blue-100 text-blue-800"
                            : "bg-slate-100 text-slate-800"
                        }`}
                    >
                      {invoice.status}
                    </span>
                  </td>
                  <td className="flex gap-3 p-3">
                    <button
                      onClick={() => editInvoice(invoice)}
                      className="font-semibold text-blue-700 hover:underline"
                    >
                      Modifier
                    </button>
                    {invoice.status === "draft" && (
                      <button
                        onClick={() => markAsSent(invoice.id)}
                        className="font-semibold text-emerald-700 hover:underline"
                      >
                        Envoyer
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
