"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function UserNavigation() {
  const [isManager, setIsManager] = useState(false);

  useEffect(() => {
    async function loadRole() {
      const { data } = await supabase.auth.getUser();
      setIsManager(data.user?.app_metadata?.role === "manager");
    }

    loadRole();
  }, []);

  return (
    <>
      <a href="/dashboard" className="block rounded px-3 py-2 hover:bg-blue-800">
        Dashboard
      </a>
      <a href="/documents/upload" className="block rounded px-3 py-2 hover:bg-blue-800">
        Upload de documents
      </a>
      <a href="/documents" className="block rounded px-3 py-2 hover:bg-blue-800">
        Mes documents
      </a>
      <a href="/nos-produits" className="block rounded px-3 py-2 hover:bg-blue-800">
        Nos produits
      </a>
      <a href="/pricing" className="block rounded px-3 py-2 hover:bg-blue-800">
        Tarifs
      </a>
      <a href="/commande" className="block rounded px-3 py-2 hover:bg-blue-800">
        Bon de commande
      </a>
      <a href="/billing" className="block rounded px-3 py-2 hover:bg-blue-800">
        Mes factures
      </a>
      <a href="/devis" className="block rounded px-3 py-2 hover:bg-blue-800">
        Demande de devis
      </a>
      {isManager && (
        <>
          <a href="/users" className="block rounded px-3 py-2 hover:bg-blue-800">
            Utilisateurs
          </a>
          <a href="/billing" className="block rounded px-3 py-2 hover:bg-blue-800">
            Facturation
          </a>
          <a href="/accounting" className="block rounded px-3 py-2 hover:bg-blue-800">
            Comptabilité
          </a>
        </>
      )}
    </>
  );
}
