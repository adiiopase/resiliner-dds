"use client";

import { Suspense, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setError(error.message);
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

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 p-4">
      <form
        onSubmit={handleLogin}
        className="bg-white p-8 rounded-xl shadow-md w-full max-w-md border border-slate-200"
      >
        <div className="text-center mb-6">
          <a href="/" className="text-sm font-semibold text-blue-600 hover:underline">
            ← Retour au site
          </a>
          <h1 className="text-2xl font-bold text-slate-900 mt-2">Connexion Espace DDS</h1>
          <p className="text-sm text-slate-500 mt-1">Accédez à vos documents et services</p>
        </div>

        {error && (
          <p className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg mb-4 text-sm">
            {error}
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
          placeholder="••••••••"
          required
        />

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-700 text-white p-3 rounded-lg font-semibold hover:bg-blue-800 transition disabled:opacity-50"
        >
          {loading ? "Connexion en cours..." : "Se connecter"}
        </button>

        <p className="mt-6 text-center text-sm text-gray-600">
          Vous n&apos;avez pas encore de compte ?{" "}
          <a href="/signup" className="text-blue-600 font-semibold hover:underline">
            Créer un compte
          </a>
        </p>
      </form>
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
