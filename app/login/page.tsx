"use client";

import { Suspense, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

const ADMIN_EMAIL = "adiiopase@gmail.com";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [adminPin, setAdminPin] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [requiresAdminPin, setRequiresAdminPin] = useState(false);
  const pinPromptVisible = requiresAdminPin || searchParams.get("requiresAdminPin") === "1";

  async function handleLogin(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const cleanEmail = email.trim();
    if (!cleanEmail.includes("@")) {
      setError("Veuillez saisir une adresse e-mail valide (ex: utilisateur@domaine.com). Un identifiant simple ne fonctionne pas.");
      setLoading(false);
      return;
    }

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

      if (error) {
        if (error.message.toLowerCase().includes("invalid login credentials")) {
          setError("Vous devez créer un compte avant de vous connecter si vous n’êtes pas encore inscrit. Si vous avez déjà un compte, vérifiez votre adresse e-mail et votre mot de passe.");
        } else if (error.message.toLowerCase().includes("email not confirmed")) {
          setError("Votre adresse e-mail n'a pas encore été confirmée. Veuillez cliquer sur le lien reçu par e-mail ou contacter l'administrateur.");
        } else {
          setError(error.message);
        }
        return;
      }

      const normalizedEmail = cleanEmail.toLowerCase();
      if (normalizedEmail === ADMIN_EMAIL) {
        setRequiresAdminPin(true);
        setLoading(false);
        return;
      }

      const nextUrl = searchParams.get("next") ?? "/dashboard";
      router.push(nextUrl);
    } catch {
      setError("Connexion impossible. Vérifiez votre réseau puis réessayez.");
    } finally {
      setLoading(false);
    }
  }

  async function handleAdminPinValidation(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/admin/verify-pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin: adminPin }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || "Code PIN administrateur invalide.");
        return;
      }

      const nextUrl = searchParams.get("next") ?? "/dashboard";
      router.push(nextUrl);
    } catch {
      setError("Vérification impossible. Réessaie.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-100 p-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md border border-slate-200">
        <div className="text-center mb-6">
          <Link href="/" className="inline-flex items-center gap-1 text-sm font-semibold text-blue-600 hover:text-blue-800 transition">
            ← Retour au site vitrine
          </Link>
          <div className="mt-4 inline-flex items-center justify-center w-12 h-12 rounded-xl bg-blue-50 text-blue-600 text-2xl font-bold shadow-sm">
            🔐
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mt-3">Connexion Espace SaaS</h1>
          <p className="text-sm text-slate-500 mt-1">
            Saisissez votre e-mail et mot de passe pour accéder à vos documents
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-xl mb-5 text-sm flex items-start gap-2">
            <span className="font-bold text-base leading-none">⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {pinPromptVisible ? (
          <form onSubmit={handleAdminPinValidation} autoComplete="off" className="space-y-4">
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
              Authentification renforcée requise pour le compte administrateur <strong>{ADMIN_EMAIL}</strong>.
            </div>

            <div>
              <label className="block mb-1.5 text-xs font-bold uppercase tracking-wider text-slate-700">
                Code PIN administrateur
              </label>
              <input
                type="password"
                inputMode="numeric"
                autoComplete="one-time-code"
                className="w-full p-3 border border-slate-300 rounded-xl bg-white text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                value={adminPin}
                onChange={(e) => setAdminPin(e.target.value)}
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-amber-600 hover:bg-amber-700 text-white p-3.5 rounded-xl font-bold transition shadow-md hover:shadow-lg"
            >
              {loading ? "Vérification…" : "Valider l’authentification renforcée"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleLogin} autoComplete="off">
            <div className="mb-4">
              <label className="block mb-1.5 text-xs font-bold uppercase tracking-wider text-slate-700">
                Adresse E-mail
              </label>
              <input
                type="email"
                autoComplete="off"
                className="w-full p-3 border border-slate-300 rounded-xl bg-white text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ex: nom@entreprise.com"
                required
              />
            </div>

            <div className="mb-5">
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Mot de passe
                </label>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  className="w-full p-3 pr-10 border border-slate-300 rounded-xl bg-white text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Votre mot de passe"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 text-sm"
                  title={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                >
                  {showPassword ? "🙈" : "👁️"}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white p-3.5 rounded-xl font-bold transition shadow-md hover:shadow-lg disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  Connexion en cours...
                </>
              ) : (
                "Se connecter à mon espace"
              )}
            </button>
          </form>
        )}

        <div className="mt-6 pt-5 border-t border-slate-200 text-center">
          <p className="text-sm text-slate-600 mb-2">
            Vous n&apos;avez pas encore de compte SaaS ?
          </p>
          <a
            href="/signup"
            className="inline-block w-full py-2.5 px-4 rounded-xl border-2 border-blue-600 text-blue-600 font-semibold hover:bg-blue-50 transition text-sm text-center"
          >
            ✨ Créer un nouveau compte
          </a>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-gray-100">
          Chargement...
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
