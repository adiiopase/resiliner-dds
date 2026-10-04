import path from "path";
import { createWorker } from "tesseract.js";
import {
  classifyDocument,
  DocumentCategory,
  ClassificationResult,
  DOCUMENT_CATEGORIES,
} from "./documentClassifier";

export type DocumentClassification = DocumentCategory;
export { DOCUMENT_CATEGORIES };
export type { ClassificationResult };

export type ExtractedAmounts = {
  amountHt: number | null;
  vatRate: number | null;
  vatAmount: number | null;
  totalTtc: number | null;
  currency: string;
  isBalanced: boolean;
  discrepancy: number;
  reconciliationMessage: string;
};

export type ExtractedLineItem = {
  lineNumber: number;
  description: string;
  quantity: number;
  unitPrice: number | null;
  totalPrice: number | null;
  vatRate?: number | null;
};

export type ExtractedLegalEntities = {
  siret: string | null;
  siren: string | null;
  tvaNumber: string | null;
  iban: string | null;
  emails: string[];
  phones: string[];
  companyName: string | null;
};

export type ExtractedCivilStatus = {
  actType: "NAISSANCE" | "MARIAGE" | "DECES" | null;
  personName: string | null;
  eventDate: string | null;
  municipality: string | null;
  registryNumber: string | null;
  fatherName: string | null;
  motherName: string | null;
  officerName: string | null;
  witnesses: string[];
};

export type ExtractedIdentity = {
  documentType: "CNI" | "PASSEPORT" | "PERMIS" | "AUTRE" | null;
  documentNumber: string | null;
  nationality: string | null;
  holderSurname: string | null;
  holderGivenNames: string | null;
  birthDate: string | null;
  expiryDate: string | null;
  mrzLines: string[];
};

export type ExtractedFields = {
  documentNumber: string | null;
  documentDate: string | null;
  dueDate: string | null;
  amounts: ExtractedAmounts;
  lineItems: ExtractedLineItem[];
  legalEntities: ExtractedLegalEntities;
  civilStatus: ExtractedCivilStatus;
  identity: ExtractedIdentity;
  keyValues: Record<string, string>;
};

export type OcrWord = {
  text: string;
  confidence: number;
  bbox?: { x0: number; y0: number; x1: number; y1: number };
};

export type OcrBlock = {
  text: string;
  confidence: number;
  lines: string[];
};

export type OcrAnalysisResult = {
  success: boolean;
  classifiedType: DocumentClassification;
  confidenceScore: number;
  language: string;
  fullText: string;
  paragraphsCount: number;
  wordsCount: number;
  words: OcrWord[];
  blocks: OcrBlock[];
  extractedFields: ExtractedFields;
  classification?: ClassificationResult;
  processingTimeMs: number;
  error?: string;
};

/**
 * Normalizes numbers extracted from French/European text
 * (e.g. "1 250,50 €" -> 1250.50)
 */
export function parseFrenchAmount(str: string): number | null {
  if (!str) return null;
  const clean = str
    .replace(/[^\d,.-]/g, "")
    .replace(/\s+/g, "")
    .replace(",", ".");
  const val = parseFloat(clean);
  return isNaN(val) ? null : Math.round(val * 100) / 100;
}

/**
 * Document type classifier based on semantic keyword scoring
 */
export function classifyDocumentText(text: string): DocumentClassification {
  const result = classifyDocument(text);
  return result.category;
}

/**
 * Extracts line items from invoices, quotes, or purchase orders
 */
