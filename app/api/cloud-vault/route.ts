import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/supabaseServer";
import {
  decontaminateDocumentInAirlock,
  CloudOffVaultStatus,
  DecontaminationReport,
} from "@/lib/decontaminationAirlock";
import { SOVEREIGN_REGIONS, SovereignRegion } from "@/lib/sovereignCloud";

// In-memory sovereign state for airlock simulation & vault
let currentRegion: SovereignRegion = "SN_DAKAR";
let lastSyncTimestamp: string = new Date(Date.now() - 3600 * 1000 * 4).toISOString(); // 4 hours ago
let quarantinedThreatsCount = 0;
let cleanDocumentsCount = 24;

const mockReports: DecontaminationReport[] = [
  {
    documentId: "doc-sample-1",
    filename: "facture_fournisseur_orange_ci.pdf",
    sourceSha256: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    cleanSha256: "a1b2c3d4e5f67890123456789abcdef0123456789abcdef0123456789abcdef0",
    stage: "CLOUD_OFF_ISOLATED",
    isClean: true,
    scrubbingDurationMs: 42,
    threatsNeutralized: [
      {
        type: "HIDDEN_SCRIPT",
        severity: "HIGH",
        description: "Balise JavaScript active supprimée dans le PDF (désarmement CDR).",
        actionTaken: "NEUTRALIZED_AND_CLEANED",
      },
    ],
    certifiedAt: new Date(Date.now() - 3600 * 1000 * 4).toISOString(),
    inspectorEngine: "DigitalDocs CDR Sovereign Airlock v1.0",
    airlockSealId: "AIRLOCK-SEAL-SN-9981-DAKAR",
  },
  {
    documentId: "doc-sample-2",
    filename: "releve_bancaire_bici_sn.pdf",
    sourceSha256: "9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08",
    cleanSha256: "b2c3d4e5f6a7890123456789abcdef0123456789abcdef0123456789abcdef01",
    stage: "CLOUD_OFF_ISOLATED",
    isClean: true,
    scrubbingDurationMs: 38,
    threatsNeutralized: [],
    certifiedAt: new Date(Date.now() - 3600 * 1000 * 4).toISOString(),
    inspectorEngine: "DigitalDocs CDR Sovereign Airlock v1.0",
    airlockSealId: "AIRLOCK-SEAL-SN-9982-DAKAR",
  },
];

export async function GET(req: NextRequest) {
  try {
    const { user } = await getAuthenticatedUser(req);
    const regionInfo = SOVEREIGN_REGIONS[currentRegion];

    const vaultStatus: CloudOffVaultStatus = {
      cloudOnStatus: "ONLINE_OPERATIONAL",
      airlockStatus: "IDLE",
      cloudOffStatus: "AIR_GAPPED_ISOLATED",
      totalCleanDocuments: cleanDocumentsCount,
      totalQuarantinedThreats: quarantinedThreatsCount,
      lastSuccessfulSyncAt: lastSyncTimestamp,
      sovereignRegion: regionInfo.country + " (" + regionInfo.location + ")",
      isAirGapped: true,
    };

    return NextResponse.json({
      success: true,
      vaultStatus,
      selectedRegion: regionInfo,
      allRegions: SOVEREIGN_REGIONS,
      recentAirlockReports: mockReports,
      user: user ? { id: user.id, email: user.email } : null,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Erreur serveur Cloud Vault";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { action, region, filename, content } = body;

    // Action 1: Change Sovereign Region
    if (action === "SET_REGION" && region && SOVEREIGN_REGIONS[region as SovereignRegion]) {
      currentRegion = region as SovereignRegion;
      return NextResponse.json({
        success: true,
        message: `Région souveraine mise à jour vers : ${SOVEREIGN_REGIONS[currentRegion].country} (${SOVEREIGN_REGIONS[currentRegion].datacenterName})`,
        region: SOVEREIGN_REGIONS[currentRegion],
      });
    }

    // Action 2: Trigger Airlock Scrubbing & Decontamination
    if (action === "DECONTAMINATE_AIRLOCK") {
      const docFilename = filename || "document_a_rincer.pdf";
      const docContent = content || "Contenu du document à sécuriser avec balise <script>test</script>";

      const report = await decontaminateDocumentInAirlock(
        "doc-" + Date.now(),
        docFilename,
        docContent
      );

      mockReports.unshift(report);
      if (mockReports.length > 20) mockReports.pop();

      if (report.isClean) {
        cleanDocumentsCount++;
        lastSyncTimestamp = new Date().toISOString();
      } else {
        quarantinedThreatsCount++;
      }

      return NextResponse.json({
        success: true,
        report,
        message: report.isClean
          ? "Document rincé et décontaminé avec succès dans l'anti-chambre ! Scellé et transféré au Cloud OFF."
          : "ALERTE : Menace / Échappée solitaire interceptée et bloquée en quarantaine hermétique !",
      });
    }

    // Action 3: Disaster Recovery Restoration
    if (action === "RESTORE_FROM_CLOUD_OFF") {
      return NextResponse.json({
        success: true,
        message: `Restauration souveraine d'urgence exécutée avec succès depuis le Coffre-Fort Déconnecté (${SOVEREIGN_REGIONS[currentRegion].country}). 100% des documents sains restaurés.`,
        restoredAt: new Date().toISOString(),
        totalDocumentsRestored: cleanDocumentsCount,
      });
    }

    return NextResponse.json({ success: false, error: "Action non reconnue." }, { status: 400 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Erreur traitement action Cloud Vault";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
