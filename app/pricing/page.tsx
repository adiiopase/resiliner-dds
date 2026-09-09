"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function PricingPage() {
  const [products, setProducts] = useState<
    { product_code: string; name: string; description?: string; price?: string; price_per_page?: number }[]
  >([]);

  useEffect(() => {
    async function loadProducts() {
      const { data, error } = await supabase
        .from("products")
        .select("product_code, name, description, price, price_per_page");
      if (!error && data) {
        setProducts(data);
      }
    }
    loadProducts();
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 px-6 py-12">
      <div className="mx-auto max-w-6xl">
        <div className="flex items-center justify-between">
          <Link href="/" className="text-sm font-semibold text-blue-700 hover:underline">
            ← Retour au site Digital Docs Solutions
          </Link>
          <a
            href="/dashboard"
            className="text-sm font-semibold text-slate-700 hover:text-blue-700"
          >
            Aller au Dashboard →
          </a>
        </div>

        <div className="mt-10 max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">Tarifs et services</p>
          <h1 className="mt-2 text-4xl font-bold text-slate-900">
            Choisissez les services utiles à votre activité.
          </h1>
          <p className="mt-4 text-lg text-slate-600">
            Des prix simples, calculés selon votre consommation réelle. Les montants sont affichés TTC.
          </p>
        </div>

        <div className="mt-8 flex flex-wrap items-center gap-4">
          <a
            href="/billing"
            className="rounded-lg bg-blue-700 px-5 py-3 font-semibold text-white hover:bg-blue-800 transition"
          >
            Voir mes factures
          </a>
          <a
            href="/commande"
            className="rounded-lg border border-blue-700 px-5 py-3 font-semibold text-blue-700 hover:bg-blue-50 transition"
          >
            Créer un bon de commande
          </a>
        </div>

        <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {products.map((product) => (
            <article
              key={product.product_code}
              className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col justify-between"
            >
              <div>
                <h2 className="text-xl font-bold text-slate-900">{product.name}</h2>
                <p className="mt-4 text-2xl font-bold text-blue-700">
                  {product.price_per_page
                    ? `${product.price_per_page} € / page`
                    : product.price ?? "Prix à définir"}
                </p>
                <p className="mt-4 text-sm text-slate-600">{product.description}</p>
              </div>
              <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
                <a
                  href={`/products/${product.product_code}`}
                  className="font-semibold text-sm text-blue-700 hover:underline"
                >
                  Découvrir le service →
                </a>
                <a
                  href="/devis"
                  className="text-xs text-slate-500 hover:text-slate-900"
                >
                  Devis
                </a>
              </div>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}
