"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { calculateStoragePrice, STORAGE_PRICING } from "@/lib/products";

type RecentDocument = {
  id: string;
  name: string;
  category: string;
  size_bytes: number;
  created_at: string;
  path?: string | null;
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

  // Interactive Payment / License Modal State
  const [showPaymentModal, setShowPaymentModal] = useState<boolean>(false);
  const [selectedPlan, setSelectedPlan] = useState<"per-mb" | "monthly" | "yearly">("monthly");

  // Document Preview Modal State
  const [previewDoc, setPreviewDoc] = useState<{ doc: RecentDocument; url: string } | null>(null);
  const [loadingActionId, setLoadingActionId] = useState<string | null>(null);

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

  // Storage pricing calculation
  const storageInfo = calculateStoragePrice(quotaUsedBytes);
  const quotaPercent = Math.min(
    100,
    Math.round((quotaUsedBytes / (quotaLimitBytes || 1)) * 100)
  );

  // Helper storage path
  function getStoragePath(path?: string | null) {
    if (!path) return null;
    if (!path.startsWith("http://") && !path.startsWith("https://")) return path;
    try {
      const url = new URL(path);
      const publicPath = "/storage/v1/object/public/documents/";
      const pathIndex = url.pathname.indexOf(publicPath);
      if (pathIndex === -1) return null;
      return decodeURIComponent(url.pathname.slice(pathIndex + publicPath.length));
    } catch {
      return path;
    }
  }

  // Get signed URL for preview or download
  async function getSignedUrl(path?: string | null, downloadName?: string) {
    if (!path) return null;
    const storagePath = getStoragePath(path);
    if (!storagePath) return null;

    const { data, error } = await supabase.storage
      .from("documents")
      .createSignedUrl(storagePath, 60 * 15, downloadName ? { download: downloadName } : undefined);

    if (error || !data?.signedUrl) return null;
    return data.signedUrl;
  }

  // Preview Action
  async function handlePreview(doc: RecentDocument) {
    setLoadingActionId(doc.id);
    const signedUrl = await getSignedUrl(doc.path);
    setLoadingActionId(null);
    if (signedUrl) {
      setPreviewDoc({ doc, url: signedUrl });
    }
  }

  // Download Action
  async function handleDownload(doc: RecentDocument) {
    setLoadingActionId(doc.id);
    const signedUrl = await getSignedUrl(doc.path, doc.name);
    setLoadingActionId(null);
    if (signedUrl) {
      const link = document.createElement("a");
      link.href = signedUrl;
      link.download = doc.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }

  // Delete Action
  async function handleDelete(id: string) {
    if (!confirm("Voulez-vous supprimer ce document et libérer immédiatement le quota ?")) return;

    setLoadingActionId(id);
    try {
      const res = await fetch(`/api/documents/${id}`, { method: "DELETE" });
      if (res.ok) {
        setRecentDocuments((docs) => docs.filter((d) => d.id !== id));
        setDocumentCount((c) => Math.max(0, c - 1));

        // Reload quota
        const { data: qData } = await supabase
          .from("user_quotas")
          .select("used_bytes, quota_limit_bytes")
          .single();
        if (qData) {
          setQuotaUsedBytes(qData.used_bytes || 0);
          setQuotaLimitBytes(qData.quota_limit_bytes || 2 * 1024 * 1024);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingActionId(null);
    }
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* 1. Header de bienvenue & Actions rapides de scan */}
      <div className="bg-white p-6 sm:p-7 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
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

        {/* Action Buttons: Scan Mobile, Studio OCR, Upload, New Order */}
        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            href="/documents/scan"
            className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs sm:text-sm font-bold px-4 py-2.5 rounded-xl shadow-md transition"
          >
            <span>📱</span> Scanner depuis mon téléphone
          </Link>
          <Link
            href="/documents/ocr"
            className="inline-flex items-center gap-1.5 bg-blue-50 border border-blue-300 hover:bg-blue-100 text-blue-800 text-xs sm:text-sm font-bold px-3.5 py-2.5 rounded-xl transition shadow-sm"
          >
            <span>🔍</span> Studio OCR & Extraction
          </Link>
          <Link
            href="/documents/upload"
            className="inline-flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs sm:text-sm font-semibold px-3.5 py-2.5 rounded-xl transition"
          >
            <span>📤</span> Téléverser
          </Link>
          <button
            onClick={() => setShowPaymentModal(true)}
            className="inline-flex items-center gap-1.5 bg-emerald-50 border border-emerald-300 hover:bg-emerald-100 text-emerald-800 text-xs sm:text-sm font-bold px-3.5 py-2.5 rounded-xl transition"
          >
            <span>💳</span> Forfaits & Licences
          </button>
        </div>
      </div>

      {/* 2. Hero Banner: Direct Mobile Scan & Storage Pricing */}
      <div className="grid gap-5 md:grid-cols-3">
        {/* Banner 1: Mobile Scan Hub */}
        <div className="md:col-span-2 rounded-2xl bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950 p-6 text-white shadow-md flex flex-col justify-between space-y-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-500/30 px-3 py-0.5 text-xs font-semibold text-blue-200 backdrop-blur-sm">
                <span className="h-2 w-2 rounded-full bg-blue-400 animate-pulse"></span>
                Brique Mobile-First Active
              </span>
              <span className="rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-300">
                OCR Souverain 🇫🇷
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black">
              Numérisez instantanément vos documents en mobilité
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 max-w-xl leading-relaxed">
              Utilisez la caméra de votre smartphone pour capturer, recadrer, appliquer nos filtres haute netteté OCR et envoyer vos scans directement dans votre base documentaire.
            </p>
          </div>

          <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-slate-800">
            <div className="text-xs text-blue-300 flex items-center gap-1.5">
              <span>💡</span>
              <span>
                <strong>Avantage Scan :</strong> Seuls les scans mobiles sont autorisés à dépasser les 2 Mo.
              </span>
            </div>

            <div className="flex gap-2">
              <Link
                href="/documents/scan"
                className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-500 shadow-sm transition"
              >
                📸 Ouvrir le Scanner Mobile →
              </Link>
            </div>
          </div>
        </div>

        {/* Banner 2: Storage Pricing & Usage Meter */}
        <div className="rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50/60 p-6 shadow-sm flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-blue-900">
                Stockage Souverain
              </span>
              <span className="rounded-lg bg-blue-200/80 px-2.5 py-0.5 text-xs font-bold text-blue-900">
                {STORAGE_PRICING.PRICE_PER_MB.toFixed(2)} € / Mo
              </span>
            </div>

            <div className="mt-4">
              <div className="flex justify-between items-baseline text-xs font-semibold text-slate-700 mb-1">
                <span>Espace consommé :</span>
                <span className="text-sm font-bold text-blue-800">
                  {storageInfo.usedMb} Mo / {(quotaLimitBytes / 1048576).toFixed(0)} Mo
                </span>
              </div>
              <div className="h-2.5 w-full rounded-full bg-blue-200/70 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    storageInfo.isExceeded
                      ? "bg-amber-500"
                      : quotaPercent > 80
                      ? "bg-red-500"
                      : "bg-blue-600"
                  }`}
                  style={{ width: `${Math.min(quotaPercent, 100)}%` }}
                ></div>
              </div>
            </div>

            <div className="mt-3 p-3 rounded-xl bg-white/80 border border-blue-100 text-xs space-y-1">
              <div className="flex justify-between text-slate-600">
                <span>Coût réel à l&apos;usage :</span>
                <strong className="text-slate-900">{storageInfo.totalCostTtc.toFixed(2)} € TTC</strong>
              </div>
              {storageInfo.isExceeded && (
                <div className="flex justify-between text-amber-800 font-medium">
                  <span>Dépassement scan ({storageInfo.excessMb} Mo) :</span>
                  <strong>+{storageInfo.excessCostTtc.toFixed(2)} €</strong>
                </div>
              )}
            </div>
          </div>

          <button
            onClick={() => setShowPaymentModal(true)}
            className="w-full rounded-xl bg-blue-700 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-blue-800 transition"
          >
            💳 Payer ou Souscrire une Licence →
          </button>
        </div>
      </div>

      {/* 3. Cartes de Métriques Clés */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Carte Documents */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Documents & Scans
            </span>
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center text-xl font-bold">
              📁
            </div>
          </div>
          <div className="my-3">
            <p className="text-3xl font-extrabold text-slate-900 m-0">
              {loading ? "..." : documentCount}
            </p>
            <p className="text-xs text-slate-500 mt-1 mb-0">Documents & scans indexés</p>
          </div>
          <Link
            href="/documents"
            className="text-xs font-semibold text-blue-600 hover:text-blue-800 inline-flex items-center gap-1 pt-2 border-t border-slate-100"
          >
            Consulter mes documents →
          </Link>
        </div>

        {/* Carte Tarification Stockage */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Tarif / Mo Consommé
            </span>
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center text-xl font-bold">
              💶
            </div>
          </div>
          <div className="my-3">
            <p className="text-3xl font-extrabold text-slate-900 m-0">
              0,10 €
            </p>
            <p className="text-xs text-slate-500 mt-1 mb-0">Par Mo occupé • Facturation réelle</p>
          </div>
          <button
            onClick={() => setShowPaymentModal(true)}
            className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 text-left pt-2 border-t border-slate-100"
          >
            Voir les forfaits & licences →
          </button>
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
          <Link
            href="/commande"
            className="text-xs font-semibold text-amber-600 hover:text-amber-800 inline-flex items-center gap-1 pt-2 border-t border-slate-100"
          >
            Nouveau bon de commande →
          </Link>
        </div>

        {/* Carte Facturation & API */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              {isManager ? "Facturation Globale" : "API & Services"}
            </span>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-xl font-bold">
              {isManager ? "💳" : "⚡"}
            </div>
          </div>
          <div className="my-3">
            <p className="text-3xl font-extrabold text-slate-900 m-0">
              {loading ? "..." : isManager ? (unpaidInvoicesCount === 0 ? "À jour" : `${unpaidInvoicesCount} att.`) : "API REST"}
            </p>
            <p className="text-xs text-slate-500 mt-1 mb-0">
              {isManager ? "Factures à traiter" : "Endpoints souverains actifs"}
            </p>
          </div>
          <Link
            href={isManager ? "/billing" : "/api-docs"}
            className="text-xs font-semibold text-emerald-600 hover:text-emerald-800 inline-flex items-center gap-1 pt-2 border-t border-slate-100"
          >
            {isManager ? "Gérer la facturation →" : "Documentation API →"}
          </Link>
        </div>
      </div>

      {/* 4. Section Documents Récents avec Visualiser, Télécharger, Supprimer */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Colonne gauche (2/3) : Documents récents */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900 m-0">Documents & Scans récents</h2>
              <p className="text-xs text-slate-500 m-0 mt-0.5">
                Visualisez, téléchargez ou supprimez vos scans
              </p>
            </div>
            <Link
              href="/documents"
              className="text-xs font-bold text-blue-600 hover:text-blue-800"
            >
              Voir tout ({documentCount}) →
            </Link>
          </div>

          {loading ? (
            <div className="py-12 text-center text-slate-400 text-sm">Chargement des documents...</div>
          ) : recentDocuments.length === 0 ? (
            <div className="py-12 text-center space-y-3">
              <div className="text-4xl">📱</div>
              <p className="text-slate-700 font-semibold text-sm">Aucun document pour le moment</p>
              <p className="text-slate-400 text-xs max-w-sm mx-auto">
                Scannez votre premier document depuis votre smartphone ou téléversez un fichier pour tester l&apos;OCR souverain.
              </p>
              <div className="pt-2 flex justify-center gap-2">
                <Link
                  href="/documents/scan"
                  className="text-xs font-bold bg-blue-600 text-white px-4 py-2 rounded-xl hover:bg-blue-700 transition shadow-sm"
                >
                  📸 Scanner maintenant
                </Link>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="text-slate-400 border-b border-slate-100 uppercase tracking-wider font-semibold">
                    <th className="pb-3">Document</th>
                    <th className="pb-3">Catégorie</th>
                    <th className="pb-3">Taille</th>
                    <th className="pb-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recentDocuments.map((doc) => {
                    const isScan =
                      (doc.name || "").toLowerCase().startsWith("scan") ||
                      Boolean(doc.path && doc.path.includes("scan-mobile"));
                    const isBusy = loadingActionId === doc.id;

                    return (
                      <tr key={doc.id} className="hover:bg-slate-50 transition">
                        <td className="py-3.5 pr-2">
                          <div className="flex items-center gap-2.5">
                            <span className="text-base">{isScan ? "📱" : "📄"}</span>
                            <div>
                              <p className="font-semibold text-slate-800 truncate max-w-[180px]" title={doc.name}>
                                {doc.name}
                              </p>
                              <p className="text-[10px] text-slate-400">
                                {new Date(doc.created_at).toLocaleDateString("fr-FR")}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 pr-2">
                          <span className="bg-slate-100 text-slate-700 text-[11px] px-2 py-0.5 rounded font-medium">
                            {doc.category || "Général"}
                          </span>
                        </td>
                        <td className="py-3.5 pr-2 text-slate-600 font-medium">
                          {(doc.size_bytes / 1024).toFixed(1)} Ko
                        </td>
                        <td className="py-3.5 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              onClick={() => handlePreview(doc)}
                              disabled={isBusy}
                              className="rounded-lg bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-100 transition"
                              title="Visualiser le document"
                            >
                              👁️
                            </button>
                            <button
                              onClick={() => handleDownload(doc)}
                              disabled={isBusy}
                              className="rounded-lg bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 transition"
                              title="Télécharger"
                            >
                              ⬇️
                            </button>
                            <button
                              onClick={() => handleDelete(doc.id)}
                              disabled={isBusy}
                              className="rounded-lg bg-red-50 px-2 py-1 text-xs font-semibold text-red-600 hover:bg-red-100 transition"
                              title="Supprimer et libérer le quota"
                            >
                              🗑️
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Colonne droite (1/3) : Services & Raccourcis */}
        <div className="space-y-6">
          {/* Bloc Raccourcis Métiers */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900 mb-4 pb-2 border-b border-slate-100 m-0">
              Services & Commandes
            </h2>

            <div className="space-y-3 mt-3">
              <Link
                href="/documents/scan"
                className="flex items-center justify-between p-3 rounded-xl border border-slate-100 hover:border-blue-300 hover:bg-blue-50/50 transition group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-bold">
                    📱
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-800 group-hover:text-blue-700 m-0">
                      Studio Scan Mobile
                    </p>
                    <p className="text-[11px] text-slate-400 m-0">Numérisation directe sur site</p>
                  </div>
                </div>
                <span className="text-slate-400 group-hover:text-blue-600 text-sm">→</span>
              </Link>

              <Link
                href="/nos-produits"
                className="flex items-center justify-between p-3 rounded-xl border border-slate-100 hover:border-blue-300 hover:bg-blue-50/50 transition group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center text-sm font-bold">
                    📦
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-800 group-hover:text-indigo-700 m-0">
                      Catalogue Produits
                    </p>
                    <p className="text-[11px] text-slate-400 m-0">OCR, IA, Cloud & État civil</p>
                  </div>
                </div>
                <span className="text-slate-400 group-hover:text-indigo-600 text-sm">→</span>
              </Link>

              <Link
                href="/commande"
                className="flex items-center justify-between p-3 rounded-xl border border-slate-100 hover:border-blue-300 hover:bg-blue-50/50 transition group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center text-sm font-bold">
                    📝
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-800 group-hover:text-amber-700 m-0">
                      Bon de commande
                    </p>
                    <p className="text-[11px] text-slate-400 m-0">Commande dynamique de produits</p>
                  </div>
                </div>
                <span className="text-slate-400 group-hover:text-amber-600 text-sm">→</span>
              </Link>

              <Link
                href="/api-docs"
                className="flex items-center justify-between p-3 rounded-xl border border-slate-100 hover:border-blue-300 hover:bg-blue-50/50 transition group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center text-sm font-bold">
                    ⚡
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-800 group-hover:text-emerald-700 m-0">
                      API Souveraine
                    </p>
                    <p className="text-[11px] text-slate-400 m-0">Documentation développeurs</p>
                  </div>
                </div>
                <span className="text-slate-400 group-hover:text-emerald-600 text-sm">→</span>
              </Link>
            </div>
          </div>

          {/* Bloc Administration */}
          {isManager && (
            <div
              className="rounded-2xl p-6 shadow-md text-white"
              style={{
                background: "linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%)",
                border: "1px solid rgba(255, 255, 255, 0.15)",
              }}
            >
              <div className="text-center mb-4">
                <div
                  className="w-12 h-12 rounded-2xl mx-auto flex items-center justify-center text-2xl mb-2.5 shadow-sm"
                  style={{ background: "rgba(255, 255, 255, 0.12)" }}
                >
                  ⚙️
                </div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-white m-0">
                  Administration
                </h3>
              </div>

              <div className="grid grid-cols-3 gap-2.5 mt-4">
                <Link
                  href="/billing"
                  className="rounded-xl p-3 text-center transition flex flex-col items-center justify-center group"
                  style={{
                    background: "rgba(255, 255, 255, 0.10)",
                    border: "1px solid rgba(255, 255, 255, 0.18)",
                  }}
                >
                  <span className="text-xl mb-1 group-hover:scale-110 transition-transform">💳</span>
                  <span className="text-[11px] font-semibold text-white">Facturation</span>
                </Link>

                <Link
                  href="/accounting"
                  className="rounded-xl p-3 text-center transition flex flex-col items-center justify-center group"
                  style={{
                    background: "rgba(255, 255, 255, 0.10)",
                    border: "1px solid rgba(255, 255, 255, 0.18)",
                  }}
                >
                  <span className="text-xl mb-1 group-hover:scale-110 transition-transform">📊</span>
                  <span className="text-[11px] font-semibold text-white">Comptabilité</span>
                </Link>

                <Link
                  href="/users"
                  className="rounded-xl p-3 text-center transition flex flex-col items-center justify-center group"
                  style={{
                    background: "rgba(255, 255, 255, 0.10)",
                    border: "1px solid rgba(255, 255, 255, 0.18)",
                  }}
                >
                  <span className="text-xl mb-1 group-hover:scale-110 transition-transform">👥</span>
                  <span className="text-[11px] font-semibold text-white">Utilisateurs</span>
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 5. Modale Interactive : Achat de Licence & Paiement de Stockage */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <span>💳</span> Forfaits & Licences de Stockage
                </h3>
                <p className="text-xs text-slate-500">
                  Choisissez votre formule de stockage souverain ou payez à l&apos;usage réel.
                </p>
              </div>
              <button
                onClick={() => setShowPaymentModal(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            {/* Current Consumption Summary */}
            <div className="rounded-xl bg-blue-50 p-4 border border-blue-100 text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-600">Votre consommation actuelle :</span>
                <strong className="text-blue-900">{storageInfo.usedMb} Mo</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Tarif unitaire à l&apos;usage :</span>
                <strong className="text-blue-900">{STORAGE_PRICING.PRICE_PER_MB.toFixed(2)} € / Mo</strong>
              </div>
              <div className="flex justify-between border-t border-blue-200/60 pt-2 text-slate-900 font-semibold">
                <span>Coût estimé à l&apos;usage :</span>
                <span className="text-blue-700 font-bold">{storageInfo.totalCostTtc.toFixed(2)} € TTC</span>
              </div>
            </div>

            {/* Plan Selector */}
            <div className="space-y-3">
              {/* Option 1: Per MB */}
              <label
                onClick={() => setSelectedPlan("per-mb")}
                className={`flex items-start justify-between p-4 rounded-xl border-2 cursor-pointer transition ${
                  selectedPlan === "per-mb"
                    ? "border-blue-600 bg-blue-50/50"
                    : "border-slate-200 hover:border-slate-300 bg-white"
                }`}
              >
                <div className="flex items-start gap-3">
                  <input
                    type="radio"
                    name="plan"
                    checked={selectedPlan === "per-mb"}
                    onChange={() => setSelectedPlan("per-mb")}
                    className="mt-1"
                  />
                  <div>
                    <p className="text-sm font-bold text-slate-900">Recharge au Mo (À l&apos;usage)</p>
                    <p className="text-xs text-slate-500">
                      Payez uniquement ce que vous consommez. Idéal pour les usages ponctuels.
                    </p>
                  </div>
                </div>
                <span className="text-sm font-bold text-blue-700 whitespace-nowrap">0,10 € / Mo</span>
              </label>

              {/* Option 2: Monthly License */}
              <label
                onClick={() => setSelectedPlan("monthly")}
                className={`flex items-start justify-between p-4 rounded-xl border-2 cursor-pointer transition ${
                  selectedPlan === "monthly"
                    ? "border-blue-600 bg-blue-50/50"
                    : "border-slate-200 hover:border-slate-300 bg-white"
                }`}
              >
                <div className="flex items-start gap-3">
                  <input
                    type="radio"
                    name="plan"
                    checked={selectedPlan === "monthly"}
                    onChange={() => setSelectedPlan("monthly")}
                    className="mt-1"
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-slate-900">Licence Mensuelle Pro</p>
                      <span className="rounded bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-800">
                        Populaire
                      </span>
                    </div>
                    <p className="text-xs text-slate-500">
                      50 Mo inclus, Scans mobiles illimités et OCR IA prioritaire.
                    </p>
                  </div>
                </div>
                <span className="text-sm font-bold text-blue-700 whitespace-nowrap">9,90 € / mois</span>
              </label>

              {/* Option 3: Yearly License */}
              <label
                onClick={() => setSelectedPlan("yearly")}
                className={`flex items-start justify-between p-4 rounded-xl border-2 cursor-pointer transition ${
                  selectedPlan === "yearly"
                    ? "border-blue-600 bg-blue-50/50"
                    : "border-slate-200 hover:border-slate-300 bg-white"
                }`}
              >
                <div className="flex items-start gap-3">
                  <input
                    type="radio"
                    name="plan"
                    checked={selectedPlan === "yearly"}
                    onChange={() => setSelectedPlan("yearly")}
                    className="mt-1"
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-slate-900">Licence Annuelle Entreprise</p>
                      <span className="rounded bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                        2 mois offerts
                      </span>
                    </div>
                    <p className="text-xs text-slate-500">
                      1 Go de stockage souverain dédié + support 24/7.
                    </p>
                  </div>
                </div>
                <span className="text-sm font-bold text-emerald-700 whitespace-nowrap">99,00 € / an</span>
              </label>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              <span className="text-xs text-slate-500">
                🔒 Paiement sécurisé • Facturation instantanée
              </span>

              <div className="flex gap-2">
                <button
                  onClick={() => setShowPaymentModal(false)}
                  className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Annuler
                </button>

                <Link
                  href={`/commande?product=${
                    selectedPlan === "per-mb"
                      ? "storage-mb"
                      : selectedPlan === "monthly"
                      ? "storage-monthly"
                      : "storage-yearly"
                  }`}
                  className="rounded-xl bg-blue-700 px-5 py-2 text-xs font-bold text-white hover:bg-blue-800 shadow-md transition"
                >
                  Commander cette formule →
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 6. Modale Prévisualisation Document */}
      {previewDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 p-4 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl space-y-4 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">{previewDoc.doc.name}</h3>
                <span className="rounded bg-blue-100 px-2 py-0.5 text-[10px] font-semibold text-blue-800">
                  {previewDoc.doc.category} • {(previewDoc.doc.size_bytes / 1024).toFixed(1)} Ko
                </span>
              </div>
              <button
                onClick={() => setPreviewDoc(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-auto rounded-xl bg-slate-950 p-2 flex items-center justify-center min-h-[300px]">
              {previewDoc.doc.name.toLowerCase().endsWith(".pdf") ? (
                <iframe
                  src={previewDoc.url}
                  className="h-[450px] w-full rounded"
                  title="PDF Preview"
                />
              ) : (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={previewDoc.url}
                  alt={previewDoc.doc.name}
                  className="max-h-[450px] w-auto object-contain rounded"
                />
              )}
            </div>

            <div className="flex items-center justify-between pt-2 text-xs">
              <span className="text-slate-500">
                Numérisé le {new Date(previewDoc.doc.created_at).toLocaleString("fr-FR")}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => handleDownload(previewDoc.doc)}
                  className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
                >
                  ⬇️ Télécharger
                </button>
                <button
                  onClick={() => setPreviewDoc(null)}
                  className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Fermer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
