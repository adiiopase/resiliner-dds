"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

export default function UserNavigation() {
  const [isManager, setIsManager] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    async function loadRole() {
      const { data } = await supabase.auth.getUser();
      setIsManager(data.user?.app_metadata?.role === "manager");
    }

    void loadRole();
  }, []);

  const linkClass = (path: string) => {
    const active = pathname === path;
    return `flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition text-decoration-none ${
      active
        ? "bg-blue-600 text-white font-semibold shadow-sm"
        : "text-slate-300 hover:bg-slate-800 hover:text-white"
    }`;
  };

  return (
    <div className="space-y-6">
      {/* Navigation Principale */}
      <div className="space-y-1">
        <Link href="/dashboard" className={linkClass("/dashboard")}>
          <span className="text-base">📊</span>
          <span>Dashboard</span>
        </Link>
      </div>

      {/* Documents */}
      <div className="space-y-1">
        <p className="px-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">
          Documents
        </p>
        <Link href="/documents/upload" className={linkClass("/documents/upload")}>
          <span className="text-base">📤</span>
          <span>Upload fichier</span>
        </Link>
        <Link href="/documents" className={linkClass("/documents")}>
          <span className="text-base">📁</span>
          <span>Mes documents</span>
        </Link>
      </div>

      {/* Services & Commandes */}
      <div className="space-y-1">
        <p className="px-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">
          Services & Commandes
        </p>
        <Link href="/nos-produits" className={linkClass("/nos-produits")}>
          <span className="text-base">📦</span>
          <span>Nos produits</span>
        </Link>
        <Link href="/pricing" className={linkClass("/pricing")}>
          <span className="text-base">🏷️</span>
          <span>Tarifs</span>
        </Link>
        <Link href="/commande" className={linkClass("/commande")}>
          <span className="text-base">📝</span>
          <span>Bon de commande</span>
        </Link>
        <Link href="/devis" className={linkClass("/devis")}>
          <span className="text-base">💬</span>
          <span>Demande de devis</span>
        </Link>
      </div>

      {/* Administration réservée aux gestionnaires */}
      {isManager && (
        <div className="space-y-1 pt-3 border-t border-slate-800">
          <p className="px-3 text-[11px] font-bold uppercase tracking-wider text-amber-300 flex items-center gap-1">
            <span>👑</span> Administration
          </p>
          <Link href="/billing" className={linkClass("/billing")}>
            <span className="text-base">💳</span>
            <span>Facturation</span>
          </Link>
          <Link href="/accounting" className={linkClass("/accounting")}>
            <span className="text-base">📈</span>
            <span>Comptabilité</span>
          </Link>
          <Link href="/users" className={linkClass("/users")}>
            <span className="text-base">👥</span>
            <span>Utilisateurs</span>
          </Link>
        </div>
      )}
    </div>
  );
}
