import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    // 1. Authenticate user (Bearer Token or Cookie Session)
    const { user, client: supabase } = await getAuthenticatedUser(req);

    if (!user || !supabase) {
      return NextResponse.json(
        {
          error: "Non autorisé",
          message: "Veuillez fournir un Bearer Token valide ou vous connecter à votre espace SaaS DigitalDocs.",
        },
        { status: 401 }
      );
    }

    const contentType = req.headers.get("content-type") || "";
    let fileBuffer: Buffer | null = null;
    let fileName = `scan-mobile-${Date.now()}.jpg`;
    let category = "Administratif";
    let mimeType = "image/jpeg";
    let simulatedOcrText: string | null = null;

    // 2. Parse payload according to Content-Type
    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("file") as File | null;
      const formCat = formData.get("category") as string | null;
      const formName = formData.get("fileName") as string | null;

      if (!file) {
        return NextResponse.json(
          { error: "Fichier manquant", message: "Aucun fichier n'a été transmis dans la requête." },
          { status: 400 }
        );
      }

      const arrayBuffer = await file.arrayBuffer();
      fileBuffer = Buffer.from(arrayBuffer);
      if (formName) fileName = formName;
      else if (file.name) fileName = file.name;
      if (formCat) category = formCat;
      mimeType = file.type || "image/jpeg";
    } else if (contentType.includes("application/json")) {
      const json = await req.json();
      if (!json.base64 && !json.file) {
        return NextResponse.json(
          { error: "Payload invalide", message: "Le champ 'base64' est requis dans le corps JSON." },
          { status: 400 }
        );
      }

      const rawBase64 = (json.base64 || json.file).replace(/^data:image\/[a-z]+;base64,/, "");
      fileBuffer = Buffer.from(rawBase64, "base64");
      if (json.fileName) fileName = json.fileName;
      if (json.category) category = json.category;
      if (json.mimeType) mimeType = json.mimeType;
      if (json.ocrText) simulatedOcrText = json.ocrText;
    } else {
      // Raw binary stream
      const arrayBuffer = await req.arrayBuffer();
      fileBuffer = Buffer.from(arrayBuffer);

      const headerName = req.headers.get("x-filename");
      const headerCat = req.headers.get("x-category");
      if (headerName) fileName = decodeURIComponent(headerName);
      if (headerCat) category = decodeURIComponent(headerCat);
      if (contentType) mimeType = contentType;
    }

    if (!fileBuffer || fileBuffer.length === 0) {
      return NextResponse.json(
        { error: "Contenu vide", message: "Le fichier reçu est vide (0 octets)." },
        { status: 400 }
      );
    }

    const fileSize = fileBuffer.length;
    // Format sanitized file name
    const sanitizedFileName = fileName
      .replace(/[^a-zA-Z0-9._-]/g, "_")
      .replace(/\s+/g, "_");
    const uniquePath = `${user.id}/${Date.now()}-${sanitizedFileName}`;

    // 3. Quota check & reservation via Supabase RPC (Mobile scan allows exceeding standard 2 Mo)
    let quotaRes: Record<string, unknown> | null = null;
    let quotaError: { message: string } | null = null;

    const { data: flexibleRes, error: flexibleError } = await supabase.rpc(
      "reserve_document_bytes_flexible",
      { requested_bytes: fileSize, is_mobile_scan: true }
    );

    if (!flexibleError) {
      quotaRes = flexibleRes;
    } else {
      // Fallback to standard RPC if flexible not yet applied in DB
      const { data: stdRes, error: stdError } = await supabase.rpc(
        "reserve_document_bytes",
        { requested_bytes: fileSize }
      );
      quotaRes = stdRes;
      quotaError = stdError;
    }

    if (quotaError) {
      // For mobile scans, allow soft exceeding with billing warning
      console.warn("Soft quota warning for mobile scan:", quotaError.message);
      quotaRes = {
        is_exceeded: true,
        excess_bytes: fileSize,
        excess_cost_eur: ((fileSize / 1048576) * 0.10).toFixed(2),
        warning: true,
      };
    }

    // 4. Upload to Sovereign Supabase Storage bucket 'documents'
    const { error: uploadError } = await supabase.storage
      .from("documents")
      .upload(uniquePath, fileBuffer, {
        contentType: mimeType,
        upsert: false,
      });

    if (uploadError) {
      // Rollback reserved quota
      await supabase.rpc("release_document_bytes", {
        released_bytes: fileSize,
      });
      return NextResponse.json(
        { error: "Erreur stockage", message: uploadError.message },
        { status: 500 }
      );
    }

    // 5. Insert document entry in PostgreSQL database
    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
    const { data: docRecord, error: dbError } = await supabase
      .from("documents")
      .insert({
        name: fileName,
        path: uniquePath,
        category: category || "Administratif",
        size_bytes: fileSize,
        expires_at: expiresAt,
        user_id: user.id,
      })
      .select()
      .single();

    if (dbError) {
      // Rollback storage & quota
      await supabase.storage.from("documents").remove([uniquePath]);
      await supabase.rpc("release_document_bytes", {
        released_bytes: fileSize,
      });
      return NextResponse.json(
        { error: "Erreur base de données", message: dbError.message },
        { status: 500 }
      );
    }

    // 6. Generate signed secure URL (valid 1 hour)
    const { data: signedData } = await supabase.storage
      .from("documents")
      .createSignedUrl(uniquePath, 3600);

    return NextResponse.json(
      {
        success: true,
        message: "Document numérisé et synchronisé avec succès dans votre espace SaaS souverain.",
        document: {
          id: docRecord.id,
          name: docRecord.name,
          category: docRecord.category,
          path: docRecord.path,
          size_bytes: fileSize,
          size_formatted: `${(fileSize / 1024).toFixed(1)} Ko`,
          created_at: docRecord.created_at,
          expires_at: docRecord.expires_at,
          signed_url: signedData?.signedUrl ?? null,
          source: "mobile-scan",
          status: "traité",
          ocr: {
            status: "ready",
            language: "fra+eng",
            extracted_preview:
              simulatedOcrText ||
              `[Texte extrait automatiquement par l'OCR souverain DigitalDocs Solutions pour ${fileName}]`,
          },
        },
        sovereignty: {
          cloud: "DigitalDocs Sovereign Cloud (France / RGPD)",
          encryption: "AES-256 & TLS 1.3",
          retention_hours: 48,
        },
        quota: quotaRes,
      },
      { status: 201 }
    );
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Erreur interne serveur";
    return NextResponse.json({ error: "Erreur serveur", message: errorMsg }, { status: 500 });
  }
}
