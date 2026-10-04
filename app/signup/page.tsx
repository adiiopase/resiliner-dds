"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    const cleanEmail = email.trim();
    if (!cleanEmail.includes("@")) {
      setError("Veuillez saisir une adresse e-mail valide (ex: utilisateur@domaine.com).");
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError("Le mot de passe doit comporter au moins 6 caractères.");
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
      });

      if (error) {
        setError(error.message);
        return;
      }

      if (data?.user && !data?.session) {
        setSuccess("Compte créé avec succès ! Un e-mail de confirmation vous a été envoyé si la vérification est requise. Vous pouvez vous connecter dès maintenant.");
      } else {
        setSuccess("Compte créé avec succès ! Redirection vers la connexion...");
      }

      setTimeout(() => {
        router.push("/login");
      }, 2000);
    } catch {
      setError("Une erreur inattendue est survenue.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-100 p-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md border border-slate-200">
        <div className="text-center mb-6">
          <a href="/" className="inline-flex items-center gap-1 text-sm font-semibold text-blue-600 hover:text-blue-800 transition">
            ← Retour au site vitrine
          </a>
          <div className="mt-4 inline-flex items-center justify-center w-12 h-12 rounded-xl bg-blue-50 text-blue-600 text-2xl font-bold shadow-sm">
            ✨
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mt-3">Créer un compte DDS</h1>
          <p className="text-sm text-slate-500 mt-1">Rejoignez la plateforme Digital Docs Solutions</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-xl mb-5 text-sm flex items-start gap-2">
            <span className="font-bold text-base leading-none">⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 p-3 rounded-xl mb-5 text-sm flex items-start gap-2">
            <span className="font-bold text-base leading-none">✅</span>
            <span>{success}</span>
          </div>
        )}

        <form onSubmit={handleSignup} autoComplete="off">
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
            <label className="block mb-1.5 text-xs font-bold uppercase tracking-wider text-slate-700">
              Mot de passe
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                className="w-full p-3 pr-10 border border-slate-300 rounded-xl bg-white text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Au moins 6 caractères"
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
                Création en cours...
              </>
            ) : (
              "Créer mon compte"
            )}
          </button>
        </form>

        <div className="mt-6 pt-5 border-t border-slate-200 text-center">
          <p className="text-sm text-slate-600 mb-2">
            Vous possédez déjà un compte DDS ?
          </p>
          <a
            href="/login"
            className="inline-block w-full py-2.5 px-4 rounded-xl border-2 border-slate-300 text-slate-700 font-semibold hover:bg-slate-50 transition text-sm text-center"
          >
            Se connecter
          </a>
        </div>
      </div>
    </div>
  );
}
