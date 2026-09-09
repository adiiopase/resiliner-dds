"use client";

import React from "react";
import Link from "next/link";
import UserNavigation from "./UserNavigation";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex bg-slate-100 font-sans">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 text-white flex flex-col shrink-0 shadow-xl border-r border-slate-800">
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <Link
            href="/dashboard"
            className="text-lg font-bold text-white hover:text-blue-400 text-decoration-none flex items-center gap-2.5 transition"
          >
            <span className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-sm font-black text-white">
              DDS
            </span>
            <span className="tracking-tight">Portail DDS</span>
          </Link>
        </div>

        <nav className="flex-1 px-4 py-5 overflow-y-auto">
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
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 shadow-sm sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="text-sm md:text-base font-bold text-slate-800 hover:text-blue-600 text-decoration-none flex items-center gap-2 transition"
            >
              <span className="text-blue-600">🛡️</span>
              <span>Espace sécurisé DDS</span>
            </Link>
          </div>

          <div className="flex items-center gap-3 sm:gap-4">
            <Link
              href="/"
              className="text-xs sm:text-sm font-semibold text-slate-600 hover:text-blue-600 text-decoration-none px-2.5 py-1.5 rounded-lg hover:bg-slate-100 transition hidden sm:inline-flex items-center gap-1.5"
            >
              <span>🌐</span> Site vitrine
            </Link>

            <Link
              href="/dashboard"
              className="text-xs sm:text-sm font-semibold text-slate-600 hover:text-blue-600 text-decoration-none px-2.5 py-1.5 rounded-lg hover:bg-slate-100 transition hidden sm:inline-flex items-center gap-1.5"
            >
              <span>📊</span> Dashboard
            </Link>

            <Link
              href="/users"
              className="text-xs sm:text-sm font-semibold text-slate-600 hover:text-blue-600 text-decoration-none px-2.5 py-1.5 rounded-lg hover:bg-slate-100 transition inline-flex items-center gap-1.5"
            >
              <span>👤</span> Compte
            </Link>

            <div className="h-4 w-px bg-slate-200 hidden sm:block" />

            <Link
              href="/logout"
              className="text-xs sm:text-sm font-semibold text-red-600 hover:text-red-800 text-decoration-none px-3 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 transition inline-flex items-center gap-1.5"
            >
              <span>🚪</span> Déconnexion
            </Link>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-6 sm:p-8 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
