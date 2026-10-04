"use client";

import { useEffect, useState } from "react";

/**
 * SecurityGuard - Bouclier de Protection Souverain DigitalDocs
 * 1. Empêche la copie et l'affichage des codes sources (Désactivation F12, Ctrl+U, Ctrl+Shift+I, etc.)
 * 2. Bloque le clic droit / menu contextuel sur l'application.
 * 3. Neutralise les tentatives de débogage et d'inspection non autorisées.
 * 4. Nettoie la console JavaScript en production pour éviter la fuite de données ou de jetons.
 */
export default function SecurityGuard() {
  const [showWarning, setShowWarning] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // A. Neutraliser les logs console verbeux en production
    if (process.env.NODE_ENV === "production") {
      const noop = () => {};
      window.console.log = noop;
      window.console.debug = noop;
      window.console.info = noop;
    }

    // Afficher un avertissement souverain dans la console si elle est ouverte
    try {
      console.warn(
        "%c🛡️ DIGITALDOCS SOLUTIONS - ENVIRONNEMENT PROTÉGÉ\n%cToute tentative d'accès non autorisé, de rétro-ingénierie, de décompilation ou d'injection de code est strictement interdite et enregistrée.",
        "color: #1e40af; font-size: 16px; font-weight: bold;",
        "color: #b91c1c; font-size: 12px; font-weight: 600;"
      );
    } catch {
      // ignore
    }

    // B. Bloquer le Clic Droit (Menu Contextuel / Inspecter)
    const handleContextMenu = (e: MouseEvent) => {
      // Autoriser le clic droit uniquement sur les champs de saisie (input, textarea) pour le copier/coller légitime de l'utilisateur
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        return;
      }
      e.preventDefault();
      triggerSecurityWarning();
    };

    // C. Bloquer les Raccourcis Clavier d'Inspection et de Copie Source
    const handleKeyDown = (e: KeyboardEvent) => {
      // 1. Touche F12 (Outils de développement)
      if (e.key === "F12" || e.keyCode === 123) {
        e.preventDefault();
        e.stopPropagation();
        triggerSecurityWarning();
        return;
      }

      const isCtrlOrCmd = e.ctrlKey || e.metaKey;

      // 2. Ctrl + Shift + I (Inspecter)
      // 3. Ctrl + Shift + J (Console)
      // 4. Ctrl + Shift + C (Sélecteur d'éléments)
      // 5. Ctrl + Shift + K (Console Firefox)
      if (
        isCtrlOrCmd &&
        e.shiftKey &&
        ["I", "i", "J", "j", "C", "c", "K", "k"].includes(e.key)
      ) {
        e.preventDefault();
        e.stopPropagation();
        triggerSecurityWarning();
        return;
      }

      // 6. Ctrl + U (Afficher le code source HTML)
      if (isCtrlOrCmd && (e.key === "U" || e.key === "u")) {
        e.preventDefault();
        e.stopPropagation();
        triggerSecurityWarning();
        return;
      }

      // 7. Ctrl + S (Enregistrer la page / aspirer les assets)
      if (isCtrlOrCmd && (e.key === "S" || e.key === "s")) {
        // Autoriser seulement si l'utilisateur est dans un champ texte
        const target = e.target as HTMLElement;
        if (target.tagName !== "INPUT" && target.tagName !== "TEXTAREA") {
          e.preventDefault();
          e.stopPropagation();
          triggerSecurityWarning();
          return;
        }
      }
    };

    // D. Détecteur anti-débogueur en boucle (Protection contre l'altération dynamique)
    let debugInterval: NodeJS.Timeout;
    if (process.env.NODE_ENV === "production") {
      debugInterval = setInterval(() => {
        const startTime = performance.now();
        // Déclencheur timing check
        const check = new Function("debugger");
        check();
        const endTime = performance.now();
        // Si le debugger a suspendu l'exécution (DevTools ouvert)
        if (endTime - startTime > 100) {
          triggerSecurityWarning();
        }
      }, 2000);
    }

    const triggerSecurityWarning = () => {
      setShowWarning(true);
      setTimeout(() => setShowWarning(false), 3000);
    };

    window.addEventListener("contextmenu", handleContextMenu, { capture: true });
    window.addEventListener("keydown", handleKeyDown, { capture: true });

    return () => {
      window.removeEventListener("contextmenu", handleContextMenu, { capture: true });
      window.removeEventListener("keydown", handleKeyDown, { capture: true });
      if (debugInterval) clearInterval(debugInterval);
    };
  }, []);

  if (!showWarning) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[99999] flex items-center gap-3 rounded-2xl border border-red-200 bg-red-950/95 px-5 py-3.5 text-white shadow-2xl backdrop-blur-md animate-fade-in">
      <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-red-600 text-lg">
        🔒
      </span>
      <div>
        <p className="text-xs font-bold text-red-100">
          Code Source & Espace Protégés
        </p>
        <p className="text-[11px] text-red-300">
          L&apos;inspection, le débogage et la copie sont désactivés pour la sécurité de vos documents.
        </p>
      </div>
    </div>
  );
}
