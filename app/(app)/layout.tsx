"use client";

import React from "react";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import UserNavigation from "./UserNavigation";
import PresenceTracker from "@/components/PresenceTracker";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    setMobileNavOpen(false);
  }, [pathname]);

  return (
    <div className="min-h-screen flex bg-slate-100 font-sans">
      {/* Global Realtime Presence Tracker */}
      <PresenceTracker />

      {mobileNavOpen && (
        <button
          type="button"
          aria-label="Fermer le menu"
          onClick={() => setMobileNavOpen(false)}
          className="fixed inset-0 z-30 bg-slate-950/50 md:hidden"
        />
      )}

      {/* Sidebar */}
      <aside className={`${mobileNavOpen ? "fixed inset-y-0 left-0 z-40 flex w-72 shadow-2xl" : "hidden"} flex-col shrink-0 border-r border-slate-800 bg-slate-900 text-white md:sticky md:top-0 md:flex md:h-screen md:w-64 md:shadow-xl`}>
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <Link
            href="/dashboard"
            onClick={() => setMobileNavOpen(false)}
            className="flex items-center gap-2.5 text-lg font-bold text-white text-decoration-none transition hover:text-blue-400"
          >
            <span className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-sm font-black text-white">
              DDS
            </span>
            <span className="tracking-tight">Portail DDS</span>
          </Link>
          <button
            type="button"
            aria-label="Fermer le menu"
            onClick={() => setMobileNavOpen(false)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-xl text-slate-300 hover:bg-slate-800 md:hidden"
          >
            <span aria-hidden="true">×</span>
          </button>
        </div>

        <nav
          onClick={(event) => {
            if ((event.target as HTMLElement).closest("a")) setMobileNavOpen(false);
          }}
          className="flex-1 overflow-y-auto px-4 py-5"
        >
          <UserNavigation />
        </nav>

        <div className="p-4 border-t border-slate-800 text-xs">
          <Link
            href="/"
            className="text-slate-400 hover:text-white text-decoration-none flex items-center gap-2 transition font-medium"
          >
            <span>←</span> Retour au site public
          </Link>
        </div>
      </aside>

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-slate-200 bg-white px-3 shadow-sm sm:px-6">
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <button
              type="button"
              aria-label="Ouvrir le menu"
              aria-expanded={mobileNavOpen}
              onClick={() => setMobileNavOpen(true)}
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-xl text-slate-700 hover:bg-slate-100 md:hidden"
            >
              <span aria-hidden="true">☰</span>
            </button>
            <Link
              href="/dashboard"
              className="flex min-w-0 items-center gap-2 text-sm font-bold text-slate-800 text-decoration-none transition hover:text-blue-600 md:text-base"
            >
              <span className="text-blue-600">🛡️</span>
              <span className="truncate">Espace sécurisé DDS</span>
            </Link>
          </div>

          <div className="flex shrink-0 items-center gap-1.5 sm:gap-3">
            <Link
              href="/"
              className="hidden items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-600 text-decoration-none transition hover:bg-slate-100 hover:text-blue-600 md:inline-flex md:text-sm"
            >
              <span>🌐</span> Site vitrine
            </Link>

            <Link
              href="/dashboard"
              className="hidden items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-600 text-decoration-none transition hover:bg-slate-100 hover:text-blue-600 md:inline-flex md:text-sm"
            >
              <span>📊</span> Dashboard
            </Link>

            <Link
              href="/users"
              className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-semibold text-slate-600 text-decoration-none transition hover:bg-slate-100 hover:text-blue-600 sm:gap-1.5 sm:px-2.5 sm:text-sm"
            >
              <span>👤</span> Compte
            </Link>

            <div className="hidden h-4 w-px bg-slate-200 sm:block" />

            <Link
              href="/logout"
              className="inline-flex items-center gap-1 rounded-lg bg-red-50 px-2 py-1.5 text-xs font-semibold text-red-600 text-decoration-none transition hover:bg-red-100 hover:text-red-800 sm:gap-1.5 sm:px-3 sm:text-sm"
            >
              <span>🚪</span> Déconnexion
            </Link>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
