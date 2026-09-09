"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) {
        setError(error.message);
        return;
      }

      setSuccess("Compte créé avec succès. Redirection vers la page de connexion...");
      setTimeout(() => {
        router.push("/login");
      }, 1500);
    } catch {
      setError("Une erreur inattendue est survenue.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 p-4">
      <form
        onSubmit={handleSignup}
        className="bg-white p-8 rounded-xl shadow-md w-full max-w-md border border-slate-200"
      >
        <div className="text-center mb-6">
          <a href="/" className="text-sm font-semibold text-blue-600 hover:underline">
            ← Retour au site
          </a>
          <h1 className="text-2xl font-bold text-slate-900 mt-2">Créer un compte DDS</h1>
          <p className="text-sm text-slate-500 mt-1">Rejoignez la plateforme Digital Docs Solutions</p>
        </div>

        {error && (
          <p className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg mb-4 text-sm">
            {error}
          </p>
        )}

        {success && (
          <p className="bg-emerald-50 border border-emerald-200 text-emerald-700 p-3 rounded-lg mb-4 text-sm">
            {success}
          </p>
        )}

        <label className="block mb-2 text-sm font-semibold text-slate-700">Email</label>
        <input
          type="email"
          className="w-full p-3 border rounded-lg mb-4 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="votre.email@entreprise.com"
          required
        />

        <label className="block mb-2 text-sm font-semibold text-slate-700">Mot de passe</label>
        <input
          type="password"
          className="w-full p-3 border rounded-lg mb-6 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Au moins 6 caractères"
          required
        />

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-700 text-white p-3 rounded-lg font-semibold hover:bg-blue-800 transition disabled:opacity-50"
        >
          {loading ? "Création en cours..." : "Créer un compte"}
        </button>

        <p className="mt-6 text-center text-sm text-gray-600">
          Vous avez déjà un compte ?{" "}
          <a href="/login" className="text-blue-600 font-semibold hover:underline">
            Se connecter
          </a>
        </p>
      </form>
    </div>
  );
}
