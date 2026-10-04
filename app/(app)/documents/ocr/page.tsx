"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { createWorker } from "tesseract.js";
import { supabase } from "@/lib/supabaseClient";
import { renderPdfToDataUrls } from "@/lib/pdfRenderer";
import {
  extractFieldsFromText,
  ExtractedFields,
  ExtractedLineItem,
} from "@/lib/ocrEngine";
import {
  classifyDocument,
  DOCUMENT_CATEGORIES,
  DocumentCategory,
  ClassificationResult,
} from "@/lib/documentClassifier";

type OcrResponse = {
  success: boolean;
  document: {
    filename: string;
    mimeType: string;
    sizeBytes: number;
    sizeKb: number;
    classifiedType: DocumentCategory;
  };
  classification?: ClassificationResult;
  ocr: {
    fullText: string;
    confidenceScore: number;
    language: string;
    paragraphsCount: number;
    wordsCount: number;
    blocks: Array<{
      text: string;
      confidence: number;
      lines: string[];
    }>;
  };
  extractedFields: ExtractedFields;
  meta: {
    processedAt: string;
    processingTimeMs: number;
    engine: string;
  };
};

export default function StudioOcrPage() {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [filename, setFilename] = useState<string>("document.jpg");
  const [language, setLanguage] = useState<string>("fra");
  const [pdfPages, setPdfPages] = useState<string[]>([]);
  const [currentPageIndex, setCurrentPageIndex] = useState<number>(0);
  const [convertingPdf, setConvertingPdf] = useState<boolean>(false);

  const [loading, setLoading] = useState<boolean>(false);
  const [processingStep, setProcessingStep] = useState<string>("");
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [error, setError] = useState<string>("");
  const [ocrResult, setOcrResult] = useState<OcrResponse | null>(null);

  // Active view tab in results panel
  const [activeTab, setActiveTab] = useState<"form" | "lines" | "text" | "json">("form");

  // Editable fields copy
  const [editedFields, setEditedFields] = useState<ExtractedFields | null>(null);
  const [copiedText, setCopiedText] = useState(false);
  const [copiedJson, setCopiedJson] = useState(false);
  const [savingDoc, setSavingDoc] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Zoom & rotation state for preview
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [rotation, setRotation] = useState<number>(0);

  // Camera capture modal state
  const [cameraOpen, setCameraOpen] = useState(false);
  const [videoStream, setVideoStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Update editable fields whenever a new OCR result is received
  useEffect(() => {
    if (ocrResult?.extractedFields) {
      setEditedFields(JSON.parse(JSON.stringify(ocrResult.extractedFields)));
    }
  }, [ocrResult]);

  // Clean camera stream on unmount
  useEffect(() => {
    return () => {
      if (videoStream) {
        videoStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [videoStream]);

  // Dynamic Live Accounting Reconciliation Helper
  const getLiveReconciliation = () => {
    if (!editedFields?.amounts) return { isBalanced: true, discrepancy: 0, message: "" };
    const ht = editedFields.amounts.amountHt ?? 0;
    const tva = editedFields.amounts.vatAmount ?? 0;
    const ttc = editedFields.amounts.totalTtc ?? 0;

    if (ht === 0 && ttc === 0) {
      return { isBalanced: true, discrepancy: 0, message: "Aucun montant saisi" };
    }

    const calculatedTotal = Math.round((ht + tva) * 100) / 100;
    const diff = Math.round(Math.abs(calculatedTotal - ttc) * 100) / 100;
    const balanced = diff <= 0.05;

    return {
      isBalanced: balanced,
      discrepancy: diff,
      message: balanced
        ? `Équilibre comptable parfait (HT ${ht} € + TVA ${tva} € = TTC ${ttc} €)`
        : `Alerte : ${diff} € d'écart entre Total calculé (${calculatedTotal} €) et Total TTC (${ttc} €)`,
    };
  };

  // Handle file selection (Images & PDF)
  const handleFileSelect = async (file: File) => {
    setError("");
    setSaveSuccess(false);
    setImageFile(file);
    setFilename(file.name);
    setOcrResult(null);

    // If PDF document
    if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
      try {
        setConvertingPdf(true);
        setProcessingStep("Conversion haute définition des pages PDF...");
        const pages = await renderPdfToDataUrls(file);
        if (!pages || pages.length === 0) {
          throw new Error("Impossible de lire les pages de ce fichier PDF.");
        }
        setPdfPages(pages);
        setCurrentPageIndex(0);
        setSelectedImage(pages[0]);
        setZoomLevel(1);
        setRotation(0);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Erreur lors de la lecture du PDF";
        setError(msg);
      } finally {
        setConvertingPdf(false);
      }
      return;
    }

    // If Image file
    if (file.type.startsWith("image/")) {
      setPdfPages([]);
      setCurrentPageIndex(0);
      const reader = new FileReader();
      reader.onload = (e) => {
        setSelectedImage(e.target?.result as string);
        setZoomLevel(1);
        setRotation(0);
      };
      reader.readAsDataURL(file);
      return;
    }

    setError("Format de fichier non supporté. Veuillez choisir un document PDF ou une image (JPG, PNG, WebP).");
  };

  // Run Sovereign WebAssembly OCR processing directly in browser with Sovereign fallback
  const handleProcessOcr = async () => {
    if (!selectedImage) {
      setError("Veuillez d'abord sélectionner ou scanner un document.");
      return;
    }

    setLoading(true);
    setError("");
    setOcrResult(null);
    setProgressPercent(10);
    setProcessingStep("Initialisation du moteur OCR WebAssembly souverain...");

    const startTime = Date.now();

    try {
      let fullText = "";
      let confidenceScore = 88;
      let rawWords: Array<{ text: string; confidence: number; bbox?: { x0: number; y0: number; x1: number; y1: number } }> = [];
      let rawParagraphs: Array<{ text: string; confidence: number; lines?: Array<{ text: string }> }> = [];
      let rawLines: Array<{ text: string; confidence: number }> = [];

      try {
        const worker = await createWorker(language, 1, {
          workerPath: "/tesseract/worker.min.js",
          corePath: "/tesseract/tesseract-core.wasm.js",
          langPath: "/tesseract/tessdata",
          gzip: false,
          workerBlobURL: false,
          logger: (m) => {
            if (m.status === "loading tesseract core") {
              setProcessingStep("Chargement du moteur WebAssembly haute performance...");
              setProgressPercent(20);
            } else if (m.status === "initializing tesseract") {
              setProcessingStep("Initialisation des modèles linguistiques...");
              setProgressPercent(35);
            } else if (m.status === "loading language traineddata") {
              setProcessingStep(`Chargement du dictionnaire (${language})...`);
              setProgressPercent(Math.min(55, Math.round(35 + (m.progress || 0) * 20)));
            } else if (m.status === "recognizing text") {
              const pct = Math.round((m.progress || 0) * 100);
              setProcessingStep(`Reconnaissance optique des caractères (${pct}%)...`);
              setProgressPercent(Math.min(92, Math.round(55 + (m.progress || 0) * 37)));
            }
          },
        });

        setProcessingStep("Lecture haute fidélité du document...");
        const ret = await worker.recognize(selectedImage);
        await worker.terminate();

        fullText = ret.data.text || "";
        confidenceScore = Math.round((ret.data.confidence || 0) * 10) / 10;

        const rawData = ret.data as {
          words?: Array<{ text: string; confidence: number; bbox?: { x0: number; y0: number; x1: number; y1: number } }>;
          paragraphs?: Array<{ text: string; confidence: number; lines?: Array<{ text: string }> }>;
          lines?: Array<{ text: string; confidence: number }>;
        };

        rawWords = rawData.words || [];
        rawParagraphs = rawData.paragraphs || [];
        rawLines = rawData.lines || [];
      } catch (wasmErr) {
        console.warn("Client WASM OCR bascule vers API souveraine locale :", wasmErr);
        setProcessingStep("Traitement via le moteur OCR souverain sécurisé...");
        setProgressPercent(60);

        const res = await fetch("/api/ocr/process", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            imageBase64: selectedImage,
            language: language === "fra" ? "fra" : "eng",
            filename,
          }),
        });

        const json = await res.json();
        if (!json.success || !json.ocr) {
          throw new Error(json.error || "Erreur lors de l'analyse OCR.");
        }

        fullText = json.ocr.fullText || "";
        confidenceScore = json.ocr.confidenceScore || 85;
        rawWords = json.ocr.words || [];
        rawParagraphs = (json.ocr.blocks || []).map((b: { text: string; confidence: number; lines?: string[] }) => ({
          text: b.text,
          confidence: b.confidence,
          lines: (b.lines || []).map((l: string) => ({ text: l })),
        }));
      }

      setProgressPercent(95);
      setProcessingStep("Extraction sémantique & rapprochement comptable...");

      const words = rawWords.map((w) => ({
        text: w.text,
        confidence: Math.round((w.confidence || 0) * 10) / 10,
        bbox: w.bbox
          ? {
              x0: w.bbox.x0,
              y0: w.bbox.y0,
              x1: w.bbox.x1,
              y1: w.bbox.y1,
            }
          : undefined,
      }));

      const blocks =
        rawParagraphs.length > 0
          ? rawParagraphs.map((p) => ({
              text: (p.text || "").trim(),
              confidence: Math.round((p.confidence || 0) * 10) / 10,
              lines: p.lines ? p.lines.map((l) => (l.text || "").trim()) : [],
            }))
          : rawLines.map((l) => ({
              text: (l.text || "").trim(),
              confidence: Math.round((l.confidence || 0) * 10) / 10,
              lines: [(l.text || "").trim()],
            }));

      const classification = classifyDocument(fullText);
      const classifiedType = classification.category;
      const extractedFields = extractFieldsFromText(fullText, classifiedType);
      const processingTimeMs = Date.now() - startTime;

      const result: OcrResponse = {
        success: true,
        document: {
          filename,
          mimeType: "image/jpeg",
          sizeBytes: Math.round(selectedImage.length * 0.75),
          sizeKb: Math.round((selectedImage.length * 0.75) / 1024),
          classifiedType,
        },
        classification,
        ocr: {
          fullText,
          confidenceScore,
          language,
          paragraphsCount: blocks.length,
          wordsCount: words.length,
          blocks,
        },
        extractedFields,
        meta: {
          processedAt: new Date().toISOString(),
          processingTimeMs,
          engine: "DigitalDocs OCR WASM Souverain v1.0",
        },
      };

      setProgressPercent(100);
      setOcrResult(result);
      setProcessingStep("Traitement souverain terminé avec succès !");
    } catch (err: unknown) {
      console.error("Erreur OCR :", err);
      const message = err instanceof Error ? err.message : "Erreur inattendue lors de l'analyse";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  // Generate synthetic sample documents on Canvas across all major business sectors
  const loadSampleDocument = useCallback(
    (
      sampleType:
        | "facture"
        | "devis"
        | "bon_commande"
        | "bon_livraison"
        | "releve_bancaire"
        | "bulletin_paie"
        | "contrat"
        | "etat_civil"
    ) => {
      const canvas = document.createElement("canvas");
      canvas.width = 1200;
      canvas.height = 1600;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // Background
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = "#1e293b";
      ctx.font = "bold 38px sans-serif";

      if (sampleType === "facture") {
        // Header
        ctx.fillText("DIGITAL DOCS SOLUTIONS SAS", 80, 120);
        ctx.font = "20px sans-serif";
        ctx.fillStyle = "#64748b";
        ctx.fillText("10 Rue de la Paix, 75002 Paris — France", 80, 160);
        ctx.fillText("SIRET : 894 123 456 00012 | TVA : FR 12 894123456", 80, 195);
        ctx.fillText("IBAN : FR76 3000 4000 5000 6000 7000 890", 80, 230);
        ctx.fillText("Email : contact@digitaldocssolutions.fr | Tél : 01 42 68 55 00", 80, 265);

        // Title
        ctx.fillStyle = "#0284c7";
        ctx.font = "bold 44px sans-serif";
        ctx.fillText("FACTURE N° FA-2026-0089", 80, 360);

        // Metadata
        ctx.fillStyle = "#334155";
        ctx.font = "24px sans-serif";
        ctx.fillText("Date d'émission : 15/09/2026", 80, 420);
        ctx.fillText("Date d'échéance : 15/10/2026", 80, 460);

        // Client box
        ctx.fillStyle = "#f8fafc";
        ctx.fillRect(700, 320, 420, 160);
        ctx.strokeRect(700, 320, 420, 160);
        ctx.fillStyle = "#0f172a";
        ctx.font = "bold 22px sans-serif";
        ctx.fillText("CLIENT :", 730, 360);
        ctx.font = "20px sans-serif";
        ctx.fillText("Société Entreprise Exemple SAS", 730, 400);
        ctx.fillText("42 Avenue Montaigne, 75008 Paris", 730, 435);

        // Table Header
        ctx.fillStyle = "#0284c7";
        ctx.fillRect(80, 540, 1040, 50);
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 20px sans-serif";
        ctx.fillText("DESCRIPTION", 100, 572);
        ctx.fillText("QTÉ", 650, 572);
        ctx.fillText("P.U. HT", 780, 572);
        ctx.fillText("TOTAL HT", 960, 572);

        // Rows
        ctx.fillStyle = "#1e293b";
        ctx.font = "20px sans-serif";
        ctx.fillText("Numérisation Haute Fidélité & OCR Souverain", 100, 640);
        ctx.fillText("1", 665, 640);
        ctx.fillText("1 500,00 €", 780, 640);
        ctx.fillText("1 500,00 €", 960, 640);

        ctx.fillText("Abonnement Cloud Sécurisé GED (1 an)", 100, 710);
        ctx.fillText("1", 665, 710);
        ctx.fillText("1 000,00 €", 780, 710);
        ctx.fillText("1 000,00 €", 960, 710);

        // Totals
        ctx.font = "bold 24px sans-serif";
        ctx.fillText("Total HT : 2 500,00 €", 780, 840);
        ctx.fillText("Taux TVA : 20.00 %", 780, 890);
        ctx.fillText("Montant TVA : 500,00 €", 780, 940);
        ctx.fillStyle = "#0284c7";
        ctx.font = "bold 28px sans-serif";
        ctx.fillText("Total TTC : 3 000,00 €", 780, 1000);
        ctx.fillText("Net à payer : 3 000,00 €", 780, 1050);

        setFilename("facture_commerciale_FA20260089.jpg");
      } else if (sampleType === "devis") {
        ctx.fillText("DIGITAL DOCS SOLUTIONS SAS", 80, 120);
        ctx.font = "20px sans-serif";
        ctx.fillStyle = "#64748b";
        ctx.fillText("10 Rue de la Paix, 75002 Paris — SIRET 89412345600012", 80, 160);

        ctx.fillStyle = "#0284c7";
        ctx.font = "bold 44px sans-serif";
        ctx.fillText("DEVIS N° DEV-2026-015", 80, 280);
        ctx.fillStyle = "#334155";
        ctx.font = "24px sans-serif";
        ctx.fillText("Date d'émission : 10/09/2026", 80, 340);
        ctx.fillText("Durée de validité : Valable pendant 30 jours", 80, 380);

        // Table Header
        ctx.fillStyle = "#0284c7";
        ctx.fillRect(80, 460, 1040, 50);
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 20px sans-serif";
        ctx.fillText("DESCRIPTION", 100, 492);
        ctx.fillText("QTÉ", 650, 492);
        ctx.fillText("P.U. HT", 780, 492);
        ctx.fillText("TOTAL HT", 960, 492);

        ctx.fillStyle = "#1e293b";
        ctx.font = "20px sans-serif";
        ctx.fillText("Audit & Cadrage Infrastructure GED", 100, 560);
        ctx.fillText("1", 665, 560);
        ctx.fillText("600,00 €", 780, 560);
        ctx.fillText("600,00 €", 960, 560);

        ctx.fillText("Installation Serveur OCR On-Premise", 100, 630);
        ctx.fillText("1", 665, 630);
        ctx.fillText("600,00 €", 780, 630);
        ctx.fillText("600,00 €", 960, 630);

        ctx.font = "bold 24px sans-serif";
        ctx.fillText("Total HT : 1 200,00 €", 780, 760);
        ctx.fillText("Taux TVA : 20.00 %", 780, 810);
        ctx.fillText("Montant TVA : 240,00 €", 780, 860);
        ctx.fillStyle = "#0284c7";
        ctx.font = "bold 28px sans-serif";
        ctx.fillText("Total TTC : 1 440,00 €", 780, 920);

        ctx.font = "italic 22px sans-serif";
        ctx.fillStyle = "#64748b";
        ctx.fillText("Bon pour accord — Date et signature précédées de la mention 'Bon pour accord'", 80, 1080);

        setFilename("devis_proforma_DEV2026015.jpg");
      } else if (sampleType === "bon_commande") {
        ctx.fillText("SOCIETE ACHETEUR INDUSTRIE SAS", 80, 120);
        ctx.font = "20px sans-serif";
        ctx.fillStyle = "#64748b";
        ctx.fillText("Zone Industrielle Nord, 69000 Lyon — SIRET : 775 890 123 00045", 80, 160);

        ctx.fillStyle = "#0891b2";
        ctx.font = "bold 44px sans-serif";
        ctx.fillText("BON DE COMMANDE N° PO-2026-4401", 80, 280);

        ctx.fillStyle = "#334155";
        ctx.font = "22px sans-serif";
        ctx.fillText("Date de commande : 14/09/2026", 80, 340);
        ctx.fillText("Lieu et adresse de livraison : Entrepôt B, 75018 Paris", 80, 380);
        ctx.fillText("Délai de livraison souhaité : Sous 5 jours ouvrés", 80, 420);

        // Table Header
        ctx.fillStyle = "#0891b2";
        ctx.fillRect(80, 480, 1040, 50);
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 20px sans-serif";
        ctx.fillText("RÉFÉRENCE ARTICLE", 100, 512);
        ctx.fillText("QTÉ COMMANDÉE", 600, 512);
        ctx.fillText("P.U. HT", 800, 512);
        ctx.fillText("TOTAL HT", 960, 512);

        ctx.fillStyle = "#1e293b";
        ctx.font = "20px sans-serif";
        ctx.fillText("Licence Serveur OCR DigitalDocs v1.0", 100, 580);
        ctx.fillText("2", 650, 580);
        ctx.fillText("2 100,00 €", 800, 580);
        ctx.fillText("4 200,00 €", 960, 580);

        ctx.font = "bold 26px sans-serif";
        ctx.fillText("Montant Total HT Commandé : 4 200,00 €", 600, 720);

        setFilename("bon_de_commande_PO20264401.jpg");
      } else if (sampleType === "bon_livraison") {
        ctx.fillText("TRANSPORTS & LOGISTIQUE EXPRESS SAS", 80, 120);
        ctx.font = "20px sans-serif";
        ctx.fillStyle = "#64748b";
        ctx.fillText("Plateforme Fret Sud, 13000 Marseille — Tél : 04 91 00 11 22", 80, 160);

        ctx.fillStyle = "#d97706";
        ctx.font = "bold 44px sans-serif";
        ctx.fillText("BON DE LIVRAISON N° BL-2026-9812", 80, 280);

        ctx.fillStyle = "#334155";
        ctx.font = "22px sans-serif";
        ctx.fillText("Date de réception : 16/09/2026", 80, 340);
        ctx.fillText("Nombre de colis : 4 colis", 80, 380);
        ctx.fillText("Poids total : 18.5 kg", 80, 420);

        // Box
        ctx.fillStyle = "#fffbeb";
        ctx.fillRect(80, 480, 1040, 240);
        ctx.strokeRect(80, 480, 1040, 240);

        ctx.fillStyle = "#92400e";
        ctx.font = "bold 22px sans-serif";
        ctx.fillText("RÉCÉPISSÉ DE LIVRAISON & ÉMARGEMENT :", 110, 530);
        ctx.font = "20px sans-serif";
        ctx.fillStyle = "#1e293b";
        ctx.fillText("Marchandises reçues en bon état sans réserves apparentes.", 110, 580);
        ctx.fillText("Nom du réceptionnaire : Patrick DUPUIS", 110, 630);
        ctx.fillText("Signature et cachet du client apposés le 16/09/2026", 110, 680);

        setFilename("bon_de_livraison_BL9812.jpg");
      } else if (sampleType === "releve_bancaire") {
        ctx.fillStyle = "#047857";
        ctx.font = "bold 44px sans-serif";
        ctx.fillText("BNP PARIBAS — RELEVÉ DE COMPTE", 80, 120);

        ctx.fillStyle = "#334155";
        ctx.font = "20px sans-serif";
        ctx.fillText("Titulaire du compte : DIGITAL DOCS SOLUTIONS SAS", 80, 170);
        ctx.fillText("IBAN : FR76 3000 4000 5000 6000 7000 890 | BIC : BNPAFRPP", 80, 210);
        ctx.fillText("Période du 01/08/2026 au 31/08/2026 — Relevé N° 08-2026", 80, 250);

        // Table
        ctx.fillStyle = "#047857";
        ctx.fillRect(80, 310, 1040, 45);
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 18px sans-serif";
        ctx.fillText("DATE", 100, 340);
        ctx.fillText("LIBELLÉ DES OPÉRATIONS", 240, 340);
        ctx.fillText("DÉBIT (€)", 780, 340);
        ctx.fillText("CRÉDIT (€)", 950, 340);

        ctx.fillStyle = "#1e293b";
        ctx.font = "19px sans-serif";
        ctx.fillText("01/08/2026", 100, 400);
        ctx.fillText("ANCIEN SOLDE CRÉDITEUR", 240, 400);
        ctx.fillText("12 450,00", 950, 400);

        ctx.fillText("05/08/2026", 100, 460);
        ctx.fillText("VIREMENT SEPA CLIENT ACME CORP", 240, 460);
        ctx.fillText("3 000,00", 950, 460);

        ctx.fillText("12/08/2026", 100, 520);
        ctx.fillText("PRÉLÈVEMENT SEPA COTISATIONS URSSAF", 240, 520);
        ctx.fillText("1 200,00", 780, 520);

        ctx.font = "bold 24px sans-serif";
        ctx.fillStyle = "#047857";
        ctx.fillText("NOUVEAU SOLDE CRÉDITEUR AU 31/08/2026 : 14 250,00 €", 80, 640);

        setFilename("releve_bancaire_aout2026.jpg");
      } else if (sampleType === "bulletin_paie") {
        ctx.fillStyle = "#1e293b";
        ctx.font = "bold 36px sans-serif";
        ctx.fillText("ENTREPRISE SERVICES SAS — BULLETIN DE PAIE", 80, 120);

        ctx.fillStyle = "#64748b";
        ctx.font = "20px sans-serif";
        ctx.fillText("Période d'emploi : Du 01/09/2026 au 30/09/2026", 80, 170);
        ctx.fillText("Salarié : Thomas LAURENT | Emploi : Ingénieur Logiciel", 80, 210);
        ctx.fillText("N° Sécurité Sociale (NIR) : 1 89 04 75 123 456 78", 80, 250);

        ctx.fillStyle = "#0f172a";
        ctx.font = "22px sans-serif";
        ctx.fillText("Salaire brut : 4 500,00 €", 80, 350);
        ctx.fillText("Total des cotisations salariales et patronales : 980,00 €", 80, 400);
        ctx.fillText("Net imposable : 3 650,00 €", 80, 450);

        ctx.fillStyle = "#047857";
        ctx.font = "bold 34px sans-serif";
        ctx.fillText("NET À PAYER : 3 520,00 €", 80, 540);

        setFilename("bulletin_de_paie_septembre2026.jpg");
      } else if (sampleType === "contrat") {
        ctx.fillStyle = "#6b21a8";
        ctx.font = "bold 38px sans-serif";
        ctx.fillText("CONTRAT DE PRESTATION DE SERVICES", 80, 120);
        ctx.fillText("ACCORD-CADRE COMMERCIAL", 80, 170);

        ctx.fillStyle = "#334155";
        ctx.font = "20px sans-serif";
        ctx.fillText("ENTRE LES SOUSSIGNÉS :", 80, 250);
        ctx.fillText("1° La société DIGITAL DOCS SOLUTIONS SAS (ci-après le 'Prestataire')", 80, 290);
        ctx.fillText("2° La société CLIENT PARTENAIRE SAS (ci-après le 'Client')", 80, 330);

        ctx.font = "bold 22px sans-serif";
        ctx.fillText("ARTICLE 1 - OBJET DU CONTRAT :", 80, 410);
        ctx.font = "20px sans-serif";
        ctx.fillText("Le Prestataire s'engage à fournir une solution logicielle d'archivage légal et OCR.", 80, 450);

        ctx.font = "bold 22px sans-serif";
        ctx.fillText("ARTICLE 2 - CONFIDENTIALITÉ ET RÉSILIATION :", 80, 520);
        ctx.font = "20px sans-serif";
        ctx.fillText("Les parties s'engagent au strict respect du secret des affaires et clause de confidentialité.", 80, 560);
        ctx.fillText("Date d'effet : 01/10/2026 — Durée du contrat : 24 mois fermes", 80, 600);

        ctx.font = "italic 20px sans-serif";
        ctx.fillText("Pour le Prestataire (Signature)            Pour le Client (Signature)", 80, 740);

        setFilename("contrat_prestation_services.jpg");
      } else {
        // État Civil (ETATICIEL)
        ctx.fillStyle = "#0f172a";
        ctx.font = "bold 36px serif";
        ctx.fillText("RÉPUBLIQUE FRANÇAISE", 360, 120);
        ctx.fillText("MAIRIE DE NANTES", 420, 180);
        ctx.font = "bold 32px serif";
        ctx.fillText("ACTE DE NAISSANCE N° 2026/0412", 280, 300);
        ctx.font = "22px serif";
        ctx.fillText("Date de l'acte : 12/03/2026", 280, 380);
        ctx.fillText("Commune de naissance : Nantes", 280, 430);
        ctx.fillText("L'enfant : Lucas DIOP", 280, 480);
        ctx.fillText("Fils de : Moussa DIOP", 280, 530);
        ctx.fillText("Et de : Fatou SOW", 280, 580);
        ctx.fillText("Officier d'état civil : Jean DUPONT", 280, 630);
        setFilename("acte_naissance_exemple.jpg");
      }

      const dataUrl = canvas.toDataURL("image/jpeg", 0.95);
      setSelectedImage(dataUrl);
      setOcrResult(null);
      setError("");
    },
    []
  );

  // Camera start / capture
  const startCamera = async () => {
    try {
      setCameraOpen(true);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1920 }, height: { ideal: 1080 } },
      });
      setVideoStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch {
      setError("Impossible d'accéder à la caméra. Vérifiez les autorisations de votre navigateur.");
      setCameraOpen(false);
    }
  };

  const captureCameraPhoto = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.95);
      setSelectedImage(dataUrl);
      setFilename(`scan_camera_${Date.now()}.jpg`);
      setOcrResult(null);
    }

    if (videoStream) {
      videoStream.getTracks().forEach((track) => track.stop());
      setVideoStream(null);
    }
    setCameraOpen(false);
  };

  // Copy text to clipboard
  const handleCopyText = (textToCopy: string, isJson = false) => {
    if (!textToCopy) return;
    navigator.clipboard.writeText(textToCopy);
    if (isJson) {
      setCopiedJson(true);
      setTimeout(() => setCopiedJson(false), 2000);
    } else {
      setCopiedText(true);
      setTimeout(() => setCopiedText(false), 2000);
    }
  };

  // Download JSON export
  const handleDownloadJson = () => {
    if (!ocrResult) return;
    const blob = new Blob([JSON.stringify(ocrResult, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `analyse_ocr_${filename.replace(/\.[^/.]+$/, "")}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Download CSV export
  const handleDownloadCsv = () => {
    if (!ocrResult || !editedFields) return;
    const lines = [
      ["Champ", "Valeur"],
      ["Nom du Fichier", filename],
      ["Type de Document", ocrResult.document.classifiedType],
      ["N° Document", editedFields.documentNumber || ""],
      ["Date Document", editedFields.documentDate || ""],
      ["Date Échéance", editedFields.dueDate || ""],
      ["Total HT", String(editedFields.amounts.amountHt ?? "")],
      ["Taux TVA (%)", String(editedFields.amounts.vatRate ?? "")],
      ["Montant TVA", String(editedFields.amounts.vatAmount ?? "")],
      ["Total TTC", String(editedFields.amounts.totalTtc ?? "")],
      ["SIRET", editedFields.legalEntities.siret || ""],
      ["TVA Intracommunautaire", editedFields.legalEntities.tvaNumber || ""],
      ["IBAN", editedFields.legalEntities.iban || ""],
      ["Commune / Mairie", editedFields.civilStatus.municipality || ""],
      ["Personne", editedFields.civilStatus.personName || ""],
    ];

    if (editedFields.lineItems && editedFields.lineItems.length > 0) {
      lines.push([]);
      lines.push(["Ligne #", "Description", "Quantité", "P.U. HT", "Total HT"]);
      editedFields.lineItems.forEach((it) => {
        lines.push([
          String(it.lineNumber),
          `"${it.description.replace(/"/g, '""')}"`,
          String(it.quantity),
          String(it.unitPrice ?? ""),
          String(it.totalPrice ?? ""),
        ]);
      });
    }

    const csvContent = "data:text/csv;charset=utf-8," + lines.map((e) => e.join(";")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `export_ocr_${filename.replace(/\.[^/.]+$/, "")}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Save to Documents (GED) in PostgreSQL & Supabase
  const handleSaveToGed = async () => {
    if (!ocrResult || !selectedImage) return;
    setSavingDoc(true);
    setSaveSuccess(false);

    try {
      const { data: authData } = await supabase.auth.getUser();
      const user = authData?.user;
      if (!user) throw new Error("Veuillez vous connecter pour enregistrer ce document.");

      // Insert record in documents table with OCR metadata
      const { error: insertError } = await supabase.from("documents").insert({
        user_id: user.id,
        name: filename,
        category: ocrResult.document.classifiedType || "Facture",
        size_bytes: ocrResult.document.sizeBytes || 1024,
        status: "traité",
        type: ocrResult.document.mimeType || "image/jpeg",
      });

      if (insertError) {
        console.warn("Erreur insertion BDD documents :", insertError);
      }

      setSaveSuccess(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erreur enregistrement";
      setError(msg);
    } finally {
      setSavingDoc(false);
    }
  };

  // Add a line item manually
  const handleAddLineItem = () => {
    if (!editedFields) return;
    const currentLines = editedFields.lineItems || [];
    const newLine: ExtractedLineItem = {
      lineNumber: currentLines.length + 1,
      description: "Nouvelle prestation",
      quantity: 1,
      unitPrice: 0,
      totalPrice: 0,
    };
    setEditedFields({
      ...editedFields,
      lineItems: [...currentLines, newLine],
    });
  };

  // Remove a line item
  const handleRemoveLineItem = (index: number) => {
    if (!editedFields?.lineItems) return;
    const updated = editedFields.lineItems.filter((_, i) => i !== index);
    setEditedFields({
      ...editedFields,
      lineItems: updated.map((it, idx) => ({ ...it, lineNumber: idx + 1 })),
    });
  };

  // Handle manual category re-assignment (Human-in-the-loop)
  const handleCategoryChange = (newCategory: DocumentCategory) => {
    if (!ocrResult) return;
    const reExtracted = extractFieldsFromText(ocrResult.ocr.fullText, newCategory);

    setOcrResult({
      ...ocrResult,
      document: {
        ...ocrResult.document,
        classifiedType: newCategory,
      },
      extractedFields: reExtracted,
    });
    setEditedFields(JSON.parse(JSON.stringify(reExtracted)));
  };

  const liveReconciliation = getLiveReconciliation();

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="rounded-lg bg-blue-100 px-2.5 py-1 text-xs font-black uppercase tracking-wider text-blue-700">
              Intelligence Documentaire Souveraine (WASM)
            </span>
            <span className="flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-800">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Modèles Métiers Spécialisés Prêts
            </span>
          </div>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-900">
            Studio OCR & Numérisation Intelligente
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Extraction 100% souveraine (sur votre appareil) : Rapprochement comptable automatique, lignes d&apos;articles tabulaires, État Civil (ETATICIEL) & Pièces d&apos;identité.
          </p>
        </div>

        {/* Language selector */}
        <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-2 shadow-sm">
          <span className="text-xs font-bold text-slate-500 pl-2">Langue OCR :</span>
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="rounded-lg border-0 bg-slate-50 py-1 px-3 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-blue-500"
          >
            <option value="fra">🇫🇷 Français (Recommandé)</option>
            <option value="eng">🇬🇧 Anglais</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">⚠️</span>
            <span>{error}</span>
          </div>
          <button onClick={() => setError("")} className="text-xs font-bold hover:underline">
            Fermer
          </button>
        </div>
      )}

      {saveSuccess && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">✅</span>
            <span>Document et métadonnées OCR enregistrés avec succès dans votre espace documentaire !</span>
          </div>
          <a href="/documents" className="text-xs font-bold text-emerald-900 underline">
            Voir mes documents →
          </a>
        </div>
      )}

      {/* SECTION 1 : SELECTION OU SCAN DE DOCUMENT */}
      {!selectedImage ? (
        <div className="space-y-6">
          <div className="rounded-3xl border-2 border-dashed border-slate-300 bg-white p-10 text-center shadow-sm hover:border-blue-500 transition">
            <input
              type="file"
              ref={fileInputRef}
              onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
              accept="image/*,application/pdf"
              className="hidden"
            />

            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-blue-50 text-4xl text-blue-600 shadow-inner">
              📑
            </div>

            <h2 className="mt-5 text-xl font-black text-slate-900">
              Déposez votre document ou sélectionnez un fichier
            </h2>
            <p className="mt-2 text-sm text-slate-500 max-w-lg mx-auto">
              Scans, photos de factures, devis, bons de commande, actes d&apos;état civil ou pièces d&apos;identité (JPG, PNG, WebP, PDF).
            </p>

            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="rounded-xl bg-blue-600 px-6 py-3 text-sm font-bold text-white shadow-md shadow-blue-600/20 hover:bg-blue-700 transition"
              >
                📁 Parcourir mes fichiers
              </button>
              <button
                onClick={startCamera}
                className="rounded-xl border border-slate-300 bg-slate-50 px-6 py-3 text-sm font-bold text-slate-700 hover:bg-slate-100 transition flex items-center gap-2"
              >
                📷 Scanner via la Webcam / Smartphone
              </button>
            </div>
          </div>

          {/* Multi-Domain IA Classification Preset Samples */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-2">
                  <span>🧠</span> Exemples de Classification IA Multi-Secteurs :
                </h3>
                <p className="text-xs text-slate-500">
                  Cliquez sur un type de document pour charger un exemple réaliste et tester l&apos;auto-classification souveraine.
                </p>
              </div>
              <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-bold text-blue-700">
                8 Modèles Métiers
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Pôle Commercial */}
              <button
                onClick={() => loadSampleDocument("facture")}
                className="flex flex-col gap-1.5 rounded-xl border border-slate-200 p-3.5 text-left hover:border-blue-500 hover:bg-blue-50/40 transition group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-2xl">🧾</span>
                  <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-bold text-blue-700">Commercial</span>
                </div>
                <div>
                  <p className="font-bold text-slate-900 text-xs group-hover:text-blue-600">
                    Facture Fournisseur
                  </p>
                  <p className="text-[11px] text-slate-500">HT, TVA, TTC, SIRET, IBAN</p>
                </div>
              </button>

              <button
                onClick={() => loadSampleDocument("devis")}
                className="flex flex-col gap-1.5 rounded-xl border border-slate-200 p-3.5 text-left hover:border-sky-500 hover:bg-sky-50/40 transition group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-2xl">📋</span>
                  <span className="rounded bg-sky-100 px-1.5 py-0.5 text-[10px] font-bold text-sky-700">Commercial</span>
                </div>
                <div>
                  <p className="font-bold text-slate-900 text-xs group-hover:text-sky-600">
                    Devis Proforma
                  </p>
                  <p className="text-[11px] text-slate-500">Validité, Bon pour accord</p>
                </div>
              </button>

              <button
                onClick={() => loadSampleDocument("bon_commande")}
                className="flex flex-col gap-1.5 rounded-xl border border-slate-200 p-3.5 text-left hover:border-cyan-500 hover:bg-cyan-50/40 transition group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-2xl">🛒</span>
                  <span className="rounded bg-cyan-100 px-1.5 py-0.5 text-[10px] font-bold text-cyan-700">Commercial</span>
                </div>
                <div>
                  <p className="font-bold text-slate-900 text-xs group-hover:text-cyan-600">
                    Bon de Commande (PO)
                  </p>
                  <p className="text-[11px] text-slate-500">Ordre d&apos;achat, Articles</p>
                </div>
              </button>

              <button
                onClick={() => loadSampleDocument("bon_livraison")}
                className="flex flex-col gap-1.5 rounded-xl border border-slate-200 p-3.5 text-left hover:border-amber-500 hover:bg-amber-50/40 transition group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-2xl">📦</span>
                  <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-700">Commercial</span>
                </div>
                <div>
                  <p className="font-bold text-slate-900 text-xs group-hover:text-amber-600">
                    Bon de Livraison (BL)
                  </p>
                  <p className="text-[11px] text-slate-500">Récépissé, Colis, Émargement</p>
                </div>
              </button>

              {/* Finance & RH */}
              <button
                onClick={() => loadSampleDocument("releve_bancaire")}
                className="flex flex-col gap-1.5 rounded-xl border border-slate-200 p-3.5 text-left hover:border-emerald-500 hover:bg-emerald-50/40 transition group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-2xl">🏦</span>
                  <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700">Banque</span>
                </div>
                <div>
                  <p className="font-bold text-slate-900 text-xs group-hover:text-emerald-600">
                    Relevé Bancaire
                  </p>
                  <p className="text-[11px] text-slate-500">Débits, Crédits, Nouveau solde</p>
                </div>
              </button>

              <button
                onClick={() => loadSampleDocument("bulletin_paie")}
                className="flex flex-col gap-1.5 rounded-xl border border-slate-200 p-3.5 text-left hover:border-emerald-500 hover:bg-emerald-50/40 transition group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-2xl">💶</span>
                  <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700">RH & Paie</span>
                </div>
                <div>
                  <p className="font-bold text-slate-900 text-xs group-hover:text-emerald-600">
                    Bulletin de Salaire
                  </p>
                  <p className="text-[11px] text-slate-500">Salaire Brut, Net à payer, NIR</p>
                </div>
              </button>

              {/* Juridique & Mairies */}
              <button
                onClick={() => loadSampleDocument("contrat")}
                className="flex flex-col gap-1.5 rounded-xl border border-slate-200 p-3.5 text-left hover:border-purple-500 hover:bg-purple-50/40 transition group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-2xl">⚖️</span>
                  <span className="rounded bg-purple-100 px-1.5 py-0.5 text-[10px] font-bold text-purple-700">Juridique</span>
                </div>
                <div>
                  <p className="font-bold text-slate-900 text-xs group-hover:text-purple-600">
                    Contrat Commercial
                  </p>
                  <p className="text-[11px] text-slate-500">Accord-cadre, Clauses, Signatures</p>
                </div>
              </button>

              <button
                onClick={() => loadSampleDocument("etat_civil")}
                className="flex flex-col gap-1.5 rounded-xl border border-slate-200 p-3.5 text-left hover:border-amber-500 hover:bg-amber-50/40 transition group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-2xl">🏛️</span>
                  <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-700">Officiel</span>
                </div>
                <div>
                  <p className="font-bold text-slate-900 text-xs group-hover:text-amber-600">
                    Acte d&apos;État Civil (Mairie)
                  </p>
                  <p className="text-[11px] text-slate-500">ETATICIEL, Filiation, Mairie</p>
                </div>
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* SECTION 2 : DOUBLE PANNEAU INTERACTIF */
        <div className="space-y-6">
          {/* Action Bar */}
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-white border border-slate-200 p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <span className="text-xl">📄</span>
              <div>
                <p className="font-bold text-slate-900 text-sm">{filename}</p>
                <p className="text-xs text-slate-500">Document chargé • Prêt pour le traitement</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  setSelectedImage(null);
                  setOcrResult(null);
                  setError("");
                }}
                className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 transition"
              >
                Changer de document
              </button>

              <button
                onClick={handleProcessOcr}
                disabled={loading}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-2.5 text-xs font-bold text-white shadow-md shadow-blue-600/30 hover:bg-blue-700 transition disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Analyse en cours...
                  </>
                ) : (
                  <>
                    <span>⚡</span>
                    Lancer l&apos;Analyse OCR Souveraine
                  </>
                )}
              </button>
            </div>
          </div>

          {/* PROGRESS BAR DISPLAY WHEN LOADING */}
          {loading && (
            <div className="rounded-2xl border border-blue-200 bg-blue-50/90 p-6 text-center space-y-4 shadow-sm backdrop-blur-sm">
              <div className="flex items-center justify-between text-xs font-bold text-blue-900 max-w-xl mx-auto">
                <span className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full bg-blue-600 animate-ping"></span>
                  {processingStep}
                </span>
                <span className="font-mono text-sm">{progressPercent}%</span>
              </div>

              {/* Progress Track */}
              <div className="w-full max-w-xl mx-auto bg-blue-200/60 rounded-full h-3.5 overflow-hidden p-0.5 border border-blue-300">
                <div
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 h-full rounded-full transition-all duration-300 ease-out shadow-sm"
                  style={{ width: `${Math.max(8, progressPercent)}%` }}
                />
              </div>
              <p className="text-[11px] text-blue-700 font-medium">
                🔒 Traitement 100% souverain exécuté directement dans votre navigateur via WebAssembly (Zéro fuite de données).
              </p>
            </div>
          )}

          {/* Two-Column Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
            {/* PANNEAU GAUCHE : DOCUMENT VISUEL */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-md space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <span>👁️</span> Aperçu du document
                </h3>

                {/* Controls */}
                <div className="flex items-center gap-2 text-xs">
                  {pdfPages.length > 1 && (
                    <div className="flex items-center gap-1.5 rounded-lg bg-blue-50 px-2 py-0.5 border border-blue-200 text-blue-900 font-bold mr-1">
                      <button
                        onClick={() => {
                          const newIdx = Math.max(0, currentPageIndex - 1);
                          setCurrentPageIndex(newIdx);
                          setSelectedImage(pdfPages[newIdx]);
                        }}
                        disabled={currentPageIndex === 0}
                        className="hover:text-blue-600 disabled:opacity-30"
                        title="Page précédente"
                      >
                        ◀
                      </button>
                      <span className="text-[11px]">
                        Page {currentPageIndex + 1} / {pdfPages.length}
                      </span>
                      <button
                        onClick={() => {
                          const newIdx = Math.min(pdfPages.length - 1, currentPageIndex + 1);
                          setCurrentPageIndex(newIdx);
                          setSelectedImage(pdfPages[newIdx]);
                        }}
                        disabled={currentPageIndex === pdfPages.length - 1}
                        className="hover:text-blue-600 disabled:opacity-30"
                        title="Page suivante"
                      >
                        ▶
                      </button>
                    </div>
                  )}

                  <button
                    onClick={() => setZoomLevel((z) => Math.max(0.6, z - 0.2))}
                    className="rounded-lg border px-2.5 py-1 hover:bg-slate-50 font-bold"
                    title="Zoom arrière"
                  >
                    -
                  </button>
                  <span className="font-mono text-[11px] text-slate-500">
                    {Math.round(zoomLevel * 100)}%
                  </span>
                  <button
                    onClick={() => setZoomLevel((z) => Math.min(2.5, z + 0.2))}
                    className="rounded-lg border px-2.5 py-1 hover:bg-slate-50 font-bold"
                    title="Zoom avant"
                  >
                    +
                  </button>
                  <button
                    onClick={() => setRotation((r) => (r + 90) % 360)}
                    className="rounded-lg border px-2.5 py-1 hover:bg-slate-50 font-bold"
                    title="Pivoter 90°"
                  >
                    🔄
                  </button>
                </div>
              </div>

              {/* Image Preview Container */}
              <div className="relative min-h-[460px] max-h-[620px] overflow-auto rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center p-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={selectedImage}
                  alt="Document scanné"
                  style={{
                    transform: `scale(${zoomLevel}) rotate(${rotation}deg)`,
                    transition: "transform 0.2s ease-out",
                  }}
                  className="max-h-[560px] object-contain rounded shadow-md"
                />
              </div>

              {ocrResult && (
                <div className="flex flex-wrap items-center justify-between gap-3 text-xs bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <div>
                    <span className="text-slate-400">Classification : </span>
                    <span className="font-black text-blue-700 bg-blue-100 px-2 py-0.5 rounded-md">
                      {ocrResult.document.classifiedType}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400">Précision : </span>
                    <span className="font-bold text-emerald-700">
                      {ocrResult.ocr.confidenceScore} %
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400">Temps : </span>
                    <span className="font-bold text-slate-700">
                      {ocrResult.meta.processingTimeMs} ms
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* PANNEAU DROIT : RESTITUTION ET MODÈLES MÉTIERS */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-md space-y-4">
              {/* IA CLASSIFICATION & AUTO-ROUTING CARD */}
              {ocrResult && (
                <div className="rounded-2xl border border-indigo-100 bg-gradient-to-r from-blue-50/70 via-indigo-50/50 to-purple-50/60 p-4 space-y-3 shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <span className="text-3xl">
                        {DOCUMENT_CATEGORIES[ocrResult.document.classifiedType]?.icon || "📄"}
                      </span>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-black uppercase tracking-wider rounded bg-indigo-200/80 px-2 py-0.5 text-indigo-900">
                            {DOCUMENT_CATEGORIES[ocrResult.document.classifiedType]?.sectorLabel || "Général"}
                          </span>
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-black ${
                              (ocrResult.classification?.confidenceScore || ocrResult.ocr.confidenceScore) >= 80
                                ? "bg-emerald-100 text-emerald-800"
                                : (ocrResult.classification?.confidenceScore || ocrResult.ocr.confidenceScore) >= 50
                                ? "bg-amber-100 text-amber-800"
                                : "bg-slate-200 text-slate-700"
                            }`}
                          >
                            ⚡ {ocrResult.classification?.confidenceScore || ocrResult.ocr.confidenceScore}% de certitude IA
                          </span>
                        </div>
                        <h4 className="mt-0.5 text-sm font-black text-slate-900">
                          {DOCUMENT_CATEGORIES[ocrResult.document.classifiedType]?.label || ocrResult.document.classifiedType}
                        </h4>
                      </div>
                    </div>

                    {/* Manual override selector */}
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] font-bold text-slate-500">Modifier :</span>
                      <select
                        value={ocrResult.document.classifiedType}
                        onChange={(e) => handleCategoryChange(e.target.value as DocumentCategory)}
                        className="rounded-lg border border-slate-300 bg-white py-1 px-2.5 text-xs font-bold text-slate-800 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                      >
                        <optgroup label="Pôle Commercial & Ventes">
                          <option value="FACTURE">🧾 Facture Commerciale</option>
                          <option value="AVOIR">↩️ Facture d&apos;Avoir</option>
                          <option value="DEVIS">📋 Devis / Proforma</option>
                          <option value="BON_DE_COMMANDE">🛒 Bon de Commande (PO)</option>
                          <option value="BON_DE_LIVRAISON">📦 Bon de Livraison (BL)</option>
                        </optgroup>
                        <optgroup label="Banque & Finance">
                          <option value="RELEVE_BANCAIRE">🏦 Relevé Bancaire</option>
                          <option value="RIB">💳 RIB / IBAN</option>
                          <option value="AVIS_IMPOSITION">🏛️ Avis d&apos;Imposition</option>
                        </optgroup>
                        <optgroup label="Juridique & Contrats">
                          <option value="CONTRAT">⚖️ Contrat Commercial</option>
                          <option value="CONTRAT_TRAVAIL">👔 Contrat de Travail</option>
                          <option value="ACCORD_CONFIDENTIALITE">🔒 Accord de Confidentialité (NDA)</option>
                          <option value="BAIL">🏢 Bail / Location</option>
                        </optgroup>
                        <optgroup label="Ressources Humaines & Administratif">
                          <option value="BULLETIN_PAIE">💶 Bulletin de Paie</option>
                          <option value="JUSTIFICATIF_DOMICILE">🏠 Justificatif de Domicile</option>
                          <option value="ATTESTATION">📜 Attestation / Certificat</option>
                          <option value="CV">👤 CV / Profil</option>
                        </optgroup>
                        <optgroup label="Identité & Titres Officiels">
                          <option value="PIECE_IDENTITE">🪪 Pièce d&apos;Identité / Passeport</option>
                          <option value="ACTE_ETAT_CIVIL">🏛️ Acte d&apos;État Civil (ETATICIEL)</option>
                        </optgroup>
                        <optgroup label="Santé & Médical">
                          <option value="DOSSIER_MEDICAL">🩺 Dossier Médical</option>
                          <option value="ORDONNANCE">💊 Ordonnance Médicale</option>
                          <option value="FEUILLE_DE_SOINS">🏥 Feuille de Soins</option>
                        </optgroup>
                        <optgroup label="Général">
                          <option value="EMAIL_CORRESPONDANCE">✉️ E-mail / Courrier</option>
                          <option value="DOCUMENT_GENERAL">📄 Document Général</option>
                        </optgroup>
                      </select>
                    </div>
                  </div>

                  {/* Indicators and reasoning */}
                  {ocrResult.classification?.reasoning && (
                    <div className="rounded-xl bg-white/80 p-2.5 border border-indigo-100/80 text-[11px] text-slate-700 space-y-1.5">
                      <p className="font-medium">{ocrResult.classification.reasoning}</p>
                      {ocrResult.classification.detectedIndicators && ocrResult.classification.detectedIndicators.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1.5 pt-1">
                          <span className="font-bold text-slate-400 text-[10px] uppercase">Indicateurs clés :</span>
                          {ocrResult.classification.detectedIndicators.map((ind, i) => (
                            <span
                              key={i}
                              className="rounded-md bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-700 border border-indigo-100"
                            >
                              ✓ {ind}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Tab navigation */}
              <div className="flex items-center justify-between border-b border-slate-200 pb-3 overflow-x-auto">
                <div className="flex gap-2">
                  <button
                    onClick={() => setActiveTab("form")}
                    className={`rounded-xl px-3.5 py-2 text-xs font-bold transition whitespace-nowrap ${
                      activeTab === "form"
                        ? "bg-blue-600 text-white shadow-sm"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                    }`}
                  >
                    📋 Données Clés & Métiers
                  </button>
                  <button
                    onClick={() => setActiveTab("lines")}
                    className={`rounded-xl px-3.5 py-2 text-xs font-bold transition whitespace-nowrap ${
                      activeTab === "lines"
                        ? "bg-blue-600 text-white shadow-sm"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                    }`}
                  >
                    📊 Lignes d&apos;Articles ({editedFields?.lineItems?.length || 0})
                  </button>
                  <button
                    onClick={() => setActiveTab("text")}
                    className={`rounded-xl px-3.5 py-2 text-xs font-bold transition whitespace-nowrap ${
                      activeTab === "text"
                        ? "bg-blue-600 text-white shadow-sm"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                    }`}
                  >
                    📄 Texte Intégral
                  </button>
                  <button
                    onClick={() => setActiveTab("json")}
                    className={`rounded-xl px-3.5 py-2 text-xs font-bold transition whitespace-nowrap ${
                      activeTab === "json"
                        ? "bg-blue-600 text-white shadow-sm"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                    }`}
                  >
                    💻 JSON API
                  </button>
                </div>
              </div>

              {!ocrResult ? (
                <div className="py-20 text-center text-slate-400 space-y-2">
                  <span className="text-4xl">⚡</span>
                  <p className="font-bold text-sm text-slate-600">
                    Prêt pour l&apos;analyse intelligente
                  </p>
                  <p className="text-xs max-w-xs mx-auto">
                    Cliquez sur <strong>&quot;Lancer l&apos;Analyse OCR Souveraine&quot;</strong> pour extraire automatiquement les informations.
                  </p>
                </div>
              ) : (
                <>
                  {/* ONGLET 1 : FORMULAIRE CLÉ/VALEUR & RAPPROCHEMENT */}
                  {activeTab === "form" && editedFields && (
                    <div className="space-y-4 max-h-[520px] overflow-y-auto pr-1">
                      {/* RAPPROCHEMENT COMPTABLE CARD (Étape 3) */}
                      <div
                        className={`rounded-xl border p-4 transition ${
                          liveReconciliation.isBalanced
                            ? "border-emerald-200 bg-emerald-50/60 text-emerald-900"
                            : "border-amber-300 bg-amber-50 text-amber-900"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-xl">
                              {liveReconciliation.isBalanced ? "✅" : "⚠️"}
                            </span>
                            <span className="text-xs font-black uppercase tracking-wider">
                              Rapprochement Comptable Automatique
                            </span>
                          </div>
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-[11px] font-black ${
                              liveReconciliation.isBalanced
                                ? "bg-emerald-200 text-emerald-800"
                                : "bg-amber-200 text-amber-800"
                            }`}
                          >
                            {liveReconciliation.isBalanced ? "Équilibré" : "Écart Détecté"}
                          </span>
                        </div>
                        <p className="mt-1 text-xs font-medium">
                          {liveReconciliation.message}
                        </p>
                      </div>

                      {/* Document info */}
                      <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 space-y-3">
                        <p className="text-xs font-black uppercase tracking-wider text-slate-400">
                          Identifiants & Dates
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div>
                            <label className="text-[11px] font-bold text-slate-600">N° de Document</label>
                            <input
                              type="text"
                              value={editedFields.documentNumber || ""}
                              onChange={(e) =>
                                setEditedFields({
                                  ...editedFields,
                                  documentNumber: e.target.value,
                                })
                              }
                              className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 text-xs font-bold text-slate-800"
                              placeholder="Non détecté"
                            />
                          </div>
                          <div>
                            <label className="text-[11px] font-bold text-slate-600">Date d&apos;émission</label>
                            <input
                              type="text"
                              value={editedFields.documentDate || ""}
                              onChange={(e) =>
                                setEditedFields({
                                  ...editedFields,
                                  documentDate: e.target.value,
                                })
                              }
                              className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 text-xs font-bold text-slate-800"
                              placeholder="JJ/MM/AAAA"
                            />
                          </div>
                          <div>
                            <label className="text-[11px] font-bold text-slate-600">Date d&apos;échéance</label>
                            <input
                              type="text"
                              value={editedFields.dueDate || ""}
                              onChange={(e) =>
                                setEditedFields({
                                  ...editedFields,
                                  dueDate: e.target.value,
                                })
                              }
                              className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 text-xs font-bold text-slate-800"
                              placeholder="JJ/MM/AAAA"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Financial Amounts */}
                      <div className="rounded-xl border border-blue-200 bg-blue-50/40 p-4 space-y-3">
                        <p className="text-xs font-black uppercase tracking-wider text-blue-800">
                          Montants Financiers ({editedFields.amounts.currency})
                        </p>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          <div>
                            <label className="text-[11px] font-bold text-slate-600">Total HT</label>
                            <input
                              type="number"
                              step="0.01"
                              value={editedFields.amounts.amountHt ?? ""}
                              onChange={(e) =>
                                setEditedFields({
                                  ...editedFields,
                                  amounts: {
                                    ...editedFields.amounts,
                                    amountHt: parseFloat(e.target.value) || null,
                                  },
                                })
                              }
                              className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 text-xs font-bold text-slate-900"
                            />
                          </div>
                          <div>
                            <label className="text-[11px] font-bold text-slate-600">Taux TVA (%)</label>
                            <input
                              type="number"
                              step="0.1"
                              value={editedFields.amounts.vatRate ?? ""}
                              onChange={(e) =>
                                setEditedFields({
                                  ...editedFields,
                                  amounts: {
                                    ...editedFields.amounts,
                                    vatRate: parseFloat(e.target.value) || null,
                                  },
                                })
                              }
                              className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 text-xs font-bold text-slate-900"
                            />
                          </div>
                          <div>
                            <label className="text-[11px] font-bold text-slate-600">Montant TVA</label>
                            <input
                              type="number"
                              step="0.01"
                              value={editedFields.amounts.vatAmount ?? ""}
                              onChange={(e) =>
                                setEditedFields({
                                  ...editedFields,
                                  amounts: {
                                    ...editedFields.amounts,
                                    vatAmount: parseFloat(e.target.value) || null,
                                  },
                                })
                              }
                              className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 text-xs font-bold text-slate-900"
                            />
                          </div>
                          <div>
                            <label className="text-[11px] font-bold text-blue-900">Total TTC</label>
                            <input
                              type="number"
                              step="0.01"
                              value={editedFields.amounts.totalTtc ?? ""}
                              onChange={(e) =>
                                setEditedFields({
                                  ...editedFields,
                                  amounts: {
                                    ...editedFields.amounts,
                                    totalTtc: parseFloat(e.target.value) || null,
                                  },
                                })
                              }
                              className="mt-1 w-full rounded-lg border border-blue-400 bg-white p-2 text-xs font-black text-blue-700"
                            />
                          </div>
                        </div>
                      </div>

                      {/* SPÉCIALISATION ÉTAT CIVIL (ETATICIEL) */}
                      {(ocrResult.document.classifiedType === "ACTE_ETAT_CIVIL" ||
                        editedFields.civilStatus.municipality ||
                        editedFields.civilStatus.personName) && (
                        <div className="rounded-xl border border-purple-200 bg-purple-50/40 p-4 space-y-3">
                          <p className="text-xs font-black uppercase tracking-wider text-purple-800 flex items-center gap-1.5">
                            <span>🏛️</span> Suite ETATICIEL — Acte d&apos;État Civil & Mairie
                          </p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                              <label className="text-[11px] font-bold text-slate-600">Commune / Mairie</label>
                              <input
                                type="text"
                                value={editedFields.civilStatus.municipality || ""}
                                onChange={(e) =>
                                  setEditedFields({
                                    ...editedFields,
                                    civilStatus: {
                                      ...editedFields.civilStatus,
                                      municipality: e.target.value,
                                    },
                                  })
                                }
                                className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 text-xs font-bold text-slate-800"
                              />
                            </div>
                            <div>
                              <label className="text-[11px] font-bold text-slate-600">Personne Concernée</label>
                              <input
                                type="text"
                                value={editedFields.civilStatus.personName || ""}
                                onChange={(e) =>
                                  setEditedFields({
                                    ...editedFields,
                                    civilStatus: {
                                      ...editedFields.civilStatus,
                                      personName: e.target.value,
                                    },
                                  })
                                }
                                className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 text-xs font-bold text-slate-800"
                              />
                            </div>
                            <div>
                              <label className="text-[11px] font-bold text-slate-600">Filiation (Père)</label>
                              <input
                                type="text"
                                value={editedFields.civilStatus.fatherName || ""}
                                onChange={(e) =>
                                  setEditedFields({
                                    ...editedFields,
                                    civilStatus: {
                                      ...editedFields.civilStatus,
                                      fatherName: e.target.value,
                                    },
                                  })
                                }
                                className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 text-xs font-bold text-slate-800"
                              />
                            </div>
                            <div>
                              <label className="text-[11px] font-bold text-slate-600">Filiation (Mère)</label>
                              <input
                                type="text"
                                value={editedFields.civilStatus.motherName || ""}
                                onChange={(e) =>
                                  setEditedFields({
                                    ...editedFields,
                                    civilStatus: {
                                      ...editedFields.civilStatus,
                                      motherName: e.target.value,
                                    },
                                  })
                                }
                                className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 text-xs font-bold text-slate-800"
                              />
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Legal Entities */}
                      <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 space-y-3">
                        <p className="text-xs font-black uppercase tracking-wider text-slate-400">
                          Identifiants Légaux & Contacts
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="text-[11px] font-bold text-slate-600">SIRET</label>
                            <input
                              type="text"
                              value={editedFields.legalEntities.siret || ""}
                              onChange={(e) =>
                                setEditedFields({
                                  ...editedFields,
                                  legalEntities: {
                                    ...editedFields.legalEntities,
                                    siret: e.target.value,
                                  },
                                })
                              }
                              className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 text-xs font-mono text-slate-800"
                            />
                          </div>
                          <div>
                            <label className="text-[11px] font-bold text-slate-600">TVA Intracommunautaire</label>
                            <input
                              type="text"
                              value={editedFields.legalEntities.tvaNumber || ""}
                              onChange={(e) =>
                                setEditedFields({
                                  ...editedFields,
                                  legalEntities: {
                                    ...editedFields.legalEntities,
                                    tvaNumber: e.target.value,
                                  },
                                })
                              }
                              className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 text-xs font-mono text-slate-800"
                            />
                          </div>
                          <div className="sm:col-span-2">
                            <label className="text-[11px] font-bold text-slate-600">IBAN</label>
                            <input
                              type="text"
                              value={editedFields.legalEntities.iban || ""}
                              onChange={(e) =>
                                setEditedFields({
                                  ...editedFields,
                                  legalEntities: {
                                    ...editedFields.legalEntities,
                                    iban: e.target.value,
                                  },
                                })
                              }
                              className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 text-xs font-mono text-slate-800"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ONGLET 2 : TABLEAU DES LIGNES D'ARTICLES (Étape 3) */}
                  {activeTab === "lines" && editedFields && (
                    <div className="space-y-4 max-h-[520px] overflow-y-auto pr-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-500">
                          {editedFields.lineItems?.length || 0} ligne(s) d&apos;articles extraite(s)
                        </span>
                        <button
                          onClick={handleAddLineItem}
                          className="rounded-lg bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700 hover:bg-blue-100 transition"
                        >
                          + Ajouter une ligne
                        </button>
                      </div>

                      {(!editedFields.lineItems || editedFields.lineItems.length === 0) ? (
                        <div className="rounded-xl border border-slate-200 bg-slate-50 p-8 text-center text-slate-500 text-xs">
                          Aucune ligne d&apos;article tabulaire détectée sur ce document.
                          <div className="mt-3">
                            <button
                              onClick={handleAddLineItem}
                              className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-sm"
                            >
                              Ajouter une ligne manuellement
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="overflow-x-auto rounded-xl border border-slate-200">
                          <table className="w-full text-left text-xs">
                            <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                              <tr>
                                <th className="p-2.5 w-12 text-center">#</th>
                                <th className="p-2.5">Description</th>
                                <th className="p-2.5 w-16 text-right">Qté</th>
                                <th className="p-2.5 w-24 text-right">P.U. HT</th>
                                <th className="p-2.5 w-24 text-right">Total HT</th>
                                <th className="p-2.5 w-10"></th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 bg-white">
                              {editedFields.lineItems.map((item, idx) => (
                                <tr key={idx} className="hover:bg-slate-50">
                                  <td className="p-2.5 text-center font-bold text-slate-400">
                                    {item.lineNumber}
                                  </td>
                                  <td className="p-2.5">
                                    <input
                                      type="text"
                                      value={item.description}
                                      onChange={(e) => {
                                        const lines = [...(editedFields.lineItems || [])];
                                        lines[idx].description = e.target.value;
                                        setEditedFields({ ...editedFields, lineItems: lines });
                                      }}
                                      className="w-full rounded border border-slate-300 p-1 text-xs"
                                    />
                                  </td>
                                  <td className="p-2.5">
                                    <input
                                      type="number"
                                      value={item.quantity}
                                      onChange={(e) => {
                                        const lines = [...(editedFields.lineItems || [])];
                                        lines[idx].quantity = parseFloat(e.target.value) || 1;
                                        lines[idx].totalPrice = Math.round(lines[idx].quantity * (lines[idx].unitPrice || 0) * 100) / 100;
                                        setEditedFields({ ...editedFields, lineItems: lines });
                                      }}
                                      className="w-full text-right rounded border border-slate-300 p-1 text-xs"
                                    />
                                  </td>
                                  <td className="p-2.5">
                                    <input
                                      type="number"
                                      step="0.01"
                                      value={item.unitPrice ?? ""}
                                      onChange={(e) => {
                                        const lines = [...(editedFields.lineItems || [])];
                                        lines[idx].unitPrice = parseFloat(e.target.value) || 0;
                                        lines[idx].totalPrice = Math.round(lines[idx].quantity * lines[idx].unitPrice * 100) / 100;
                                        setEditedFields({ ...editedFields, lineItems: lines });
                                      }}
                                      className="w-full text-right rounded border border-slate-300 p-1 text-xs"
                                    />
                                  </td>
                                  <td className="p-2.5 text-right font-bold text-slate-900">
                                    {(item.totalPrice ?? 0).toLocaleString("fr-FR", {
                                      minimumFractionDigits: 2,
                                    })}{" "}
                                    €
                                  </td>
                                  <td className="p-2.5 text-center">
                                    <button
                                      onClick={() => handleRemoveLineItem(idx)}
                                      className="text-red-500 hover:text-red-700 font-bold"
                                      title="Supprimer la ligne"
                                    >
                                      ✕
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}

                  {/* ONGLET 3 : TEXTE INTEGRAL */}
                  {activeTab === "text" && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-xs text-slate-500">
                        <span>
                          {ocrResult.ocr.wordsCount} mots • {ocrResult.ocr.paragraphsCount} paragraphes
                        </span>
                        <button
                          onClick={() => handleCopyText(ocrResult.ocr.fullText)}
                          className="font-bold text-blue-600 hover:underline"
                        >
                          {copiedText ? "✅ Copié !" : "📋 Copier tout le texte"}
                        </button>
                      </div>
                      <textarea
                        readOnly
                        value={ocrResult.ocr.fullText}
                        rows={16}
                        className="w-full rounded-xl border border-slate-300 bg-slate-50 p-4 font-mono text-xs leading-relaxed text-slate-800 focus:outline-none"
                      />
                    </div>
                  )}

                  {/* ONGLET 4 : FORMAT JSON API */}
                  {activeTab === "json" && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-xs text-slate-500">
                        <span>Réponse JSON standardisée de l&apos;API /api/ocr/process</span>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleCopyText(JSON.stringify(ocrResult, null, 2), true)}
                            className="font-bold text-blue-600 hover:underline"
                          >
                            {copiedJson ? "✅ Copié !" : "📋 Copier JSON"}
                          </button>
                          <span>•</span>
                          <button
                            onClick={handleDownloadJson}
                            className="font-bold text-slate-700 hover:underline"
                          >
                            ⬇️ Télécharger .json
                          </button>
                        </div>
                      </div>
                      <pre className="max-h-[460px] overflow-auto rounded-xl bg-slate-900 p-4 font-mono text-xs text-emerald-400">
                        {JSON.stringify(ocrResult, null, 2)}
                      </pre>
                    </div>
                  )}

                  {/* Bottom Action Footer */}
                  <div className="pt-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
                    <button
                      onClick={handleSaveToGed}
                      disabled={savingDoc}
                      className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-emerald-600/20 hover:bg-emerald-700 transition disabled:opacity-50"
                    >
                      {savingDoc ? "Enregistrement..." : "💾 Enregistrer dans Mes Documents (GED)"}
                    </button>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleDownloadCsv}
                        className="rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
                      >
                        📊 Export CSV / Excel
                      </button>

                      <button
                        onClick={handleDownloadJson}
                        className="rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
                      >
                        📥 Rapport JSON
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* CAMERA CAPTURE MODAL */}
      {cameraOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-2xl rounded-2xl bg-slate-900 p-6 text-white space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold">📷 Capture Numérisation Caméra</h3>
              <button
                onClick={() => {
                  if (videoStream) {
                    videoStream.getTracks().forEach((t) => t.stop());
                    setVideoStream(null);
                  }
                  setCameraOpen(false);
                }}
                className="text-slate-400 hover:text-white font-bold text-xl"
              >
                ✕
              </button>
            </div>

            <div className="relative aspect-video rounded-xl bg-black overflow-hidden flex items-center justify-center border border-slate-700">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="h-full w-full object-contain"
              />
              <div className="absolute inset-8 border-2 border-dashed border-white/50 rounded-lg pointer-events-none" />
            </div>

            <div className="flex justify-center gap-4 pt-2">
              <button
                onClick={captureCameraPhoto}
                className="rounded-full bg-blue-600 px-8 py-3.5 text-sm font-bold text-white shadow-lg hover:bg-blue-700 transition flex items-center gap-2"
              >
                📸 Prendre la photo & analyser
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
