"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { fetchDynamicProducts, ProductItem, FALLBACK_PRODUCTS } from "@/lib/products";

export default function NosProduitsPage() {
  const [products, setProducts] = useState<ProductItem[]>(FALLBACK_PRODUCTS);
  const [activeCategory, setActiveCategory] = useState<string>("all");

  useEffect(() => {
    async function loadData() {
      const dynamicList = await fetchDynamicProducts();
      if (dynamicList && dynamicList.length > 0) {
        setProducts(dynamicList);
      }
    }
    void loadData();
  }, []);

  const categories = ["all", ...Array.from(new Set(products.map((p) => p.category)))];

  const filteredProducts = products.filter((p) => {
    if (activeCategory === "all") return true;
    return p.category === activeCategory;
  });

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">Notre offre souveraine</p>
        <h1 className="mt-2 text-3xl font-bold text-slate-900">Nos produits & solutions</h1>
        <p className="mt-2 max-w-2xl text-slate-600">
          Une suite complète et intégrée : scan mobile, stockage souverain chiffré, OCR, IA de classification, état civil et API REST.
        </p>
      </div>

      {/* Highlight Mobile & API Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 p-6 text-white shadow-md flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="space-y-1">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-500/30 px-3 py-1 text-xs font-semibold text-blue-200">
            <span>📱</span> Nouveauté Mobile-First
          </span>
          <h2 className="text-xl font-bold">Studio de Scan Mobile & Forfaits Stockage</h2>
          <p className="text-xs text-slate-300 max-w-xl">
            Numérisez vos documents papier en mobilité depuis smartphone avec nos filtres OCR et dépassement de quota autorisé.
          </p>
        </div>
        <div className="flex flex-wrap gap-2.5">
          <Link
            href="/documents/scan"
            className="rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-blue-500 transition shadow-sm"
          >
            Tester le Scanner Mobile →
          </Link>
          <Link
            href="/api-docs"
            className="rounded-xl bg-white/10 px-4 py-2.5 text-xs font-bold text-white hover:bg-white/20 transition backdrop-blur-sm"
          >
            Documentation API REST
          </Link>
        </div>
      </div>

      {/* Category Tabs Filter */}
      <div className="flex flex-wrap gap-2">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`rounded-xl px-4 py-2 text-xs font-semibold transition ${
              activeCategory === cat
                ? "bg-blue-700 text-white shadow-sm"
                : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
            }`}
          >
            {cat === "all" ? "Tous les produits" : cat}
          </button>
        ))}
      </div>

      {/* Product Cards Grid */}
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {filteredProducts.map((product) => (
          <article
            key={product.id}
            className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col justify-between hover:shadow-md transition"
          >
            <div>
              <div className="flex items-start justify-between gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600">
                  {product.category}
                </span>
                {product.badge && (
                  <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800">
                    {product.badge}
                  </span>
                )}
              </div>

              <h2 className="mt-2 text-xl font-bold text-slate-900">{product.name}</h2>
              <p className="mt-2 font-bold text-blue-700 text-sm">{product.price}</p>
              <p className="mt-3 text-slate-600 text-xs leading-relaxed">{product.description}</p>

              {product.details && product.details.length > 0 && (
                <ul className="mt-4 space-y-1.5 text-xs text-slate-700">
                  {product.details.map((detail, idx) => (
                    <li key={idx} className="flex items-center gap-2">
                      <span className="text-blue-600 font-bold">✓</span> {detail}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
              {product.id === "mobile-scan" ? (
                <Link href="/documents/scan" className="text-xs font-bold text-blue-700 hover:underline">
                  Ouvrir le scanner →
                </Link>
              ) : product.id === "api" ? (
                <Link href="/api-docs" className="text-xs font-bold text-blue-700 hover:underline">
                  Voir l&apos;API REST →
                </Link>
              ) : (
                <Link
                  href={`/commande?product=${product.id}`}
                  className="text-xs font-bold text-blue-700 hover:underline"
                >
                  Commander ce produit →
                </Link>
              )}
              <Link
                href={`/devis?product=${product.id}`}
                className="text-xs font-medium text-slate-500 hover:text-slate-900"
              >
                Devis sur mesure
              </Link>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
