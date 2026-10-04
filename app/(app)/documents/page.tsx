"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

type DocumentRecord = {
  id: string;
  name: string;
  path?: string | null;
  created_at: string;
  size_bytes: number;
  category: string;
  expires_at?: string;
};

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [quota, setQuota] = useState<{ used_bytes: number; quota_limit_bytes: number } | null>(null);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("all");

  // QR Code Modal State
  const [showQrModal, setShowQrModal] = useState(false);
  const [mobileScanUrl, setMobileScanUrl] = useState("");

  // Re-upload Modal State
  const [reuploadDoc, setReuploadDoc] = useState<DocumentRecord | null>(null);
  const [reuploadFile, setReuploadFile] = useState<File | null>(null);
  const [isReuploading, setIsReuploading] = useState(false);
  const [reuploadError, setReuploadError] = useState<string | null>(null);
  const reuploadInputRef = useRef<HTMLInputElement | null>(null);

  // Preview Modal State
  const [previewDocData, setPreviewDocData] = useState<{
    doc: DocumentRecord;
    url: string;
  } | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);

  // Delete State
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // 1. Load initial data
  useEffect(() => {
    async function loadDocs() {
      setLoading(true);
      const { data, error } = await supabase
        .from("documents")
        .select("*")
        .order("created_at", { ascending: false });

      const { data: quotaData } = await supabase
        .from("user_quotas")
        .select("used_bytes, quota_limit_bytes")
        .single();

      if (error) console.error(error);
      else setDocuments(data || []);
      setQuota(quotaData);
      setLoading(false);
    }

    void loadDocs();

    if (typeof window !== "undefined") {
      setMobileScanUrl(`${window.location.origin}/documents/scan`);
    }
  }, []);

  // Helper to extract Storage Path
  function getStoragePath(path?: string | null) {
    if (!path) return null;
    if (!path.startsWith("http://") && !path.startsWith("https://")) {
      return path;
    }
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

  // Get Signed URL
  async function getSignedUrl(path?: string | null, download?: string) {
    if (!path) return null;
    const storagePath = getStoragePath(path);
    if (!storagePath) {
      console.error("Chemin Storage invalide");
      return null;
    }

    const { data, error } = await supabase.storage
      .from("documents")
      .createSignedUrl(storagePath, 60 * 15, download ? { download } : undefined);

    if (error || !data?.signedUrl) {
      console.error("Impossible de générer l'URL du document", error);
      return null;
    }
    return data.signedUrl;
  }

  // Preview Document
  async function handlePreview(doc: DocumentRecord) {
    setLoadingPreview(true);
    const signedUrl = await getSignedUrl(doc.path);
    setLoadingPreview(false);
    if (signedUrl) {
      setPreviewDocData({ doc, url: signedUrl });
    }
  }

  // Download Document
  async function handleDownload(doc: DocumentRecord) {
    const signedUrl = await getSignedUrl(doc.path, doc.name);
    if (signedUrl) {
      const link = document.createElement("a");
      link.href = signedUrl;
      link.download = doc.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }

  // Delete Document with Quota Release
  async function handleDelete(id: string) {
    if (!window.confirm("Êtes-vous sûr de vouloir supprimer définitivement ce document de votre espace souverain ?")) {
      return;
    }

    setDeletingId(id);
    try {
      const res = await fetch(`/api/documents/${id}`, { method: "DELETE" });
      const resData = await res.json();

      if (!res.ok) {
        throw new Error(resData.error || "Erreur lors de la suppression");
      }

      // Update local state
      setDocuments((docs) => docs.filter((d) => d.id !== id));

      // Reload quota
      const { data: quotaData } = await supabase
        .from("user_quotas")
        .select("used_bytes, quota_limit_bytes")
        .single();
      setQuota(quotaData);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erreur suppression";
      alert(msg);
    } finally {
      setDeletingId(null);
    }
  }

  // Re-upload / Replace Document
  async function handleReuploadSubmit() {
    if (!reuploadDoc || !reuploadFile) return;

    setIsReuploading(true);
    setReuploadError(null);

    try {
      const formData = new FormData();
      formData.append("documentId", reuploadDoc.id);
      formData.append("file", reuploadFile);

      const res = await fetch("/api/documents/reupload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || data.error || "Erreur lors du ré-upload");
      }

      // Update document list in-place
      setDocuments((prev) =>
        prev.map((d) =>
          d.id === reuploadDoc.id
            ? {
                ...d,
                name: data.document.name,
                path: data.document.path,
                size_bytes: data.document.size_bytes,
              }
            : d
        )
      );

      // Reload quota
      const { data: quotaData } = await supabase
        .from("user_quotas")
        .select("used_bytes, quota_limit_bytes")
        .single();
      setQuota(quotaData);

      // Close modal
      setReuploadDoc(null);
      setReuploadFile(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erreur lors du ré-upload";
      setReuploadError(msg);
    } finally {
      setIsReuploading(false);
    }
  }

  // Filtered documents list
  const filteredDocuments = documents.filter((doc) => {
    const name = (doc.name || "").toLowerCase();
    const category = (doc.category || "").toLowerCase();
    const q = searchQuery.toLowerCase();
    const matchesSearch = name.includes(q) || category.includes(q);

    if (!matchesSearch) return false;

    if (activeCategory === "all") return true;
    if (activeCategory === "mobile") {
      return (
        name.startsWith("scan") ||
        name.includes("mobile") ||
        Boolean(doc.path && doc.path.includes("scan-mobile"))
      );
    }
    return category === activeCategory.toLowerCase();
  });

  const quotaLimit = quota?.quota_limit_bytes || 2 * 1024 * 1024;
  const usedBytes = quota?.used_bytes || 0;
  const quotaPercent = Math.min(Math.round((usedBytes / quotaLimit) * 100), 100);

  return (
    <div className="space-y-6">
      {/* Top Header & Quick Action Buttons */}
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-blue-600">
            Espace Cloud Souverain (France)
          </span>
          <h1 className="mt-1 text-2xl font-bold text-slate-900 sm:text-3xl">
            Gestion de vos documents
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Consultez, téléchargez, supprimez ou ré-uploadez vos scans mobiles et fichiers indexés.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* QR Code button for Mobile Companion */}
          <button
            onClick={() => setShowQrModal(true)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition"
          >
            <span>📲</span> Ouvrir sur smartphone (QR)
          </button>

          {/* Primary Mobile Scanner Link */}
          <Link
            href="/documents/scan"
            className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-blue-700 to-indigo-700 px-4 py-2.5 text-xs font-semibold text-white shadow-md hover:from-blue-800 hover:to-indigo-800 transition"
          >
            <span>📸</span> Scanner un document
          </Link>

          {/* Traditional File Upload Link */}
          <Link
            href="/documents/upload"
            className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-3.5 py-2.5 text-xs font-semibold text-white hover:bg-slate-800 transition"
          >
            <span>📤</span> Téléverser un fichier
          </Link>
        </div>
      </div>

      {/* Storage Quota & Pricing Card */}
      <div className="grid gap-4 sm:grid-cols-3 rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50/80 to-indigo-50/50 p-5">
        <div className="sm:col-span-2 space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-semibold text-slate-700">
            <span>Quota de stockage souverain (0,10 € / Mo occupé)</span>
            <span className="text-blue-700 font-bold">
              {(usedBytes / 1024 / 1024).toFixed(2)} Mo / {(quotaLimit / 1024 / 1024).toFixed(0)} Mo ({quotaPercent}%)
            </span>
          </div>
          <div className="h-3 w-full rounded-full bg-blue-200/60 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                usedBytes > quotaLimit
                  ? "bg-amber-500"
                  : quotaPercent > 85
                  ? "bg-red-500"
                  : quotaPercent > 60
                  ? "bg-amber-500"
                  : "bg-blue-600"
              }`}
              style={{ width: `${Math.min(quotaPercent, 100)}%` }}
            ></div>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500">
            <span>
              Coût à l&apos;usage : <strong className="text-slate-800">{((usedBytes / 1048576) * 0.10).toFixed(2)} € TTC</strong> • Seuls les scans mobiles peuvent dépasser 2 Mo.
            </span>
            <Link
              href="/commande?product=storage-monthly"
              className="font-bold text-blue-700 hover:underline"
            >
              💳 Souscrire une licence étendue →
            </Link>
          </div>
        </div>

        <div className="flex flex-col justify-center border-t sm:border-t-0 sm:border-l border-blue-200/60 pt-3 sm:pt-0 sm:pl-5 space-y-1">
          <span className="text-xs text-slate-500">Total documents indexés</span>
          <span className="text-2xl font-bold text-slate-900">{documents.length}</span>
          <span className="text-[11px] text-emerald-700 font-medium">
            ✓ Suppression = Libération immédiate
          </span>
        </div>
      </div>

      {/* Filters and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        {/* Category Pills */}
        <div className="flex flex-wrap gap-1.5 w-full sm:w-auto">
          {[
            { id: "all", label: "Tous" },
            { id: "mobile", label: "📱 Scans Mobiles" },
            { id: "Facture", label: "Factures" },
            { id: "Identité", label: "Identité" },
            { id: "Contrat", label: "Contrats" },
            { id: "Administratif", label: "Administratif" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveCategory(tab.id)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                activeCategory === tab.id
                  ? "bg-blue-700 text-white shadow-sm"
                  : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search input */}
        <div className="relative w-full sm:w-64">
          <input
            type="text"
            placeholder="Rechercher un document..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-slate-300 bg-white py-2 pl-9 pr-3 text-xs focus:border-blue-600 focus:outline-none shadow-sm"
          />
          <span className="absolute left-3 top-2.5 text-slate-400 text-xs">🔍</span>
        </div>
      </div>

      {/* Document Table / List */}
      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-slate-500">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
          <p className="mt-3 text-sm font-medium">Chargement de vos documents sécurisés...</p>
        </div>
      ) : filteredDocuments.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center space-y-4">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-3xl">
            📁
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">Aucun document trouvé</h3>
            <p className="mt-1 text-sm text-slate-500 max-w-sm mx-auto">
              {searchQuery || activeCategory !== "all"
                ? "Aucun document ne correspond à vos filtres actuels."
                : "Votre espace est vide. Numérisez votre premier document depuis votre smartphone ou téléversez un fichier."}
            </p>
          </div>
          <div className="flex justify-center gap-3">
            <Link
              href="/documents/scan"
              className="rounded-xl bg-blue-700 px-4 py-2.5 text-xs font-semibold text-white hover:bg-blue-800 transition"
            >
              📱 Scanner sur smartphone
            </Link>
          </div>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 text-slate-600 font-semibold uppercase tracking-wider">
                  <th className="p-4">Document</th>
                  <th className="p-4">Source & Catégorie</th>
                  <th className="p-4">Taille</th>
                  <th className="p-4">Date de numérisation</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {filteredDocuments.map((doc) => {
                  const isMobileScan =
                    (doc.name || "").toLowerCase().startsWith("scan") ||
                    (doc.name || "").toLowerCase().includes("mobile") ||
                    Boolean(doc.path && doc.path.includes("scan-mobile"));

                  return (
                    <tr key={doc.id} className="hover:bg-slate-50/70 transition">
                      <td className="p-4 font-medium text-slate-900 flex items-center gap-2.5">
                        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-700 text-sm">
                          {isMobileScan ? "📱" : "📄"}
                        </span>
                        <div>
                          <p className="font-semibold text-slate-900">{doc.name}</p>
                          <p className="text-[10px] text-slate-400 font-mono">
                            ID: {doc.id.slice(0, 8)}...
                          </p>
                        </div>
                      </td>

                      <td className="p-4">
                        <div className="flex flex-col gap-1 items-start">
                          <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700">
                            {doc.category || "Général"}
                          </span>
                          {isMobileScan && (
                            <span className="inline-flex items-center gap-1 rounded bg-indigo-50 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-700">
                              <span>📱</span> Scan Mobile
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="p-4 text-slate-600 font-medium">
                        {doc.size_bytes ? `${(doc.size_bytes / 1024).toFixed(1)} Ko` : "-"}
                      </td>

                      <td className="p-4 text-slate-500">
                        {new Date(doc.created_at).toLocaleDateString("fr-FR", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>

                      <td className="p-4 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          {/* Preview button */}
                          <button
                            onClick={() => handlePreview(doc)}
                            className="rounded-lg bg-slate-100 px-2.5 py-1.5 font-semibold text-slate-700 hover:bg-blue-50 hover:text-blue-700 transition"
                            title="Aperçu & Détails OCR"
                          >
                            👁️ Aperçu
                          </button>

                          {/* Download button */}
                          <button
                            onClick={() => handleDownload(doc)}
                            className="rounded-lg bg-emerald-50 px-2.5 py-1.5 font-semibold text-emerald-700 hover:bg-emerald-100 transition"
                            title="Télécharger le fichier"
                          >
                            ⬇️ Télécharger
                          </button>

                          {/* Re-upload / Replace button */}
                          <button
                            onClick={() => {
                              setReuploadDoc(doc);
                              setReuploadFile(null);
                              setReuploadError(null);
                            }}
                            className="rounded-lg bg-amber-50 px-2.5 py-1.5 font-semibold text-amber-700 hover:bg-amber-100 transition"
                            title="Remplacer / Ré-uploader ce document"
                          >
                            🔄 Remplacer
                          </button>

                          {/* Delete button */}
                          <button
                            onClick={() => handleDelete(doc.id)}
                            disabled={deletingId === doc.id}
                            className="rounded-lg bg-red-50 px-2.5 py-1.5 font-semibold text-red-600 hover:bg-red-100 transition disabled:opacity-50"
                            title="Supprimer définitivement et libérer le quota"
                          >
                            {deletingId === doc.id ? "..." : "🗑️ Supprimer"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal 1: QR Code Companion for Smartphone */}
      {showQrModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <span>📲</span> Scanner avec votre smartphone
              </h3>
              <button
                onClick={() => setShowQrModal(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-600">
              Scannez ce QR Code avec l&apos;appareil photo de votre smartphone pour ouvrir directement le Studio de Scan Mobile sur votre téléphone.
            </p>

            <div className="flex justify-center p-4 bg-slate-50 rounded-xl border border-slate-200">
              {/* QR Code generator via standard secure service */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(
                  mobileScanUrl
                )}`}
                alt="QR Code Mobile Scan"
                className="h-48 w-48 rounded-lg shadow-sm"
              />
            </div>

            <div className="rounded-lg bg-blue-50 p-3 text-xs text-blue-900">
              <p className="font-semibold">Lien direct :</p>
              <p className="font-mono text-[11px] truncate">{mobileScanUrl}</p>
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setShowQrModal(false)}
                className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 2: Re-upload / Remplacement de document */}
      {reuploadDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <span>🔄</span> Remplacer / Ré-uploader
              </h3>
              <button
                onClick={() => setReuploadDoc(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <div className="rounded-xl bg-amber-50 p-3 text-xs text-amber-900 border border-amber-200">
              <p className="font-semibold">Document cible :</p>
              <p className="text-slate-800 truncate">{reuploadDoc.name}</p>
              <p className="text-slate-600 mt-1">
                Taille actuelle : {(reuploadDoc.size_bytes / 1024).toFixed(1)} Ko
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Sélectionnez le nouveau fichier ou scan
              </label>
              <input
                ref={reuploadInputRef}
                type="file"
                accept="image/*,application/pdf"
                onChange={(e) => setReuploadFile(e.target.files?.[0] || null)}
                className="w-full rounded-lg border border-slate-300 p-2.5 text-xs bg-slate-50"
              />
              {reuploadFile && (
                <p className="mt-1.5 text-xs text-blue-700 font-medium">
                  Nouveau fichier : {reuploadFile.name} ({(reuploadFile.size / 1024).toFixed(1)} Ko)
                </p>
              )}
            </div>

            {reuploadError && (
              <div className="rounded-lg bg-red-50 p-3 text-xs font-medium text-red-800 border border-red-200">
                ⚠️ {reuploadError}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setReuploadDoc(null)}
                className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Annuler
              </button>

              <button
                type="button"
                onClick={handleReuploadSubmit}
                disabled={!reuploadFile || isReuploading}
                className="rounded-xl bg-amber-600 px-4 py-2 text-xs font-semibold text-white shadow-md hover:bg-amber-700 transition disabled:opacity-50"
              >
                {isReuploading ? "Remplacement..." : "Valider le ré-upload"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 3: Preview & OCR Details */}
      {previewDocData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 p-4 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl space-y-4 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="text-lg font-bold text-slate-900">{previewDocData.doc.name}</h3>
                <span className="rounded bg-blue-100 px-2 py-0.5 text-[10px] font-semibold text-blue-800">
                  {previewDocData.doc.category}
                </span>
              </div>
              <button
                onClick={() => setPreviewDocData(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            {/* Media View */}
            <div className="flex-1 overflow-auto rounded-xl bg-slate-950 p-2 flex items-center justify-center min-h-[300px]">
              {previewDocData.doc.name.toLowerCase().endsWith(".pdf") ? (
                <iframe
                  src={previewDocData.url}
                  className="h-[450px] w-full rounded"
                  title="PDF Preview"
                />
              ) : (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={previewDocData.url}
                  alt={previewDocData.doc.name}
                  className="max-h-[450px] w-auto object-contain rounded"
                />
              )}
            </div>

            {/* OCR & Sovereignty Footer */}
            <div className="flex items-center justify-between pt-2 text-xs text-slate-600">
              <span>
                Taille : <strong>{(previewDocData.doc.size_bytes / 1024).toFixed(1)} Ko</strong>
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => handleDownload(previewDocData.doc)}
                  className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
                >
                  ⬇️ Télécharger
                </button>
                <button
                  onClick={() => setPreviewDocData(null)}
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
