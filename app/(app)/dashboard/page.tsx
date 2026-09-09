"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type RecentDocument = {
  id: string;
  name: string;
  category: string;
  size_bytes: number;
  created_at: string;
  path: string;
};

export default function DashboardPage() {
  const [userEmail, setUserEmail] = useState<string>("");
  const [isManager, setIsManager] = useState<boolean>(false);
  const [documentCount, setDocumentCount] = useState<number>(0);
  const [recentDocuments, setRecentDocuments] = useState<RecentDocument[]>([]);
  const [orderCount, setOrderCount] = useState<number>(0);
  const [unpaidInvoicesCount, setUnpaidInvoicesCount] = useState<number>(0);
  const [quotaUsedBytes, setQuotaUsedBytes] = useState<number>(0);
  const [quotaLimitBytes, setQuotaLimitBytes] = useState<number>(2 * 1024 * 1024);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    async function loadDashboardData() {
      try {
        const { data: userData } = await supabase.auth.getUser();
        const managerStatus = userData?.user?.app_metadata?.role === "manager";
        if (userData?.user) {
          setUserEmail(userData.user.email ?? "");
          setIsManager(managerStatus);
        }

        // 1. Documents (Total et 5 derniers)
        const [{ count: docCount, data: recentDocs }, { data: quotaData }] =
          await Promise.all([
            supabase
              .from("documents")
              .select("id, name, category, size_bytes, created_at, path", { count: "exact" })
              .order("created_at", { ascending: false })
              .limit(5),
            supabase
              .from("user_quotas")
              .select("used_bytes, quota_limit_bytes")
              .single(),
          ]);

        setDocumentCount(docCount ?? 0);
        setRecentDocuments(recentDocs ?? []);

        if (quotaData) {
          setQuotaUsedBytes(quotaData.used_bytes || 0);
          setQuotaLimitBytes(quotaData.quota_limit_bytes || 2 * 1024 * 1024);
        }

        // 2. Commandes & Factures
        const [{ count: ordersTotal }, { count: unpaidInvTotal }] = await Promise.all([
          supabase.from("order_requests").select("id", { count: "exact", head: true }),
          supabase
            .from("invoices")
            .select("id", { count: "exact", head: true })
            .neq("status", "paid")
            .neq("status", "cancelled"),
        ]);

        setOrderCount(ordersTotal ?? 0);
        setUnpaidInvoicesCount(unpaidInvTotal ?? 0);
      } catch (err) {
        console.error("Erreur chargement dashboard", err);
      } finally {
        setLoading(false);
      }
    }

    void loadDashboardData();
  }, []);

  const quotaPercent = Math.min(
    100,
    Math.round((quotaUsedBytes / (quotaLimitBytes || 1)) * 100)
  );

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 Ko";
    const k = 1024;
    const sizes = ["Octets", "Ko", "Mo", "Go"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* 1. Header de bienvenue */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900 m-0">
              Tableau de bord
            </h1>
            <span
              className={`px-3 py-1 rounded-full text-xs font-semibold ${
                isManager
                  ? "bg-purple-100 text-purple-800 border border-purple-200"
                  : "bg-emerald-100 text-emerald-800 border border-emerald-200"
              }`}
            >
              {isManager ? "👑 Gestionnaire / Admin" : "👤 Espace Client"}
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-500 mb-0">
            {userEmail ? (
              <>Connecté en tant que <strong className="text-slate-700">{userEmail}</strong></>
            ) : (
              "Bienvenue sur votre espace Digital Docs Solutions"
            )}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <a
            href="/documents/upload"
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl shadow-sm text-decoration-none transition"
          >
            <span>📤</span> Téléverser un fichier
          </a>
          <a
            href="/commande"
            className="inline-flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-sm font-semibold px-4 py-2.5 rounded-xl border border-slate-300 text-decoration-none transition"
          >
            <span>📝</span> Nouveau bon
          </a>
        </div>
      </div>

      {/* 2. Cartes de Métriques Clés */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Carte Documents */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Documents
            </span>
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center text-xl font-bold">
              📄
            </div>
          </div>
          <div className="my-3">
            <p className="text-3xl font-extrabold text-slate-900 m-0">
              {loading ? "..." : documentCount}
            </p>
            <p className="text-xs text-slate-500 mt-1 mb-0">Fichiers indexés & sécurisés</p>
          </div>
          <a
            href="/documents"
            className="text-xs font-semibold text-blue-600 hover:text-blue-800 text-decoration-none inline-flex items-center gap-1 pt-2 border-t border-slate-100"
          >
            Consulter mes fichiers →
          </a>
        </div>

        {/* Carte Stockage & Quota */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Espace & Quota
            </span>
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center text-xl font-bold">
              💾
            </div>
          </div>
          <div className="my-2">
            <div className="flex items-baseline justify-between mb-1">
              <span className="text-2xl font-extrabold text-slate-900">
                {quotaPercent}%
              </span>
              <span className="text-xs text-slate-500">
                {formatBytes(quotaUsedBytes)} / {formatBytes(quotaLimitBytes)}
              </span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
              <div
                className={`h-2.5 rounded-full transition-all duration-500 ${
                  quotaPercent >= 90
                    ? "bg-red-500"
                    : quotaPercent >= 70
                    ? "bg-amber-500"
                    : "bg-blue-600"
                }`}
                style={{ width: `${Math.max(5, quotaPercent)}%` }}
              />
            </div>
          </div>
          <a
            href="/documents/upload"
            className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 text-decoration-none inline-flex items-center gap-1 pt-2 border-t border-slate-100"
          >
            Gérer mon espace →
          </a>
        </div>

        {/* Carte Bons de commande */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Commandes
            </span>
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center text-xl font-bold">
              📦
            </div>
          </div>
          <div className="my-3">
            <p className="text-3xl font-extrabold text-slate-900 m-0">
              {loading ? "..." : orderCount}
            </p>
            <p className="text-xs text-slate-500 mt-1 mb-0">Bons de commande enregistrés</p>
          </div>
          <a
            href="/commande"
            className="text-xs font-semibold text-amber-600 hover:text-amber-800 text-decoration-none inline-flex items-center gap-1 pt-2 border-t border-slate-100"
          >
            Suivre les commandes →
          </a>
        </div>

        {/* Carte Facturation (Admin ou Statut général) */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              {isManager ? "Facturation Globale" : "Services & Tarifs"}
            </span>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-xl font-bold">
              {isManager ? "💳" : "🏷️"}
            </div>
          </div>
          <div className="my-3">
            <p className="text-3xl font-extrabold text-slate-900 m-0">
              {loading
                ? "..."
                : isManager
                ? unpaidInvoicesCount === 0
                  ? "À jour"
                  : `${unpaidInvoicesCount} en attente`
                : "Actif"}
            </p>
            <p className="text-xs text-slate-500 mt-1 mb-0">
              {isManager
                ? unpaidInvoicesCount > 0
                  ? "Facture(s) à traiter"
                  : "Toutes factures réglées"
                : "Accès à l'ensemble des modules"}
            </p>
          </div>
          <a
            href={isManager ? "/billing" : "/pricing"}
            className="text-xs font-semibold text-emerald-600 hover:text-emerald-800 text-decoration-none inline-flex items-center gap-1 pt-2 border-t border-slate-100"
          >
            {isManager ? "Gérer la facturation →" : "Consulter les tarifs →"}
          </a>
        </div>
      </div>

      {/* 3. Section centrale : Derniers documents & Accès rapides */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Colonne gauche (2/3) : Documents récents */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900 m-0">Documents récents</h2>
              <p className="text-xs text-slate-500 m-0 mt-0.5">Vos 5 derniers fichiers traités</p>
            </div>
            <a
              href="/documents"
              className="text-xs font-bold text-blue-600 hover:text-blue-800 text-decoration-none"
            >
              Voir tout ({documentCount})
            </a>
          </div>

          {loading ? (
            <div className="py-12 text-center text-slate-400 text-sm">Chargement des documents...</div>
          ) : recentDocuments.length === 0 ? (
            <div className="py-12 text-center">
              <div className="text-4xl mb-3">📁</div>
              <p className="text-slate-700 font-semibold text-sm">Aucun document téléversé</p>
              <p className="text-slate-400 text-xs mt-1">
                Importez votre premier document pour tester l&apos;OCR et l&apos;archivage.
              </p>
              <a
                href="/documents/upload"
                className="inline-block mt-4 text-xs font-semibold bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-decoration-none transition"
              >
                + Ajouter un document
              </a>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="text-slate-400 text-xs border-b border-slate-100">
                    <th className="pb-3 font-semibold">Nom du document</th>
                    <th className="pb-3 font-semibold">Catégorie</th>
                    <th className="pb-3 font-semibold">Date</th>
                    <th className="pb-3 font-semibold text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recentDocuments.map((doc) => (
                    <tr key={doc.id} className="hover:bg-slate-50 transition">
                      <td className="py-3.5 pr-3">
                        <div className="flex items-center gap-2.5">
                          <span className="text-base">📄</span>
                          <span className="font-semibold text-slate-800 truncate max-w-[200px]" title={doc.name}>
                            {doc.name}
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 pr-3">
                        <span className="bg-slate-100 text-slate-700 text-xs px-2.5 py-1 rounded-md font-medium">
                          {doc.category || "Général"}
                        </span>
                      </td>
                      <td className="py-3.5 pr-3 text-xs text-slate-500 whitespace-nowrap">
                        {new Date(doc.created_at).toLocaleDateString("fr-FR")}
                      </td>
                      <td className="py-3.5 text-right whitespace-nowrap">
                        <a
                          href="/documents"
                          className="text-xs font-semibold text-blue-600 hover:text-blue-800 text-decoration-none"
                        >
                          Détails →
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Colonne droite (1/3) : Actions & Raccourcis */}
        <div className="space-y-6">
          {/* Bloc Raccourcis Métiers */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900 mb-4 pb-2 border-b border-slate-100 m-0">
              Services & Outils
            </h2>

            <div className="space-y-3 mt-3">
              <a
                href="/nos-produits"
                className="flex items-center justify-between p-3 rounded-xl border border-slate-100 hover:border-blue-300 hover:bg-blue-50/50 text-decoration-none transition group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-bold">
                    📦
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-800 group-hover:text-blue-700 m-0">
                      Catalogue Produits
                    </p>
                    <p className="text-[11px] text-slate-400 m-0">OCR, IA, Cloud & État civil</p>
                  </div>
                </div>
                <span className="text-slate-400 group-hover:text-blue-600 text-sm">→</span>
              </a>

              <a
                href="/pricing"
                className="flex items-center justify-between p-3 rounded-xl border border-slate-100 hover:border-blue-300 hover:bg-blue-50/50 text-decoration-none transition group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center text-sm font-bold">
                    🏷️
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-800 group-hover:text-emerald-700 m-0">
                      Grille Tarifaire
                    </p>
                    <p className="text-[11px] text-slate-400 m-0">Détail des coûts & licences</p>
                  </div>
                </div>
                <span className="text-slate-400 group-hover:text-emerald-600 text-sm">→</span>
              </a>

              <a
                href="/devis"
                className="flex items-center justify-between p-3 rounded-xl border border-slate-100 hover:border-blue-300 hover:bg-blue-50/50 text-decoration-none transition group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-600 flex items-center justify-center text-sm font-bold">
                    💬
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-800 group-hover:text-purple-700 m-0">
                      Demande de Devis
                    </p>
                    <p className="text-[11px] text-slate-400 m-0">Étude sur mesure de votre projet</p>
                  </div>
                </div>
                <span className="text-slate-400 group-hover:text-purple-600 text-sm">→</span>
              </a>

              <a
                href="/digital-docs"
                className="flex items-center justify-between p-3 rounded-xl border border-slate-100 hover:border-blue-300 hover:bg-blue-50/50 text-decoration-none transition group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center text-sm font-bold">
                    🚀
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-800 group-hover:text-amber-700 m-0">
                      DigitalDocsSolutions (ASP.NET)
                    </p>
                    <p className="text-[11px] text-slate-400 m-0">Application métier connectée</p>
                  </div>
                </div>
                <span className="text-slate-400 group-hover:text-amber-600 text-sm">→</span>
              </a>
            </div>
          </div>

          {/* Bloc Administration Gestionnaire — Centré, corrigé et stylisé */}
          {isManager && (
            <div
              className="rounded-2xl p-6 shadow-md text-white"
              style={{
                background: "linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%)",
                border: "1px solid rgba(255, 255, 255, 0.15)",
              }}
            >
              {/* En-tête centré */}
              <div className="text-center mb-4">
                <div
                  className="w-12 h-12 rounded-2xl mx-auto flex items-center justify-center text-2xl mb-2.5 shadow-sm"
                  style={{ background: "rgba(255, 255, 255, 0.12)" }}
                >
                  ⚙️
                </div>
                <h3
                  className="text-sm font-bold uppercase tracking-wider text-white m-0"
                  style={{ fontSize: "14px", letterSpacing: "0.08em" }}
                >
                  Administration
                </h3>
                <p className="text-xs text-blue-200 mt-1 mb-0 leading-relaxed max-w-xs mx-auto">
                  Modules réservés aux gestionnaires :
                </p>
              </div>

              {/* 3 Boutons d'action centrés et stylisés */}
              <div className="grid grid-cols-3 gap-2.5 mt-4">
                <a
                  href="/billing"
                  className="rounded-xl p-3 text-center transition flex flex-col items-center justify-center text-decoration-none group"
                  style={{
                    background: "rgba(255, 255, 255, 0.10)",
                    border: "1px solid rgba(255, 255, 255, 0.18)",
                    color: "#ffffff",
                  }}
                >
                  <span className="text-xl mb-1 group-hover:scale-110 transition-transform">💳</span>
                  <span className="text-[11px] font-semibold text-white tracking-tight">Facturation</span>
                </a>

                <a
                  href="/accounting"
                  className="rounded-xl p-3 text-center transition flex flex-col items-center justify-center text-decoration-none group"
                  style={{
                    background: "rgba(255, 255, 255, 0.10)",
                    border: "1px solid rgba(255, 255, 255, 0.18)",
                    color: "#ffffff",
                  }}
                >
                  <span className="text-xl mb-1 group-hover:scale-110 transition-transform">📊</span>
                  <span className="text-[11px] font-semibold text-white tracking-tight">Comptabilité</span>
                </a>

                <a
                  href="/users"
                  className="rounded-xl p-3 text-center transition flex flex-col items-center justify-center text-decoration-none group"
                  style={{
                    background: "rgba(255, 255, 255, 0.10)",
                    border: "1px solid rgba(255, 255, 255, 0.18)",
                    color: "#ffffff",
                  }}
                >
                  <span className="text-xl mb-1 group-hover:scale-110 transition-transform">👥</span>
                  <span className="text-[11px] font-semibold text-white tracking-tight">Utilisateurs</span>
                </a>
              </div>
            </div>
          )}

          {/* Bloc Support & Sécurité */}
          <div className="bg-blue-50/80 border border-blue-100 rounded-2xl p-5 text-slate-700">
            <h4 className="text-xs font-bold uppercase tracking-wider text-blue-900 mb-2 flex items-center gap-1.5 m-0">
              <span>🔒</span> Sécurité & Rétention
            </h4>
            <p className="text-xs text-slate-600 leading-relaxed m-0 mt-1">
              Vos documents sont chiffrés et sauvegardés conformément aux normes de confidentialité. Les fichiers temporaires sont purgés automatiquement selon vos quotas.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
