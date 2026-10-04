"use client";

import { Suspense, useState, useEffect, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { fetchDynamicProducts, ProductItem, FALLBACK_PRODUCTS } from "@/lib/products";

function QuoteFormContent() {
  const searchParams = useSearchParams();
  const [productsCatalog, setProductsCatalog] = useState<ProductItem[]>(FALLBACK_PRODUCTS);
  const [company, setCompany] = useState("");
  const [service, setService] = useState(FALLBACK_PRODUCTS[0].name);
  const [quantity, setQuantity] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  // 1. Load dynamic products from Supabase products table
  useEffect(() => {
    async function loadData() {
      const prods = await fetchDynamicProducts();
      if (prods && prods.length > 0) {
        setProductsCatalog(prods);
      }

      // Pre-fill user company if logged in
      const { data: authData } = await supabase.auth.getUser();
      if (authData.user) {
        const meta = authData.user.user_metadata;
        if (meta?.company) setCompany(meta.company);
      }
    }
    void loadData();
  }, []);

  // 2. Preselect from query param ?product=...
  useEffect(() => {
    const productParam = searchParams.get("product");
    if (productParam && productsCatalog.length > 0) {
      const matched = productsCatalog.find(
        (p) =>
          p.id.toLowerCase() === productParam.toLowerCase() ||
          p.product_code.toLowerCase() === productParam.toLowerCase() ||
          p.name.toLowerCase().includes(productParam.toLowerCase())
      );
      if (matched) {
        setService(matched.name);
        setQuantity(String(matched.min_quantity));
      }
    }
  }, [searchParams, productsCatalog]);

  const selectedProductObj = productsCatalog.find((p) => p.name === service);
  const quantityUnit = selectedProductObj?.default_unit || "unités";

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
        quantity: Number(quantity) || 1,
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
        <h1 className="mt-2 text-3xl font-bold text-slate-900">Demande de devis sur mesure</h1>
        <p className="mt-2 text-slate-600">
          Sélectionnez le produit ou forfait souhaité ; nos ingénieurs d&apos;affaires vous répondront sous 24h ouvrées.
        </p>
      </div>

      <form onSubmit={submitQuote} className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm">
        <label className="block text-sm font-semibold text-slate-700">
          Nom de l&apos;entreprise ou Collectivité <span className="text-red-500">*</span>
          <input
            value={company}
            onChange={(event) => setCompany(event.target.value)}
            required
            placeholder="Ex: Mairie de Lyon, SAS Innovatech..."
            className="mt-2 w-full rounded-xl border border-slate-300 p-3 text-sm focus:border-blue-600 focus:outline-none"
          />
        </label>

        <label className="block text-sm font-semibold text-slate-700">
          Produit ou solution logicielle <span className="text-red-500">*</span>
          <select
            value={service}
            onChange={(event) => setService(event.target.value)}
            className="mt-2 w-full rounded-xl border border-slate-300 p-3 text-sm bg-white focus:border-blue-600 focus:outline-none"
          >
            {productsCatalog.map((prod) => (
              <option key={prod.id} value={prod.name}>
                {prod.name} — {prod.category} {prod.badge ? `(${prod.badge})` : ""}
              </option>
            ))}
          </select>
        </label>

        {selectedProductObj && (
          <div className="p-3 rounded-xl bg-blue-50/70 border border-blue-100 text-xs text-slate-600">
            <p className="font-semibold text-blue-900 mb-1">{selectedProductObj.description}</p>
            <p>
              Tarif indicatif : <strong>{selectedProductObj.price}</strong> • Unité : <strong>{selectedProductObj.default_unit}</strong>
            </p>
          </div>
        )}

        <label className="block text-sm font-semibold text-slate-700">
          Quantité ou volume estimé ({quantityUnit}) <span className="text-red-500">*</span>
          <input
            type="number"
            min="1"
            step="0.01"
            value={quantity}
            onChange={(event) => setQuantity(event.target.value)}
            required
            placeholder={`Ex: ${selectedProductObj?.min_quantity || 1} ${quantityUnit}`}
            className="mt-2 w-full rounded-xl border border-slate-300 p-3 text-sm focus:border-blue-600 focus:outline-none"
          />
        </label>

        <label className="block text-sm font-semibold text-slate-700">
          Précisions sur votre besoin et contraintes techniques
          <textarea
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            required
            rows={5}
            placeholder="Détaillez vos volumes prévisionnels, le nombre d'utilisateurs sur le terrain, ou l'ERP à interconnecter..."
            className="mt-2 w-full rounded-xl border border-slate-300 p-3 text-sm focus:border-blue-600 focus:outline-none"
          />
        </label>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-blue-700 py-3.5 text-sm font-bold text-white hover:bg-blue-800 shadow-md transition disabled:opacity-50"
        >
          {loading ? "Envoi de votre demande..." : "Envoyer la demande de devis"}
        </button>

        {status && (
          <div className={`text-xs p-4 rounded-xl border ${status.includes("Erreur") ? "bg-red-50 border-red-200 text-red-800" : "bg-emerald-50 border-emerald-200 text-emerald-900"}`}>
            {status}
          </div>
        )}
      </form>
    </div>
  );
}

export default function QuotePage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-500">Chargement...</div>}>
      <QuoteFormContent />
    </Suspense>
  );
}
