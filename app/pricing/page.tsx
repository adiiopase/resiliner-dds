"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { fetchDynamicProducts, ProductItem, FALLBACK_PRODUCTS } from "@/lib/products";

export default function PricingPage() {
  const [products, setProducts] = useState<ProductItem[]>(FALLBACK_PRODUCTS);

  useEffect(() => {
    async function loadProducts() {
      const data = await fetchDynamicProducts();
      if (data && data.length > 0) {
        setProducts(data);
      }
    }
    void loadProducts();
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 px-6 py-12">
      <div className="mx-auto max-w-6xl">
        <div className="flex items-center justify-between">
          <Link href="/" className="text-sm font-semibold text-blue-700 hover:underline">
            ← Retour au site Digital Docs Solutions
          </Link>
          <Link
            href="/dashboard"
            className="text-sm font-semibold text-slate-700 hover:text-blue-700"
          >
            Aller au Dashboard →
          </Link>
        </div>

        <div className="mt-10 max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">Tarifs et services</p>
          <h1 className="mt-2 text-4xl font-bold text-slate-900">
            Choisissez les services utiles à votre activité.
          </h1>
          <p className="mt-4 text-lg text-slate-600">
            Des prix simples et transparents, calculés selon votre consommation réelle ou par licences souveraines.
          </p>
        </div>

        <div className="mt-8 flex flex-wrap items-center gap-4">
          <Link
            href="/billing"
            className="rounded-xl bg-blue-700 px-5 py-3 font-semibold text-white hover:bg-blue-800 transition shadow-sm"
          >
            Voir mes factures
          </Link>
          <Link
            href="/commande"
            className="rounded-xl border border-blue-700 px-5 py-3 font-semibold text-blue-700 hover:bg-blue-50 transition"
          >
            Créer un bon de commande
          </Link>
        </div>

        <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {products.map((product) => (
            <article
              key={product.id}
              className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col justify-between hover:shadow-md transition"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-blue-600">
                    {product.category}
                  </span>
                  {product.badge && (
                    <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800">
                      {product.badge}
                    </span>
                  )}
                </div>

                <h2 className="mt-2 text-xl font-bold text-slate-900">{product.name}</h2>
                <p className="mt-3 text-2xl font-black text-blue-700">
                  {product.price}
                </p>
                <p className="mt-3 text-xs text-slate-600 leading-relaxed">{product.description}</p>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
                <Link
                  href={`/commande?product=${product.id}`}
                  className="font-semibold text-xs text-blue-700 hover:underline"
                >
                  Commander →
                </Link>
                <Link
                  href={`/devis?product=${product.id}`}
                  className="text-xs text-slate-500 hover:text-slate-900"
                >
                  Devis sur mesure
                </Link>
              </div>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}