export function extractLineItemsFromText(lines: string[]): ExtractedLineItem[] {
  const items: ExtractedLineItem[] = [];
  let itemCounter = 1;

  for (const line of lines) {
    const trimmed = line.trim();
    // Skip summary lines
    if (
      /(?:total|sous-total|net|tva|siret|iban|banque|page|remise|acompte|conditions)/i.test(
        trimmed
      )
    ) {
      continue;
    }

    // Pattern 1: [Description] [Quantity] [Unit Price] [Total Line]
    // Example: "Développement module OCR IA 2 750.00 1500.00"
    const matchLine = trimmed.match(
      /^(.+?)\s+(\d+(?:[.,]\d+)?)\s+(\d+[\s\d]*(?:[.,]\d{2})?)\s*(?:€|\$|EUR)?\s+(\d+[\s\d]*(?:[.,]\d{2})?)\s*(?:€|\$|EUR)?$/i
    );

    if (matchLine) {
      const desc = matchLine[1].trim();
      const qty = parseFloat(matchLine[2].replace(",", ".")) || 1;
      const unitPrice = parseFrenchAmount(matchLine[3]);
      const totalPrice = parseFrenchAmount(matchLine[4]);

      if (desc.length >= 3 && unitPrice !== null && totalPrice !== null) {
        items.push({
          lineNumber: itemCounter++,
          description: desc,
          quantity: qty,
          unitPrice,
          totalPrice,
        });
      }
      continue;
    }

    // Pattern 2: [Description] - [Total Price] €
    const simpleMatch = trimmed.match(
      /^([A-Za-zÀ-ÿ0-9\s\-_\.,]{4,60})\s*[:\-]\s*(\d+[\s\d]*(?:[.,]\d{2})?)\s*(?:€|\$|EUR)$/i
    );
    if (simpleMatch) {
      const desc = simpleMatch[1].trim();
      const total = parseFrenchAmount(simpleMatch[2]);
      if (total !== null && !/(?:total|tva|ht|ttc)/i.test(desc)) {
        items.push({
          lineNumber: itemCounter++,
          description: desc,
          quantity: 1,
          unitPrice: total,
          totalPrice: total,
        });
      }
    }
  }

  return items;
}

/**
 * Extracts Machine Readable Zone (MRZ) and ID data
 */
