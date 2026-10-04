"use client";

import { useState, useEffect } from "react";
import { SOVEREIGN_REGIONS, SovereignRegion, SovereignRegionInfo } from "@/lib/sovereignCloud";
import { DecontaminationReport, CloudOffVaultStatus } from "@/lib/decontaminationAirlock";

export default function CloudVaultPage() {
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [status, setStatus] = useState<CloudOffVaultStatus | null>(null);
  const [selectedRegion, setSelectedRegion] = useState<SovereignRegionInfo>(SOVEREIGN_REGIONS.SN_DAKAR);
  const [reports, setReports] = useState<DecontaminationReport[]>([]);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" | "info" } | null>(null);

  // Load vault data
  const loadVaultStatus = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/cloud-vault");
      const data = await res.json();
      if (data.success) {
        setStatus(data.vaultStatus);
        setSelectedRegion(data.selectedRegion);
        setReports(data.recentAirlockReports || []);
      }
    } catch (err) {
      console.error("Erreur chargement Cloud Vault :", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadVaultStatus();
  }, []);

  // Change Sovereign Region
  const handleSetRegion = async (regKey: SovereignRegion) => {
    try {
      setActionLoading(true);
      setMessage(null);
      const res = await fetch("/api/cloud-vault", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "SET_REGION", region: regKey }),
      });
      const data = await res.json();
      if (data.success) {
        setSelectedRegion(data.region);
        setMessage({ text: data.message, type: "success" });
        loadVaultStatus();
      }
    } catch {
      setMessage({ text: "Erreur lors du changement de région.", type: "error" });
    } finally {
      setActionLoading(false);
    }
  };

  // Trigger Decontamination & Scrubbing in Airlock
  const handleScrubTest = async (isHostile = false) => {
    try {
      setActionLoading(true);
      setMessage(null);

      const filename = isHostile ? "attaque_ransomware_bloquee.pdf" : "facture_prestation_avec_macro.pdf";
      const content = isHostile
        ? "RANSOM_PAYLOAD: ALL YOUR FILES ARE ENCRYPTED. Pay 2 BTC."
        : "%PDF-1.4 ... <script>eval('alert(1)')</script> ... VBAProject_AutoExec";

      const res = await fetch("/api/cloud-vault", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "DECONTAMINATE_AIRLOCK",
          filename,
          content,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setMessage({
          text: data.message,
          type: data.report.isClean ? "success" : "error",
        });
        loadVaultStatus();
      }
    } catch {
      setMessage({ text: "Erreur lors du rinçage en anti-chambre.", type: "error" });
    } finally {
      setActionLoading(false);
    }
  };

  // Trigger Disaster Recovery Restore
  const handleRestore = async () => {
    const confirm = window.confirm(
      "Êtes-vous sûr de vouloir déclencher la Restauration Souveraine d'Urgence depuis le Coffre-Fort Cloud OFF déconnecté ?"
    );
    if (!confirm) return;

    try {
      setActionLoading(true);
      setMessage(null);
      const res = await fetch("/api/cloud-vault", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "RESTORE_FROM_CLOUD_OFF" }),
      });
      const data = await res.json();
      if (data.success) {
        setMessage({ text: data.message, type: "success" });
      }
    } catch {
      setMessage({ text: "Erreur lors de la restauration.", type: "error" });
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-8 pb-16">
      {/* Header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="rounded-lg bg-indigo-100 px-2.5 py-1 text-xs font-black uppercase tracking-wider text-indigo-800">
              Cyberdéfense & Résilience Souveraine
            </span>
            <span className="flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-800">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Dispositif Cloud ON / Anti-Chambre / Cloud OFF Actif
            </span>
          </div>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-900">
            Cloud Sécurisé & Coffre-Fort Miroir Déconnecté
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Protection absolue contre les cyberattaques et rançongiciels : Anti-Chambre de décontamination (CDR), rinçage des échappées solitaires et miroir isolé Air-Gap.
          </p>
        </div>

        {/* Action Button */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleRestore}
            disabled={actionLoading}
            className="rounded-xl border border-red-300 bg-red-50 px-4 py-2.5 text-xs font-bold text-red-800 shadow-sm hover:bg-red-100 transition disabled:opacity-50 flex items-center gap-1.5"
          >
            <span>🚨</span>
            Restauration d&apos;Urgence (Cloud OFF)
          </button>
        </div>
      </div>

      {message && (
        <div
          className={`rounded-2xl border p-4 text-sm font-medium flex items-center justify-between ${
            message.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-900"
              : message.type === "error"
              ? "border-red-200 bg-red-50 text-red-900"
              : "border-blue-200 bg-blue-50 text-blue-900"
          }`}
        >
          <div className="flex items-center gap-2">
            <span className="text-xl">{message.type === "success" ? "✅" : "⚠️"}</span>
            <span>{message.text}</span>
          </div>
          <button onClick={() => setMessage(null)} className="text-xs font-bold hover:underline">
            Fermer
          </button>
        </div>
      )}

      {/* SECTION 1 : LE SCHÉMA EN 3 NIVEAUX */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
        {/* TIER 1 : CLOUD ON */}
        <div className="rounded-3xl border-2 border-blue-200 bg-gradient-to-b from-blue-50/70 to-white p-6 shadow-sm space-y-4 relative flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="rounded-lg bg-blue-100 px-2.5 py-1 text-[11px] font-black uppercase text-blue-800">
                Niveau 1 • Production
              </span>
              <span className="h-3 w-3 rounded-full bg-emerald-500 animate-ping"></span>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-4xl">🌐</span>
              <div>
                <h3 className="text-lg font-black text-slate-900">Cloud ON (Actif)</h3>
                <p className="text-xs text-slate-500">Environnement vivant au quotidien</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Vos documents sont numérisés, traités par l&apos;OCR souverain et accessibles en direct avec chiffrement transparent <strong>AES-256</strong> et transferts <strong>TLS 1.3</strong>.
            </p>
          </div>

          <div className="rounded-2xl bg-white/90 p-3.5 border border-blue-100 text-xs font-bold text-slate-700 space-y-1.5 shadow-sm">
            <div className="flex justify-between">
              <span className="text-slate-400">Statut :</span>
              <span className="text-emerald-700 font-black">Opérationnel En Ligne</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Chiffrement :</span>
              <span className="font-mono text-blue-700">AES-256 Militaire</span>
            </div>
          </div>
        </div>

        {/* TIER 2 : ANTI-CHAMBRE DE DÉCONTAMINATION */}
        <div className="rounded-3xl border-2 border-amber-300 bg-gradient-to-b from-amber-50/70 to-white p-6 shadow-sm space-y-4 relative flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="rounded-lg bg-amber-100 px-2.5 py-1 text-[11px] font-black uppercase text-amber-900">
                Niveau 2 • SAS Sanitaire
              </span>
              <span className="text-xs font-bold text-amber-700">CDR & Rinçage</span>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-4xl">🧼</span>
              <div>
                <h3 className="text-lg font-black text-slate-900">Anti-Chambre</h3>
                <p className="text-xs text-slate-500">Rinçage des échappées solitaires</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              SAS de quarantaine où les documents sont inspectés, désarmés (scripts/macros neutralisés) et vérifiés sains avant d&apos;autoriser le transfert vers le coffre-fort.
            </p>
          </div>

          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => handleScrubTest(false)}
                disabled={actionLoading}
                className="rounded-xl bg-amber-600 px-3 py-2 text-[11px] font-bold text-white shadow-sm hover:bg-amber-700 transition disabled:opacity-50 text-center"
              >
                🧪 Tester Rinçage
              </button>
              <button
                onClick={() => handleScrubTest(true)}
                disabled={actionLoading}
                className="rounded-xl border border-red-300 bg-red-50 px-3 py-2 text-[11px] font-bold text-red-700 hover:bg-red-100 transition disabled:opacity-50 text-center"
              >
                🛑 Tester Blocage
              </button>
            </div>
            <p className="text-[10px] text-center text-slate-400">Simulation de passage dans l&apos;anti-chambre</p>
          </div>
        </div>

        {/* TIER 3 : CLOUD OFF */}
        <div className="rounded-3xl border-2 border-emerald-300 bg-gradient-to-b from-emerald-50/70 to-white p-6 shadow-sm space-y-4 relative flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="rounded-lg bg-emerald-100 px-2.5 py-1 text-[11px] font-black uppercase text-emerald-900">
                Niveau 3 • Coffre Isolé
              </span>
              <span className="rounded-full bg-emerald-200/80 px-2 py-0.5 text-[10px] font-black text-emerald-900">
                AIR-GAP SCELLÉ
              </span>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-4xl">🔒</span>
              <div>
                <h3 className="text-lg font-black text-slate-900">Cloud OFF (Miroir)</h3>
                <p className="text-xs text-slate-500">Miroir déconnecté & Immuable</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Stockage <strong>WORM (Write Once, Read Many)</strong> hermétiquement déconnecté. Impossible à chiffrer ou effacer par un ransomware, garantissant une reprise d&apos;activité instantanée.
            </p>
          </div>

          <div className="rounded-2xl bg-white/90 p-3.5 border border-emerald-100 text-xs font-bold text-slate-700 space-y-1.5 shadow-sm">
            <div className="flex justify-between">
              <span className="text-slate-400">Documents Sains :</span>
              <span className="text-emerald-800 font-black">{status?.totalCleanDocuments || 24} certifiés</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Menaces Bloquées :</span>
              <span className="text-red-700 font-black">{status?.totalQuarantinedThreats || 0} neutralisées</span>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 2 : SOUVERAINETÉ NATIONALE & SÉLECTION DE LA ZONE DE RÉSIDENCE */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <span>🌍</span> Résidence des Données & Souveraineté Multi-Zones
            </h2>
            <p className="text-xs text-slate-500">
              Choisissez le territoire et le centre de données souverain où résident vos documents (Immunité juridique totale).
            </p>
          </div>
          <span className="rounded-xl bg-slate-100 px-3 py-1.5 text-xs font-black text-slate-800">
            Zone Active : {selectedRegion.flag} {selectedRegion.country}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {(Object.keys(SOVEREIGN_REGIONS) as SovereignRegion[]).map((regKey) => {
            const reg = SOVEREIGN_REGIONS[regKey];
            const isSelected = selectedRegion.id === reg.id;

            return (
              <div
                key={regKey}
                onClick={() => handleSetRegion(regKey)}
                className={`rounded-2xl border-2 p-5 cursor-pointer transition flex flex-col justify-between space-y-3 ${
                  isSelected
                    ? "border-blue-600 bg-blue-50/40 shadow-md ring-2 ring-blue-600/20"
                    : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50"
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-3xl">{reg.flag}</span>
                    {isSelected && (
                      <span className="rounded-full bg-blue-600 text-white px-2 py-0.5 text-[10px] font-black">
                        ACTIF
                      </span>
                    )}
                  </div>
                  <h3 className="font-black text-slate-900 text-sm">{reg.country}</h3>
                  <p className="text-xs font-bold text-blue-700">{reg.datacenterName}</p>
                  <p className="text-[11px] text-slate-500">{reg.location}</p>
                  <p className="text-xs text-slate-600 pt-1">{reg.description}</p>
                </div>

                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <div className="flex flex-wrap gap-1">
                    {reg.complianceBadges.map((badge, bIdx) => (
                      <span
                        key={bIdx}
                        className="rounded bg-slate-100 px-1.5 py-0.5 text-[9px] font-bold text-slate-700"
                      >
                        ✓ {badge}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* SECTION 3 : JOURNAL D'AUDIT DE L'ANTI-CHAMBRE & CERTIFICATS */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <span>📜</span> Journal des Décontaminations & Certificats du SAS Sanitaire
            </h2>
            <p className="text-xs text-slate-500">
              Traçabilité immuable de chaque document rincé dans l&apos;anti-chambre avec scellement SHA-256.
            </p>
          </div>
          <button
            onClick={loadVaultStatus}
            disabled={loading}
            className="rounded-xl border border-slate-300 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
          >
            🔄 Actualiser
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                <th className="py-3 px-4">Document</th>
                <th className="py-3 px-4">Empreinte SHA-256 Scellée</th>
                <th className="py-3 px-4">Statut Anti-Chambre</th>
                <th className="py-3 px-4">Rinçage & Actions CDR</th>
                <th className="py-3 px-4">Horodatage</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {reports.map((rep, idx) => (
                <tr key={idx} className="hover:bg-slate-50/50">
                  <td className="py-3 px-4 font-bold text-slate-900 flex items-center gap-2">
                    <span>📄</span>
                    <span>{rep.filename}</span>
                  </td>
                  <td className="py-3 px-4 font-mono text-[11px] text-slate-500">
                    {rep.cleanSha256.substring(0, 16)}...
                  </td>
                  <td className="py-3 px-4">
                    {rep.isClean ? (
                      <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-black text-emerald-800">
                        ✓ RINCÉ & SAIN
                      </span>
                    ) : (
                      <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-[10px] font-black text-red-800">
                        🛑 QUARANTAINE BLOQUÉE
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-[11px] text-slate-600">
                    {rep.threatsNeutralized && rep.threatsNeutralized.length > 0 ? (
                      <span className="text-amber-700 font-bold">
                        {rep.threatsNeutralized[0].description}
                      </span>
                    ) : (
                      <span className="text-emerald-700 font-medium">Flux 100% intègre</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-slate-400 text-[11px]">
                    {new Date(rep.certifiedAt).toLocaleString("fr-FR")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
