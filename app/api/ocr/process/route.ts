import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/supabaseServer";
import { processOcrDocument } from "@/lib/ocrEngine";

export const maxDuration = 60; // Allow sufficient duration for OCR processing

export async function POST(req: NextRequest) {
  const startTime = Date.now();

  try {
    // 1. Authenticate user (Cookie session or Bearer JWT) - Optional for demo
    const { user } = await getAuthenticatedUser(req);
    const userId = user?.id || "demo-anonymous-user";

    const contentType = req.headers.get("content-type") || "";

    let imageBuffer: Buffer | null = null;
    let filename = "document_scanne.jpg";
    let mimeType = "image/jpeg";
    let language = "fra+eng";

    // 2. Handle multipart/form-data upload
    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("file") as File | null;
      const langParam = formData.get("language") as string | null;

      if (langParam) language = langParam;

      if (!file) {
        return NextResponse.json(
          {
            success: false,
            error: "Aucun fichier fourni dans le champ 'file'.",
          },
          { status: 400 }
        );
      }

      filename = file.name || filename;
      mimeType = file.type || mimeType;

      const arrayBuffer = await file.arrayBuffer();
      imageBuffer = Buffer.from(arrayBuffer);
    }
    // 3. Handle application/json (base64 or URL)
    else if (contentType.includes("application/json")) {
      const body = await req.json().catch(() => ({}));
      const { imageBase64, language: langParam, filename: customFilename } = body;

      if (langParam) language = langParam;
      if (customFilename) filename = customFilename;

      if (!imageBase64 || typeof imageBase64 !== "string") {
        return NextResponse.json(
          {
            success: false,
            error: "Champ 'imageBase64' manquant ou invalide.",
          },
          { status: 400 }
        );
      }

      // Extract base64 payload if prefixed with data:image/...;base64,
      const cleanBase64 = imageBase64.includes(";base64,")
        ? imageBase64.split(";base64,")[1]
        : imageBase64;

      imageBuffer = Buffer.from(cleanBase64, "base64");
    } else {
      return NextResponse.json(
        {
          success: false,
          error: "Type de contenu non supporté. Utilisez 'multipart/form-data' ou 'application/json'.",
        },
        { status: 415 }
      );
    }

    if (!imageBuffer || imageBuffer.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Le fichier image est vide.",
        },
        { status: 400 }
      );
    }

    // 4. Run OCR pipeline
    const ocrResult = await processOcrDocument(imageBuffer, { language });

    if (!ocrResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: ocrResult.error || "Échec du traitement OCR sur le document.",
          processingTimeMs: Date.now() - startTime,
        },
        { status: 500 }
      );
    }

    // 5. Structure API response
    return NextResponse.json(
      {
        success: true,
        document: {
          filename,
          mimeType,
          sizeBytes: imageBuffer.length,
          sizeKb: Math.round(imageBuffer.length / 1024),
          classifiedType: ocrResult.classifiedType,
        },
        classification: ocrResult.classification,
        ocr: {
          fullText: ocrResult.fullText,
          confidenceScore: ocrResult.confidenceScore,
          language: ocrResult.language,
          paragraphsCount: ocrResult.paragraphsCount,
          wordsCount: ocrResult.wordsCount,
          blocks: ocrResult.blocks,
        },
        extractedFields: ocrResult.extractedFields,
        meta: {
          processedAt: new Date().toISOString(),
          processedByUserId: userId,
          processingTimeMs: ocrResult.processingTimeMs,
          engine: "DigitalDocs OCR Souverain v1.0",
        },
      },
      { status: 200 }
    );
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Erreur interne du serveur OCR";
    return NextResponse.json(
      {
        success: false,
        error: errorMsg,
        processingTimeMs: Date.now() - startTime,
      },
      { status: 500 }
    );
  }
}
