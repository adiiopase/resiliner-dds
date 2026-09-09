"use client";

export default function ProductActions() {
  return (
    <div className="mt-8 space-y-4">
      <div className="flex flex-wrap gap-3">
        <a
          href="/commande"
          className="rounded-lg bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-500 transition"
        >
          Commander
        </a>
        <a
          href="/devis"
          className="rounded-lg border border-blue-400 px-5 py-3 font-semibold text-blue-200 hover:bg-blue-900 transition"
        >
          Demander un devis
        </a>
        <a
          href="/pricing"
          className="rounded-lg border border-slate-600 px-5 py-3 font-semibold text-slate-300 hover:border-slate-400 transition"
        >
          Retour aux tarifs
        </a>
      </div>
    </div>
  );
}
