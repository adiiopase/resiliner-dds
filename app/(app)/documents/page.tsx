"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type DocumentRecord = {
  id: string;
  name: string;
  path: string;
  created_at: string;
  size_bytes: number;
  category: string;
};

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [quota, setQuota] = useState<{ used_bytes: number; quota_limit_bytes: number } | null>(null);

  useEffect(() => {
    async function loadDocs() {
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

    loadDocs();
  }, []);

  // async function deleteDoc(id: string) {
  //   await supabase.from("documents").delete().eq("id", id);
  //   setDocuments((docs) => docs.filter((d) => d.id !== id));
  // }


  async function deleteDoc(id: string) {
    // 1. Récupérer le document (pour connaître sa taille et son chemin)
    const { data: doc, error: docError } = await supabase
      .from("documents")
      .select("id, path, size_bytes")
      .eq("id", id)
      .single();

    if (docError || !doc) {
      console.error("Erreur récupération document :", docError);
      return;
    }

    // 2. Libérer le quota (très important)
    await supabase.rpc("release_document_bytes", {
      released_bytes: doc.size_bytes,
    });

    // 3. Supprimer le fichier du Storage
    await supabase.storage.from("documents").remove([doc.path]);

    // 4. Supprimer la ligne dans la table documents
    await supabase.from("documents").delete().eq("id", id);

    // 5. Mettre à jour la liste des documents
    setDocuments((docs) => docs.filter((d) => d.id !== id));

    // 6. Recharger le quota pour l’affichage
    const { data: quotaData } = await supabase
      .from("user_quotas")
      .select("used_bytes, quota_limit_bytes")
      .single();

    setQuota(quotaData);
  }


  function getStoragePath(path: string) {
    if (!path.startsWith("http://") && !path.startsWith("https://")) {
      return path;
    }

    const url = new URL(path);
    const publicPath = "/storage/v1/object/public/documents/";
    const pathIndex = url.pathname.indexOf(publicPath);

    if (pathIndex === -1) {
      return null;
    }

    return decodeURIComponent(
      url.pathname.slice(pathIndex + publicPath.length)
    );
  }

  async function getSignedUrl(path: string, download?: string) {
    const storagePath = getStoragePath(path);

    if (!storagePath) {
      console.error("Chemin Storage invalide");
      return null;
    }

    const { data, error } = await supabase.storage
      .from("documents")
      .createSignedUrl(storagePath, 60 * 5, download ? { download } : undefined);

    if (error || !data?.signedUrl) {
      console.error("Impossible de générer l'URL du document", error);
      return null;
    }

    return data.signedUrl;
  }

  async function previewDoc(path: string) {
    const previewWindow = window.open("about:blank", "_blank");

    if (!previewWindow) {
      console.error("Impossible d'ouvrir la prévisualisation");
      return;
    }

    const signedUrl = await getSignedUrl(path);

    if (!signedUrl) {
      previewWindow.close();
      return;
    }

    previewWindow.location.href = signedUrl;
  }

  async function downloadDoc(path: string, name: string) {
    const signedUrl = await getSignedUrl(path, name);

    if (!signedUrl) {
      return;
    }

    window.location.href = signedUrl;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <h1 className="text-2xl font-bold text-slate-900">Mes documents</h1>
        <a
          href="/documents/upload"
          className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800 transition"
        >
          + Téléverser un document
        </a>
      </div>

      <div className="rounded-lg bg-blue-50 p-4 text-sm text-slate-700">
        <p className="font-semibold">Quota utilisé</p>
        <p className="mt-1 text-xl font-bold text-blue-700">
          {quota
            ? `${(quota.used_bytes / 1024 / 1024).toFixed(2)} Mo (${Math.round(
              (quota.used_bytes / (quota.quota_limit_bytes || 1)) * 100
            )} %)`
            : "Chargement..."}
        </p>
        <p>
          Limite :{" "}
          {quota ? `${(quota.quota_limit_bytes / 1024 / 1024).toFixed(0)} Mo` : "2 Mo"}
        </p>
      </div>

      {loading ? (
        <p className="text-slate-600">Chargement...</p>
      ) : documents.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center">
          <p className="text-gray-600">Aucun document pour le moment.</p>
          <a
            href="/documents/upload"
            className="mt-4 inline-block text-sm font-semibold text-blue-700 hover:underline"
          >
            Téléverser votre premier document
          </a>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b bg-gray-50 text-slate-700">
                <th className="text-left p-4">Nom</th>
                <th className="text-left p-4">Catégorie</th>
                <th className="text-left p-4">Date</th>
                <th className="text-left p-4">Actions</th>
              </tr>
            </thead>

            <tbody>
              {documents.map((doc) => (
                <tr key={doc.id} className="border-b last:border-0 hover:bg-slate-50">
                  <td className="p-4 font-medium text-slate-900">{doc.name}</td>
                  <td className="p-4">
                    <span className="rounded bg-slate-100 px-2 py-1 text-xs text-slate-700">
                      {doc.category || "Général"}
                    </span>
                  </td>
                  <td className="p-4 text-slate-600">
                    {new Date(doc.created_at).toLocaleString("fr-FR")}
                  </td>
                  <td className="p-4 space-x-3">
                    <button
                      onClick={() => previewDoc(doc.path)}
                      className="text-blue-600 hover:underline font-medium"
                    >
                      Aperçu
                    </button>

                    <button
                      onClick={() => downloadDoc(doc.path, doc.name)}
                      className="text-emerald-600 hover:underline font-medium"
                    >
                      Télécharger
                    </button>

                    <button
                      onClick={() => deleteDoc(doc.id)}
                      className="text-red-600 hover:underline font-medium"
                    >
                      Supprimer
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
