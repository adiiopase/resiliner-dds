"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [category, setCategory] = useState("Administratif");
  const [status, setStatus] = useState<string>("");
  const [isUploading, setIsUploading] = useState(false);
  const [quota, setQuota] = useState<{ used_bytes: number; quota_limit_bytes: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function loadQuota() {
    const { data } = await supabase
      .from("user_quotas")
      .select("used_bytes, quota_limit_bytes")
      .single();
    setQuota(data);
  }

  useEffect(() => {
    async function loadInitialQuota() {
      const { data } = await supabase
        .from("user_quotas")
        .select("used_bytes, quota_limit_bytes")
        .single();
      setQuota(data);
    }

    void loadInitialQuota();
  }, []);

  async function handleUpload() {
    if (!file) {
      setStatus("Veuillez choisir un fichier.");
      return;
    }

    setStatus("Upload en cours...");
    setIsUploading(true);

    try {
      // Vérifier que l'utilisateur est connecté
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        setStatus("Utilisateur non connecté.");
        return;
      }

      const userId = userData.user.id;

      const { data: quotaRes, error: quotaError } = await supabase.rpc(
        "reserve_document_bytes",
        { requested_bytes: file.size }
      );

      if (quotaError) {
        setStatus(`Upload refusé : ${quotaError.message}`);
        if (quotaError.message.includes("Quota")) {
          await fetch("/api/quota-notification", { method: "POST" });
        }
        return;
      }

      // 1. Upload dans le bucket Storage
      const filePath = `${userId}/${Date.now()}-${file.name}`;

      const { error: uploadError } = await supabase.storage
        .from("documents")
        .upload(filePath, file);

      if (uploadError) {
        await supabase.rpc("release_document_bytes", {
          released_bytes: file.size,
        });
        setStatus(`Erreur upload : ${uploadError.message}`);
        return;
      }

      // 2. Insérer dans la table documents
      const { error: dbError } = await supabase.from("documents").insert({
        name: file.name,
        path: filePath,
        category,
        size_bytes: file.size,
        expires_at: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
        user_id: userId,
      });

      if (dbError) {
        await supabase.storage.from("documents").remove([filePath]);
        await supabase.rpc("release_document_bytes", {
          released_bytes: file.size,
        });
        setStatus(`Erreur base de données : ${dbError.message}`);
        return;
      }

      const remainingMb = ((quotaRes?.remaining_bytes ?? 0) / 1024 / 1024).toFixed(2);
      const warning = quotaRes?.warning
        ? ` Attention : il vous reste ${remainingMb} Mo.`
        : "";
      setStatus(`Upload réussi. Le document sera conservé conformément à vos règles.${warning}`);
      if ((quotaRes?.remaining_bytes ?? 0) === 0) {
        await fetch("/api/quota-notification", { method: "POST" });
      }
      setFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      await loadQuota();
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">Gestion documentaire</p>
        <h1 className="mt-2 text-3xl font-bold text-slate-900">Upload de document</h1>
        <p className="mt-2 text-slate-600">Importez vos fichiers pour indexation, OCR et archivage sécurisé.</p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-6 rounded-lg bg-blue-50 p-4 text-sm text-slate-700">
          <p className="font-semibold">Quota utilisé</p>
          <p className="mt-1 text-xl font-bold text-blue-700">
            {quota
              ? `${(quota.used_bytes / 1024 / 1024).toFixed(2)} Mo (${Math.round(
                  (quota.used_bytes / (quota.quota_limit_bytes || 1)) * 100
                )} %)`
              : "Chargement..."}
          </p>
          <p>Limite : {quota ? `${(quota.quota_limit_bytes / 1024 / 1024).toFixed(0)} Mo` : "2 Mo"}</p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Sélectionner un fichier
            </label>
            <input
              ref={fileInputRef}
              type="file"
              className="w-full p-3 border rounded-lg bg-gray-50 text-sm"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Catégorie du document
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full rounded-lg border p-3 bg-gray-50 text-sm"
            >
              <option>Administratif</option>
              <option>Identité</option>
              <option>Comptabilité</option>
              <option>Juridique</option>
              <option>Ressources humaines</option>
              <option>Commercial</option>
              <option>Autre</option>
            </select>
          </div>

          <button
            onClick={handleUpload}
            disabled={isUploading}
            className="w-full bg-blue-700 text-white p-3 rounded-lg font-semibold hover:bg-blue-800 transition disabled:opacity-50"
          >
            {isUploading ? "Upload en cours..." : "Téléverser le document"}
          </button>

          {status && (
            <p className="mt-4 text-center text-sm font-medium text-slate-800 bg-slate-100 p-3 rounded-lg">
              {status}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
