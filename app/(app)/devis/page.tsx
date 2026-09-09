"use client";

import { useState, type FormEvent } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function QuotePage() {
  const [company, setCompany] = useState("");
  const [service, setService] = useState("OCR (Optical Character Recognition)");
  const [quantity, setQuantity] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  const quantityUnit =
    service.includes("OCR") || service.includes("Classification")
      ? "pages"
      : service.includes("ETATICIEL")
      ? "licences"
      : service.includes("Cloud")
      ? "Go"
      : "unités";

  async function submitQuote(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("Envoi en cours...");
    setLoading(true);

    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        setStatus("Vous devez être connecté pour envoyer une demande.");
        return;
      }

      const { error } = await supabase.from("quote_requests").insert({
        user_id: userData.user.id,
        company,
        service,
        quantity: Number(quantity),
        quantity_unit: quantityUnit,
        message,
      });

      setStatus(
        error
          ? `Erreur : ${error.message}`
          : "Votre demande de devis a bien été envoyée. Notre équipe commerciale vous contactera rapidement."
      );
      if (!error) {
        setCompany("");
        setQuantity("");
        setMessage("");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">Contact commercial</p>
        <h1 className="mt-2 text-3xl font-bold text-slate-900">Demande de devis</h1>
        <p className="mt-2 text-slate-600">Décrivez votre besoin ; notre équipe vous répondra avec une proposition adaptée.</p>
      </div>

      <form onSubmit={submitQuote} className="space-y-5 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <label className="block text-sm font-semibold text-slate-700">
          Entreprise
          <input
            value={company}
            onChange={(event) => setCompany(event.target.value)}
            required
            className="mt-2 w-full rounded-lg border border-slate-300 p-3 text-sm"
          />
        </label>

        <label className="block text-sm font-semibold text-slate-700">
          Produit ou service
          <select
            value={service}
            onChange={(event) => setService(event.target.value)}
            className="mt-2 w-full rounded-lg border border-slate-300 p-3 text-sm"
          >
            <option>OCR (Optical Character Recognition)</option>
            <option>Classification automatique de documents</option>
            <option>Cloud sécurisé</option>
            <option>API (Application Programming Interface)</option>
            <option>Application mobile de scan sur site</option>
            <option>Intégration ERP / CRM</option>
            <option>ETATICIEL GLOBAL</option>
            <option>ETATICIEL Naissance</option>
            <option>ETATICIEL Décès</option>
            <option>ETATICIEL Mariage</option>
          </select>
        </label>

        <label className="block text-sm font-semibold text-slate-700">
          Quantité ou volume ({quantityUnit})
          <input
            type="number"
            min="1"
            step="0.01"
            value={quantity}
            onChange={(event) => setQuantity(event.target.value)}
            required
            className="mt-2 w-full rounded-lg border border-slate-300 p-3 text-sm"
          />
        </label>

        <label className="block text-sm font-semibold text-slate-700">
          Votre besoin
          <textarea
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            required
            rows={5}
            className="mt-2 w-full rounded-lg border border-slate-300 p-3 text-sm"
          />
        </label>

        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-blue-700 px-5 py-3 font-semibold text-white hover:bg-blue-800 transition disabled:opacity-50"
        >
          {loading ? "Envoi..." : "Envoyer la demande"}
        </button>

        {status && <p className="text-sm text-slate-700 p-3 bg-slate-50 rounded">{status}</p>}
      </form>
    </div>
  );
}
