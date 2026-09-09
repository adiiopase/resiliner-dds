"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type UserSummary = {
  id: string;
  email?: string;
  created_at?: string;
};

type QuotaSummary = {
  used_bytes: number;
  quota_limit_bytes: number;
  blocked_until: string | null;
};

export default function UsersPage() {
  const [user, setUser] = useState<UserSummary | null>(null);
  const [quota, setQuota] = useState<QuotaSummary | null>(null);
  const [documentCount, setDocumentCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadUser() {
      const { data: userData, error: userError } = await supabase.auth.getUser();

      if (userError || !userData.user) {
        setError("Aucun utilisateur connecté.");
        setLoading(false);
        return;
      }

      setUser(userData.user);

      const [{ data: quotaData, error: quotaError }, { count }] = await Promise.all([
        supabase
          .from("user_quotas")
          .select("used_bytes, quota_limit_bytes, blocked_until")
          .eq("user_id", userData.user.id)
          .single(),
        supabase
          .from("documents")
          .select("id", { count: "exact", head: true })
          .eq("user_id", userData.user.id),
      ]);

      if (quotaError) {
        setError("Le quota n'est pas encore disponible. Vérifiez la migration Supabase.");
      } else {
        setQuota(quotaData);
      }
      setDocumentCount(count ?? 0);
      setLoading(false);
    }

    loadUser();
  }, []);

  const quotaPercent = quota
    ? Math.round((quota.used_bytes / (quota.quota_limit_bytes || 1)) * 100)
    : 0;

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">Organisation</p>
        <h1 className="text-3xl font-bold text-slate-900">Utilisateurs</h1>
        <p className="mt-2 text-slate-600">Gérez les accès à votre espace DDS.</p>
      </div>

      {loading ? (
        <p className="text-slate-600">Chargement du compte...</p>
      ) : error && !user ? (
        <p className="rounded-lg bg-red-50 p-4 text-red-700">{error}</p>
      ) : null}

      {user && (
        <div className="rounded-xl border border-blue-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">Utilisateur connecté</p>
              <h2 className="mt-2 text-xl font-bold text-slate-900">{user.email ?? "Adresse non disponible"}</h2>
              <p className="mt-1 break-all text-xs text-slate-500">Identifiant : {user.id}</p>
              {user.created_at && (
                <p className="mt-2 text-sm text-slate-600">
                  Compte créé le {new Date(user.created_at).toLocaleDateString("fr-FR")}
                </p>
              )}
            </div>
            <span className="rounded-full bg-emerald-100 px-3 py-1 text-sm font-semibold text-emerald-700">
              Connecté
            </span>
          </div>

          <div className="mt-6 grid gap-4 border-t border-slate-100 pt-6 sm:grid-cols-3">
            <div>
              <p className="text-sm text-slate-500">Documents</p>
              <p className="mt-1 text-2xl font-bold text-slate-900">{documentCount}</p>
            </div>
            <div>
              <p className="text-sm text-slate-500">Quota utilisé</p>
              <p className="mt-1 text-2xl font-bold text-slate-900">{quota ? `${quotaPercent}%` : "N/D"}</p>
            </div>
            <div>
              <p className="text-sm text-slate-500">Limite</p>
              <p className="mt-1 text-2xl font-bold text-slate-900">2 Mo</p>
            </div>
          </div>

          {error && <p className="mt-4 text-sm text-amber-700">{error}</p>}
          {quota?.blocked_until && new Date(quota.blocked_until) > new Date() && (
            <p className="mt-4 text-sm font-semibold text-red-700">
              Quota bloqué jusqu&apos;au {new Date(quota.blocked_until).toLocaleString("fr-FR")}.
            </p>
          )}
        </div>
      )}

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="font-semibold text-slate-900">Administration des comptes</p>
        <p className="mt-2 text-sm text-slate-600">
          La liste complète des utilisateurs et la gestion des rôles sont administrables depuis la console Supabase ou via des fonctions serveurs sécurisées.
        </p>
      </div>
    </div>
  );
}