export function extractIdentityData(text: string, lines: string[]): ExtractedIdentity {
  const mrzLines: string[] = [];
  let documentType: ExtractedIdentity["documentType"] = null;
  let documentNumber: string | null = null;
  let nationality: string | null = null;
  let holderSurname: string | null = null;
  let holderGivenNames: string | null = null;
  let birthDate: string | null = null;
  let expiryDate: string | null = null;

  const upper = text.toUpperCase();
  if (upper.includes("PASSEPORT") || upper.includes("PASSPORT")) documentType = "PASSEPORT";
  else if (upper.includes("CARTE NATIONALE") || upper.includes("IDENTITE") || upper.includes("IDFRA")) documentType = "CNI";
  else if (upper.includes("PERMIS")) documentType = "PERMIS";

  // Search MRZ format (IDFRA... or P<FRA...)
  for (const line of lines) {
    const cleanLine = line.replace(/\s+/g, "").toUpperCase();
    if (
      (cleanLine.startsWith("IDFRA") || cleanLine.startsWith("P<FRA") || cleanLine.startsWith("I<FRA")) &&
      cleanLine.length >= 20
    ) {
      mrzLines.push(cleanLine);
    } else if (cleanLine.includes("<<<") && cleanLine.length >= 20) {
      mrzLines.push(cleanLine);
    }
  }

  if (mrzLines.length > 0) {
    const first = mrzLines[0];
    if (first.startsWith("IDFRA")) {
      documentType = "CNI";
      nationality = "FRA";
      // IDFRA123456789...
      const docNumMatch = first.match(/IDFRA([A-Z0-9]{9,12})/);
      if (docNumMatch) documentNumber = docNumMatch[1];
    } else if (first.startsWith("P<FRA")) {
      documentType = "PASSEPORT";
      nationality = "FRA";
    }
  }

  // Name extraction
  const nomMatch = text.match(/(?:nom\s*(?:d'usage|de naissance)?|surname)\s*[:]?\s*([A-ZÀ-ÿ\s\-]{2,30})/i);
  if (nomMatch && nomMatch[1]) holderSurname = nomMatch[1].trim();

  const prenomMatch = text.match(/(?:prénoms?|given\s*names?)\s*[:]?\s*([A-ZÀ-ÿ\s\-]{2,35})/i);
  if (prenomMatch && prenomMatch[1]) holderGivenNames = prenomMatch[1].trim();

  return {
    documentType,
    documentNumber,
    nationality,
    holderSurname,
    holderGivenNames,
    birthDate,
    expiryDate,
    mrzLines,
  };
}

/**
 * Extracts smart semantic fields from raw OCR text
 */
export function extractFieldsFromText(
  text: string,
  classifiedType: DocumentClassification
): ExtractedFields {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

  // 1. Document Number
  let documentNumber: string | null = null;
  const docNumRegexes = [
    /(?:facture|invoice|devis|commande|bon|acte|dossier|n°|numéro|no\.?)\s*[:#\-]?\s*([A-Z0-9\-_/]{3,30})/i,
    /(?:n°|numéro|ref\.?)\s*[:#\-]?\s*([A-Z0-9\-_/]{3,30})/i,
    /\b([A-Z]{2,4}-\d{4}-\d{3,6})\b/i,
  ];

  for (const regex of docNumRegexes) {
    const match = text.match(regex);
    if (match && match[1]) {
      const candidate = match[1].trim();
      if (!/^(de|du|le|la|les|pour|des|sur)$/i.test(candidate)) {
        documentNumber = candidate;
        break;
      }
    }
  }

  // 2. Dates
  let documentDate: string | null = null;
  let dueDate: string | null = null;

  const dateRegex = /\b(\d{1,2}[\/\.\-]\d{1,2}[\/\.\-]\d{2,4})\b/;
  const dateMatch = text.match(dateRegex);
  if (dateMatch && dateMatch[1]) {
    documentDate = dateMatch[1];
  }

  const dueDateRegex = /(?:échéance|echeance|date limite|due date|règlement avant)\s*[:]?\s*(\d{1,2}[\/\.\-]\d{1,2}[\/\.\-]\d{2,4})/i;
  const dueMatch = text.match(dueDateRegex);
  if (dueMatch && dueMatch[1]) {
    dueDate = dueMatch[1];
  }

  // 3. Amounts (HT / TVA / TTC) & Accounting Reconciliation
  let amountHt: number | null = null;
  let vatRate: number | null = null;
  let vatAmount: number | null = null;
  let totalTtc: number | null = null;
  let currency = "EUR";

  if (text.includes("$")) currency = "USD";
  else if (text.includes("CFA") || text.includes("XOF")) currency = "XOF";
  else if (text.includes("£")) currency = "GBP";

  for (const line of lines) {
    // Total TTC / Net à payer
    if (/(?:total\s*ttc|montant\s*ttc|net\s*à\s*payer|total\s*à\s*payer|net\s*a\s*payer)/i.test(line)) {
      const match = line.match(/(?:[:=]|\s)\s*([\d\s]+(?:[.,]\d{2})?)\s*(?:€|\$|EUR|XOF)?$/i) || line.match(/([\d\s]+(?:[.,]\d{2})?)\s*(?:€|\$|EUR|XOF)/i);
      if (match && match[1] && !totalTtc) {
        totalTtc = parseFrenchAmount(match[1]);
      }
    }
    // Montant TVA
    else if (/(?:montant\s*tva|total\s*tva|tva\s*\(\d+%\))/i.test(line)) {
      const match = line.match(/(?:[:=]|\s)\s*([\d\s]+(?:[.,]\d{2})?)\s*(?:€|\$|EUR|XOF)?$/i) || line.match(/([\d\s]+(?:[.,]\d{2})?)\s*(?:€|\$|EUR|XOF)/i);
      if (match && match[1] && !vatAmount) {
        vatAmount = parseFrenchAmount(match[1]);
      }
    }
    // Taux TVA (%)
    else if (/(?:taux\s*tva|tva\s*[:]?\s*\d+[\.,]?\d*\s*%)/i.test(line) || (line.toLowerCase().includes("tva") && line.includes("%"))) {
      const rateMatch = line.match(/(\d{1,2}(?:[.,]\d{1,2})?)\s*%/);
      if (rateMatch && rateMatch[1] && !vatRate) {
        vatRate = parseFrenchAmount(rateMatch[1]);
      }
    }
    // Total HT
    else if (/(?:total\s*ht|montant\s*ht|net\s*ht)/i.test(line)) {
      const match = line.match(/(?:[:=]|\s)\s*([\d\s]+(?:[.,]\d{2})?)\s*(?:€|\$|EUR|XOF)?$/i) || line.match(/([\d\s]+(?:[.,]\d{2})?)\s*(?:€|\$|EUR|XOF)/i);
      if (match && match[1] && !amountHt) {
        amountHt = parseFrenchAmount(match[1]);
      }
    }
  }

  // Deduce missing calculations if sufficient parameters are available
  if (amountHt && vatRate && !vatAmount) {
    vatAmount = Math.round(amountHt * (vatRate / 100) * 100) / 100;
  }
  if (amountHt && vatAmount && !totalTtc) {
    totalTtc = Math.round((amountHt + vatAmount) * 100) / 100;
  }
  if (!amountHt && totalTtc && vatRate) {
    amountHt = Math.round((totalTtc / (1 + vatRate / 100)) * 100) / 100;
    vatAmount = Math.round((totalTtc - amountHt) * 100) / 100;
  }

  // Accounting reconciliation check
  let isBalanced = true;
  let discrepancy = 0;
  let reconciliationMessage = "Non applicable (aucun montant extrait)";

  if (amountHt !== null && totalTtc !== null) {
    const computedTotal = Math.round(((amountHt || 0) + (vatAmount || 0)) * 100) / 100;
    discrepancy = Math.round(Math.abs(computedTotal - totalTtc) * 100) / 100;
    if (discrepancy <= 0.05) {
      isBalanced = true;
      reconciliationMessage = `Équilibre comptable parfait (HT ${amountHt} € + TVA ${vatAmount || 0} € = TTC ${totalTtc} €)`;
    } else {
      isBalanced = false;
      reconciliationMessage = `Alerte écart comptable : ${discrepancy} € de différence entre HT+TVA (${computedTotal} €) et TTC extrait (${totalTtc} €)`;
    }
  }

  // 4. Line Items extraction
  const lineItems = extractLineItemsFromText(lines);

  // 5. Legal Entities (SIRET, SIREN, IBAN, emails, phones)
  let siret: string | null = null;
  let siren: string | null = null;
  let tvaNumber: string | null = null;
  let iban: string | null = null;

  const siretMatch = text.match(/\b(\d{3}\s*\d{3}\s*\d{3}\s*\d{5})\b/) || text.match(/(?:siret)\s*[:]?\s*(\d{14})/i);
  if (siretMatch && siretMatch[1]) {
    siret = siretMatch[1].replace(/\s+/g, "");
    siren = siret.substring(0, 9);
  } else {
    const sirenMatch = text.match(/\b(\d{3}\s*\d{3}\s*\d{3})\b/) || text.match(/(?:siren)\s*[:]?\s*(\d{9})/i);
    if (sirenMatch && sirenMatch[1]) {
      siren = sirenMatch[1].replace(/\s+/g, "");
    }
  }

  const tvaNumMatch = text.match(/\b(FR\s*[0-9A-Z]{2}\s*\d{9})\b/i);
  if (tvaNumMatch && tvaNumMatch[1]) {
    tvaNumber = tvaNumMatch[1].replace(/\s+/g, "");
  }

  const ibanMatch = text.match(/\b([A-Z]{2}\d{2}[A-Z0-9\s]{12,30})\b/i);
  if (ibanMatch && ibanMatch[1]) {
    iban = ibanMatch[1].replace(/\s+/g, "");
  }

  const emailMatches = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || [];
  const emails = Array.from(new Set(emailMatches));

  const phoneMatches = text.match(/(?:(?:\+|00)33|0)\s*[1-9](?:[\s.-]*\d{2}){4}/g) || [];
  const phones = Array.from(new Set(phoneMatches));

  // 6. Civil status fields (ETATICIEL - Mairies)
  let actType: "NAISSANCE" | "MARIAGE" | "DECES" | null = null;
  if (text.toUpperCase().includes("NAISSANCE")) actType = "NAISSANCE";
  else if (text.toUpperCase().includes("MARIAGE")) actType = "MARIAGE";
  else if (text.toUpperCase().includes("DECES") || text.toUpperCase().includes("DÉCÈS")) actType = "DECES";

  let municipality: string | null = null;
  const muniMatch = text.match(/(?:mairie\s*de|commune\s*de|ville\s*de)\s*([A-Za-zÀ-ÿ\s\-]{3,35})/i);
  if (muniMatch && muniMatch[1]) {
    municipality = muniMatch[1].trim();
  }

  let personName: string | null = null;
  const personMatch = text.match(/(?:concernant|au\s*nom\s*de|l'enfant|le\s*nouveau-né|l'époux|le\s*défunt)\s*[:]?\s*([A-ZÀ-ÿ\s\-]{3,40})/i);
  if (personMatch && personMatch[1]) {
    personName = personMatch[1].trim();
  }

  let registryNumber: string | null = null;
  const regMatch = text.match(/(?:acte\s*n°|registre\s*n°|numéro\s*d'acte)\s*[:]?\s*([A-Z0-9\-_/]{2,20})/i);
  if (regMatch && regMatch[1]) {
    registryNumber = regMatch[1].trim();
  }

  let fatherName: string | null = null;
  const fatherMatch = text.match(/(?:fils\s*de|fille\s*de|père\s*[:]|de\s*monsieur)\s*([A-ZÀ-ÿ\s\-]{3,35})/i);
  if (fatherMatch && fatherMatch[1]) {
    fatherName = fatherMatch[1].trim();
  }

  let motherName: string | null = null;
  const motherMatch = text.match(/(?:et\s*de|mère\s*[:]|de\s*madame)\s*([A-ZÀ-ÿ\s\-]{3,35})/i);
  if (motherMatch && motherMatch[1]) {
    motherName = motherMatch[1].trim();
  }

  let officerName: string | null = null;
  const officerMatch = text.match(/(?:officier\s*d'état\s*civil|par\s*devant\s*nous|maire\s*délégué)\s*[:]?\s*([A-ZÀ-ÿ\s\-]{3,35})/i);
  if (officerMatch && officerMatch[1]) {
    officerName = officerMatch[1].trim();
  }

  // 7. Identity & MRZ
  const identity = extractIdentityData(text, lines);

  // Key-value pairs dictionary
  const keyValues: Record<string, string> = {};
  for (const line of lines) {
    if (line.includes(":") && line.length < 80) {
      const parts = line.split(":");
      const k = parts[0].trim();
      const v = parts.slice(1).join(":").trim();
      if (k && v && k.length > 2 && k.length < 30) {
        keyValues[k] = v;
      }
    }
  }

  return {
    documentNumber,
    documentDate,
    dueDate,
    amounts: {
      amountHt,
      vatRate,
      vatAmount,
      totalTtc,
      currency,
      isBalanced,
      discrepancy,
      reconciliationMessage,
    },
    lineItems,
    legalEntities: {
      siret,
      siren,
      tvaNumber,
      iban,
      emails,
      phones,
      companyName: null,
    },
    civilStatus: {
      actType,
      personName,
      eventDate: documentDate,
      municipality,
      registryNumber,
      fatherName,
      motherName,
      officerName,
      witnesses: [],
    },
    identity,
    keyValues,
  };
}

/**
 * Main OCR execution pipeline
 */
export async function processOcrDocument(
  imageSource: string | Buffer,
  options: {
    language?: string;
  } = {}
): Promise<OcrAnalysisResult> {
  const startTime = Date.now();
  const language = options.language || "fra+eng";

  try {
    const workerOptions: Record<string, unknown> = {};
    if (typeof window === "undefined") {
      const nodeWorkerPath = path.resolve(process.cwd(), "node_modules/tesseract.js/src/worker-script/node/index.js");
      const tessDataPath = path.resolve(process.cwd(), "public/tesseract/tessdata");
      workerOptions.workerPath = nodeWorkerPath;
      workerOptions.langPath = tessDataPath;
      workerOptions.gzip = false;
    }

    const worker = await createWorker(language, 1, workerOptions);

    const ret = await worker.recognize(imageSource);
    await worker.terminate();

    const fullText = ret.data.text || "";
    const confidenceScore = Math.round((ret.data.confidence || 0) * 10) / 10;

    const rawData = ret.data as unknown as {
      words?: Array<{ text: string; confidence: number; bbox?: { x0: number; y0: number; x1: number; y1: number } }>;
      paragraphs?: Array<{ text: string; confidence: number; lines?: Array<{ text: string }> }>;
      lines?: Array<{ text: string; confidence: number }>;
    };

    const rawWords = rawData.words || [];
    const rawParagraphs = rawData.paragraphs || [];
    const rawLines = rawData.lines || [];

    const words: OcrWord[] = rawWords.map((w) => ({
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

    const blocks: OcrBlock[] = rawParagraphs.length > 0
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

    return {
      success: true,
      classifiedType,
      confidenceScore,
      language,
      fullText,
      paragraphsCount: blocks.length,
      wordsCount: words.length,
      words,
      blocks,
      extractedFields,
      classification,
      processingTimeMs,
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Erreur traitement OCR";
    return {
      success: false,
      classifiedType: "DOCUMENT_GENERAL",
      confidenceScore: 0,
      language,
      fullText: "",
      paragraphsCount: 0,
      wordsCount: 0,
      words: [],
      blocks: [],
      extractedFields: {
        documentNumber: null,
        documentDate: null,
        dueDate: null,
        amounts: {
          amountHt: null,
          vatRate: null,
          vatAmount: null,
          totalTtc: null,
          currency: "EUR",
          isBalanced: true,
          discrepancy: 0,
          reconciliationMessage: "Erreur OCR",
        },
        lineItems: [],
        legalEntities: {
          siret: null,
          siren: null,
          tvaNumber: null,
          iban: null,
          emails: [],
          phones: [],
          companyName: null,
        },
        civilStatus: {
          actType: null,
          personName: null,
          eventDate: null,
          municipality: null,
          registryNumber: null,
          fatherName: null,
          motherName: null,
          officerName: null,
          witnesses: [],
        },
        identity: {
          documentType: null,
          documentNumber: null,
          nationality: null,
          holderSurname: null,
          holderGivenNames: null,
          birthDate: null,
          expiryDate: null,
          mrzLines: [],
        },
        keyValues: {},
      },
      processingTimeMs: Date.now() - startTime,
      error: errorMsg,
    };
  }
}
