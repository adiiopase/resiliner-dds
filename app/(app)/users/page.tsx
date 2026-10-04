"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import type { ConnectedUserPresence } from "@/components/PresenceTracker";
import BannerManagement from "./BannerManagement";

type RegisteredUser = {
  id: string;
  email: string;
  role: string;
  confirmed_at: string | null;
  created_at: string;
  last_sign_in_at: string | null;
  document_count: number;
  storage_bytes: number;
  storage_mb: number;
  quota_limit_bytes: number;
};

function formatDuration(startTimeIso: string, currentTime: Date): string {
  if (!startTimeIso) return "0 s";
  const start = new Date(startTimeIso).getTime();
  const now = currentTime.getTime();
  const diffSec = Math.max(0, Math.floor((now - start) / 1000));

  const hours = Math.floor(diffSec / 3600);
  const minutes = Math.floor((diffSec % 3600) / 60);
  const seconds = diffSec % 60;

  if (hours > 0) {
    return `${hours}h ${minutes.toString().padStart(2, "0")}m ${seconds
      .toString()
      .padStart(2, "0")}s`;
  }
  if (minutes > 0) {
    return `${minutes} min ${seconds.toString().padStart(2, "0")} s`;
  }
  return `${seconds} s`;
}

function formatTimeOnly(isoString: string): string {
  if (!isoString) return "-";
  try {
    const d = new Date(isoString);
    return d.toLocaleTimeString("fr-FR", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch {
    return isoString;
  }
}

function formatFullDate(isoString: string): string {
  if (!isoString) return "-";
  try {
    const d = new Date(isoString);
    return d.toLocaleString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return isoString;
  }
}

export default function UsersAdminPage() {
  const [currentUser, setCurrentUser] = useState<{
    id: string;
    email: string;
    role: string;
  } | null>(null);

  const [isManager, setIsManager] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Live presence state
  const [presenceMap, setPresenceMap] = useState<Record<string, ConnectedUserPresence>>({});
  const [now, setNow] = useState<Date>(new Date());

  // Database registered users
  const [registeredUsers, setRegisteredUsers] = useState<RegisteredUser[]>([]);
  const [serverSessions, setServerSessions] = useState<Record<string, ConnectedUserPresence>>({});
  const [searchFilter, setSearchFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "online" | "offline">("all");
  const [refreshing, setRefreshing] = useState(false);

  // Tick clock every second for active duration calculation
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch registered users & active sessions via admin API
  const loadRegisteredUsers = useCallback(async (isBackground = false) => {
    if (!isBackground) setRefreshing(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      const res = await fetch("/api/admin/users", {
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.users) {
          setRegisteredUsers(data.users);
        }
        if (data.activeSessions && Array.isArray(data.activeSessions)) {
          const map: Record<string, ConnectedUserPresence> = {};
          data.activeSessions.forEach((s: {
            userId: string;
            email: string;
            role: string;
            connectedAt: string;
            device: string;
            location: {
              ip: string;
              city: string;
              region: string;
              country: string;
              country_code?: string;
              flag: string;
              latitude: number;
              longitude: number;
              org: string;
            };
          }) => {
            map[s.userId || s.email] = {
              user_id: s.userId,
              email: s.email,
              role: s.role,
              connectedAt: s.connectedAt,
              device: s.device,
              location: {
                ip: s.location?.ip || "127.0.0.1",
                city: s.location?.city || "France",
                region: s.location?.region || "",
                country: s.location?.country || "France",
                country_code: s.location?.country_code || "FR",
                flag: s.location?.flag || "🇫🇷",
                latitude: s.location?.latitude || 48.8566,
                longitude: s.location?.longitude || 2.3522,
                org: s.location?.org || "DigitalDocs",
              },
            };
          });
          setServerSessions(map);
        }
      } else {
        const errData = await res.json().catch(() => ({}));
        console.warn("Erreur API Admin Users :", errData);
      }
    } catch (e) {
      console.warn("Erreur réseau chargement usagers :", e);
    } finally {
      if (!isBackground) setRefreshing(false);
    }
  }, []);

  // Auto-poll active sessions every 5s
  useEffect(() => {
    if (!isManager) return;
    const pollInterval = setInterval(() => {
      void loadRegisteredUsers(true);
    }, 5000);
    return () => clearInterval(pollInterval);
  }, [isManager, loadRegisteredUsers]);

  // Initial load and Realtime Presence listener
  useEffect(() => {
    async function init() {
      setLoading(true);
      try {
        const { data: authData } = await supabase.auth.getUser();
        const user = authData?.user;

        if (!user) {
          setError("Veuillez vous connecter pour accéder à l'administration.");
          setLoading(false);
          return;
        }

        const manager =
          user.app_metadata?.role === "manager" ||
          user.email === "adiiopase@gmail.com" ||
          user.email === "adiopa@yahoo.fr";

        setIsManager(manager);
        setCurrentUser({
          id: user.id,
          email: user.email || "",
          role: manager ? "manager" : "user",
        });

        if (!manager) {
          setError("Accès réservé aux administrateurs.");
          setLoading(false);
          return;
        }

        // Check if PresenceTracker already populated presence map
        if (typeof window !== "undefined" && window.__dds_presence_map) {
          setPresenceMap(window.__dds_presence_map);
        }

        // Load database users
        await loadRegisteredUsers(false);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Erreur inattendue";
        setError(msg);
      } finally {
        setLoading(false);
      }
    }

    void init();

    // Listen to custom presence events from PresenceTracker
    function handlePresenceUpdate(e: Event) {
      const customEvent = e as CustomEvent<Record<string, ConnectedUserPresence>>;
      if (customEvent.detail) {
        setPresenceMap(customEvent.detail);
      }
    }

    if (typeof window !== "undefined") {
      window.addEventListener("dds-presence-changed", handlePresenceUpdate);
    }

    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("dds-presence-changed", handlePresenceUpdate);
      }
    };
  }, [loadRegisteredUsers]);

  // Combined active map from both WebSocket presence and server heartbeat sessions
  const combinedActiveMap = useMemo(() => {
    return { ...serverSessions, ...presenceMap };
  }, [serverSessions, presenceMap]);

  // Separate Connected Users from Administrator
  const connectedUsersList = useMemo(() => {
    return Object.values(combinedActiveMap).filter((u) => {
      const isUserAdmin =
        u.role === "manager" ||
        u.email?.toLowerCase() === "adiiopase@gmail.com" ||
        u.email?.toLowerCase() === "adiopa@yahoo.fr";
      // Exclude Administrator from users list
      return !isUserAdmin;
    });
  }, [combinedActiveMap]);

  // Online admin presence if any
  const adminPresence = useMemo(() => {
    return Object.values(combinedActiveMap).find(
      (u) =>
        u.role === "manager" ||
        u.email?.toLowerCase() === "adiiopase@gmail.com" ||
        u.email?.toLowerCase() === "adiopa@yahoo.fr"
    );
  }, [combinedActiveMap]);

  // Filtered registered users
  const filteredUsers = useMemo(() => {
    return registeredUsers
      .filter((u) => {
        // Exclude admin from regular users directory list as well
        const isUserAdmin =
          u.role === "manager" ||
          u.email?.toLowerCase() === "adiiopase@gmail.com" ||
          u.email?.toLowerCase() === "adiopa@yahoo.fr";
        return !isUserAdmin;
      })
      .filter((u) => {
        const isOnline = Boolean(
          combinedActiveMap[u.id] ||
            Object.values(combinedActiveMap).some((p) => p.email === u.email)
        );
        if (statusFilter === "online") return isOnline;
        if (statusFilter === "offline") return !isOnline;
        return true;
      })
      .filter((u) => {
        if (!searchFilter) return true;
        const query = searchFilter.toLowerCase();
        return u.email?.toLowerCase().includes(query);
      });
  }, [registeredUsers, combinedActiveMap, statusFilter, searchFilter]);

  if (loading) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center gap-3">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
        <p className="text-sm font-semibold text-slate-600">
          Chargement du centre de surveillance des usagers...
        </p>
      </div>
    );
  }

  if (error || !isManager) {
    return (
      <div className="mx-auto max-w-2xl rounded-2xl border border-red-200 bg-red-50 p-6 text-center shadow-sm">
        <span className="text-4xl">🚫</span>
        <h1 className="mt-3 text-xl font-bold text-red-800">
          Accès Administrateur Restreint
        </h1>
        <p className="mt-2 text-sm text-red-600">
          {error ||
            "Cette interface de supervision en temps réel est strictement réservée à l'administrateur de DigitalDocs Solutions."}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="rounded-lg bg-blue-100 px-2.5 py-1 text-xs font-extrabold uppercase tracking-wider text-blue-700">
              Supervision Espace SaaS
            </span>
            <span className="flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-800">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
              </span>
              Temps Réel Actif
            </span>
          </div>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-900">
            Usagers & Connexions en Direct
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Surveillance en temps réel des sessions usagers, heures de connexion, durées actives et localisations.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => void loadRegisteredUsers()}
            disabled={refreshing}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-50"
          >
            <span className={refreshing ? "animate-spin" : ""}>🔄</span>
            {refreshing ? "Actualisation..." : "Actualiser"}
          </button>
        </div>
      </div>

      <BannerManagement />

      {/* 👑 SECTION 1 : ADMINISTRATEUR (TOTALEMENT À PART) */}
      <div className="rounded-2xl border-2 border-amber-300 bg-gradient-to-r from-amber-50 via-orange-50 to-amber-50/50 p-6 shadow-md">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-amber-500 text-2xl text-white shadow-md">
              👑
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-amber-200/80 px-2.5 py-0.5 text-xs font-extrabold uppercase tracking-wide text-amber-900">
                  Compte Administrateur (Isolé)
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                  Session Active
                </span>
              </div>
              <h2 className="mt-1.5 text-xl font-black text-slate-900">
                {currentUser?.email || "adiiopase@gmail.com"}
              </h2>
              <p className="text-xs text-slate-600">
                Privilèges complets de gestion documentaire, facturation, supervision et contrôle du stockage souverain.
              </p>
            </div>
          </div>

          {/* Admin Metadata */}
          <div className="flex flex-wrap items-center gap-3 rounded-xl border border-amber-200 bg-white/80 p-3 text-xs text-slate-700 shadow-sm backdrop-blur-sm">
            <div className="border-r border-amber-200 pr-3">
              <p className="text-[10px] font-bold uppercase text-slate-400">Heure de début</p>
              <p className="font-semibold text-slate-900">
                {adminPresence?.connectedAt ? formatTimeOnly(adminPresence.connectedAt) : formatTimeOnly(new Date().toISOString())}
              </p>
            </div>
            <div className="border-r border-amber-200 pr-3">
              <p className="text-[10px] font-bold uppercase text-slate-400">Durée en cours</p>
              <p className="font-mono font-bold text-amber-700">
                {adminPresence?.connectedAt ? formatDuration(adminPresence.connectedAt, now) : "En session"}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase text-slate-400">Localisation</p>
              <p className="font-semibold text-slate-900 flex items-center gap-1">
                <span>{adminPresence?.location?.flag || "🇫🇷"}</span>
                <span>{adminPresence?.location?.city || "Paris"}, {adminPresence?.location?.country || "France"}</span>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 🔴 SECTION 2 : LISTE DES USAGERS CONNECTÉS EN TEMPS RÉEL */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-md">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-xl text-blue-600 font-bold">
              👥
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-slate-900">
                  Usagers Connectés en Direct
                </h2>
                <span className="inline-flex items-center rounded-full bg-blue-600 px-2.5 py-0.5 text-xs font-black text-white">
                  {connectedUsersList.length} en ligne
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Liste instantanée des clients et usagers actuellement connectés sur le portail (hors administrateur).
              </p>
            </div>
          </div>

          <div className="text-right">
            <span className="text-xs font-medium text-slate-400">
              Synchronisation temps réel : <strong className="text-slate-700">{formatTimeOnly(now.toISOString())}</strong>
            </span>
          </div>
        </div>

        {connectedUsersList.length === 0 ? (
          <div className="my-8 rounded-xl border-2 border-dashed border-slate-200 p-8 text-center bg-slate-50/60">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-2xl text-slate-400">
              🛰️
            </div>
            <h3 className="text-base font-bold text-slate-800">
              Aucun usager client connecté en ce moment
            </h3>
            <p className="mx-auto mt-1.5 max-w-md text-xs text-slate-500">
              Dès qu&apos;un utilisateur (ex: <code>adiopa@yahoo.fr</code>, <code>cathgegout@laposte.net</code>, <code>boubdiopd@gmail.com</code>) se connecte, sa session s&apos;affichera automatiquement ici en direct avec sa localisation et sa durée de connexion.
            </p>
          </div>
        ) : (
          <div className="mt-6 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs font-bold uppercase tracking-wider text-slate-500 bg-slate-50/75">
                  <th className="py-3.5 px-4 rounded-l-xl">Usager (Email)</th>
                  <th className="py-3.5 px-4">Début Connexion</th>
                  <th className="py-3.5 px-4">Durée Active</th>
                  <th className="py-3.5 px-4">Localisation Détectée</th>
                  <th className="py-3.5 px-4">Appareil / Navigateur</th>
                  <th className="py-3.5 px-4 rounded-r-xl text-right">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {connectedUsersList.map((usr) => {
                  const loc = usr.location || {
                    ip: "127.0.0.1",
                    city: "France",
                    country: "France",
                    flag: "🇫🇷",
                  };
                  const durationStr = formatDuration(usr.connectedAt, now);

                  return (
                    <tr key={usr.user_id || usr.email} className="hover:bg-blue-50/40 transition">
                      {/* Email */}
                      <td className="py-4 px-4 font-semibold text-slate-900">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 font-bold text-white text-xs shadow-sm">
                            {usr.email ? usr.email.charAt(0).toUpperCase() : "U"}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900">{usr.email}</p>
                            <p className="text-[11px] text-slate-400 font-mono">{usr.user_id}</p>
                          </div>
                        </div>
                      </td>

                      {/* Heure de début */}
                      <td className="py-4 px-4">
                        <div className="inline-flex flex-col">
                          <span className="font-bold text-slate-800">
                            {formatTimeOnly(usr.connectedAt)}
                          </span>
                          <span className="text-[11px] text-slate-400">
                            {formatFullDate(usr.connectedAt).split(" ")[0]}
                          </span>
                        </div>
                      </td>

                      {/* Durée de connexion en temps réel */}
                      <td className="py-4 px-4">
                        <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-2.5 py-1 font-mono text-xs font-bold text-emerald-700 border border-emerald-200">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                          {durationStr}
                        </span>
                      </td>

                      {/* Localisation */}
                      <td className="py-4 px-4">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5 font-semibold text-slate-800">
                            <span className="text-base">{loc.flag || "🌐"}</span>
                            <span>{loc.city || "Ville"}, {loc.country || "France"}</span>
                          </div>
                          <p className="text-[11px] text-slate-500 flex items-center gap-2">
                            <span>IP: <code className="text-slate-600 font-mono">{loc.ip || "127.0.0.1"}</code></span>
                            {loc.org && <span className="text-slate-400">• {loc.org}</span>}
                          </p>
                          {loc.latitude && loc.longitude && (
                            <a
                              href={`https://www.openstreetmap.org/?mlat=${loc.latitude}&mlon=${loc.longitude}#map=12/${loc.latitude}/${loc.longitude}`}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:underline"
                            >
                              <span>📍</span> Voir sur la carte ({loc.latitude.toFixed(2)}, {loc.longitude.toFixed(2)})
                            </a>
                          )}
                        </div>
                      </td>

                      {/* Appareil */}
                      <td className="py-4 px-4 text-xs text-slate-600">
                        <span className="inline-block rounded-md bg-slate-100 px-2 py-1 font-medium text-slate-700">
                          {usr.device || "💻 Ordinateur"}
                        </span>
                      </td>

                      {/* Statut */}
                      <td className="py-4 px-4 text-right">
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-800">
                          <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
                          En ligne
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 📁 SECTION 3 : ANNUAIRE COMPLET DES COMPTES INSCRITS */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-md">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-5">
          <div>
            <h2 className="text-lg font-black text-slate-900">
              Annuaire de Tous les Usagers Inscrits
            </h2>
            <p className="text-xs text-slate-500">
              Comptes clients enregistrés dans la base PostgreSQL avec statistiques de stockage et documents.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Search Filter */}
            <input
              type="text"
              placeholder="Rechercher par email..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="rounded-xl border border-slate-300 px-3.5 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as "all" | "online" | "offline")}
              className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Tous les statuts ({registeredUsers.filter(u => u.email !== "adiiopase@gmail.com" && u.email !== "adiopa@yahoo.fr" && u.role !== "manager").length})</option>
              <option value="online">En ligne ({connectedUsersList.length})</option>
              <option value="offline">Hors ligne</option>
            </select>
          </div>
        </div>

        <div className="mt-6 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs font-bold uppercase tracking-wider text-slate-500 bg-slate-50/75">
                <th className="py-3 px-4 rounded-l-xl">Email Usager</th>
                <th className="py-3 px-4">Statut Session</th>
                <th className="py-3 px-4">Date d&apos;inscription</th>
                <th className="py-3 px-4">Dernière Connexion</th>
                <th className="py-3 px-4">Documents</th>
                <th className="py-3 px-4 rounded-r-xl">Stockage Occupé</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-xs text-slate-400">
                    Aucun usager ne correspond aux critères de recherche.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => {
                  const isOnline = Boolean(
                    presenceMap[u.id] ||
                    Object.values(presenceMap).some((p) => p.email === u.email)
                  );

                  return (
                    <tr key={u.id} className="hover:bg-slate-50 transition">
                      <td className="py-3.5 px-4 font-semibold text-slate-900">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-200 text-xs font-bold text-slate-700">
                            {u.email ? u.email.charAt(0).toUpperCase() : "U"}
                          </div>
                          <span>{u.email}</span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        {isOnline ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                            En ligne
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-500">
                            <span className="h-1.5 w-1.5 rounded-full bg-slate-400"></span>
                            Hors ligne
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-xs text-slate-600">
                        {formatFullDate(u.created_at)}
                      </td>

                      <td className="py-3.5 px-4 text-xs text-slate-600">
                        {u.last_sign_in_at ? formatFullDate(u.last_sign_in_at) : "Jamais connecté"}
                      </td>

                      <td className="py-3.5 px-4 text-xs font-semibold text-slate-800">
                        📁 {u.document_count} document{u.document_count > 1 ? "s" : ""}
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="inline-flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-blue-700">
                            {u.storage_mb} Mo
                          </span>
                          <span className="text-[10px] text-slate-400">
                            ({(u.storage_bytes / 1024).toFixed(0)} Ko)
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
