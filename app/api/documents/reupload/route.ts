import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { user, client: supabase } = await getAuthenticatedUser(req);

    if (!user || !supabase) {
      return NextResponse.json(
        { error: "Non autorisé", message: "Veuillez vous authentifier." },
        { status: 401 }
      );
    }

    const contentType = req.headers.get("content-type") || "";
    let documentId = "";
    let fileBuffer: Buffer | null = null;
    let fileName = "";
    let mimeType = "image/jpeg";

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      documentId = (formData.get("documentId") as string) || "";
      const file = formData.get("file") as File | null;
      if (file) {
        const arrayBuffer = await file.arrayBuffer();
        fileBuffer = Buffer.from(arrayBuffer);
        fileName = file.name;
        mimeType = file.type || "image/jpeg";
      }
    } else if (contentType.includes("application/json")) {
      const json = await req.json();
      documentId = json.documentId;
      if (json.base64 || json.file) {
        const rawBase64 = (json.base64 || json.file).replace(/^data:image\/[a-z]+;base64,/, "");
        fileBuffer = Buffer.from(rawBase64, "base64");
      }
      if (json.fileName) fileName = json.fileName;
      if (json.mimeType) mimeType = json.mimeType;
    }

    if (!documentId) {
      return NextResponse.json(
        { error: "Paramètre manquant", message: "L'identifiant 'documentId' est requis." },
        { status: 400 }
      );
    }

    if (!fileBuffer || fileBuffer.length === 0) {
      return NextResponse.json(
        { error: "Fichier manquant", message: "Aucun nouveau fichier n'a été fourni pour le ré-upload." },
        { status: 400 }
      );
    }

    // 1. Fetch current document
    const { data: currentDoc, error: fetchError } = await supabase
      .from("documents")
      .select("*")
      .eq("id", documentId)
      .eq("user_id", user.id)
      .single();

    if (fetchError || !currentDoc) {
      return NextResponse.json(
        { error: "Document introuvable", message: "Le document n'existe pas ou ne vous appartient pas." },
        { status: 404 }
      );
    }

    const newSize = fileBuffer.length;
    const oldSize = currentDoc.size_bytes || 0;
    const sizeDiff = newSize - oldSize;

    // 2. Adjust quota: reserve if bigger, release if smaller
    if (sizeDiff > 0) {
      const { error: quotaError } = await supabase.rpc("reserve_document_bytes", {
        requested_bytes: sizeDiff,
      });
      if (quotaError) {
        return NextResponse.json(
          {
            error: "Quota insuffisant",
            message: `Impossible de ré-uploader : la nouvelle version nécessite ${ (sizeDiff / 1024).toFixed(1) } Ko de plus. Quota de 2 Mo dépassé.`,
          },
          { status: 403 }
        );
      }
    } else if (sizeDiff < 0) {
      await supabase.rpc("release_document_bytes", {
        released_bytes: Math.abs(sizeDiff),
      });
    }

    // 3. Upload new version to Storage
    const sanitizedName = (fileName || currentDoc.name)
      .replace(/[^a-zA-Z0-9._-]/g, "_")
      .replace(/\s+/g, "_");
    const newPath = `${user.id}/${Date.now()}-${sanitizedName}`;

    const { error: uploadError } = await supabase.storage
      .from("documents")
      .upload(newPath, fileBuffer, {
        contentType: mimeType,
        upsert: false,
      });

    if (uploadError) {
      // Rollback quota adjustment if we had reserved
      if (sizeDiff > 0) {
        await supabase.rpc("release_document_bytes", { released_bytes: sizeDiff });
      } else if (sizeDiff < 0) {
        await supabase.rpc("reserve_document_bytes", { requested_bytes: Math.abs(sizeDiff) });
      }
      return NextResponse.json(
        { error: "Erreur lors du stockage", message: uploadError.message },
        { status: 500 }
      );
    }

    // 4. Remove old storage file
    if (currentDoc.path) {
      await supabase.storage.from("documents").remove([currentDoc.path]);
    }

    // 5. Update database record
    const { data: updatedDoc, error: updateError } = await supabase
      .from("documents")
      .update({
        name: fileName || currentDoc.name,
        path: newPath,
        size_bytes: newSize,
        expires_at: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
      })
      .eq("id", documentId)
      .eq("user_id", user.id)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json(
        { error: "Erreur mise à jour base de données", message: updateError.message },
        { status: 500 }
      );
    }

    // 6. Generate new signed URL
    const { data: signedData } = await supabase.storage
      .from("documents")
      .createSignedUrl(newPath, 3600);

    return NextResponse.json({
      success: true,
      message: "Document ré-uploadé et remplacé avec succès dans votre espace souverain.",
      document: {
        id: updatedDoc.id,
        name: updatedDoc.name,
        category: updatedDoc.category,
        path: updatedDoc.path,
        size_bytes: newSize,
        size_formatted: `${(newSize / 1024).toFixed(1)} Ko`,
        created_at: updatedDoc.created_at,
        expires_at: updatedDoc.expires_at,
        signed_url: signedData?.signedUrl ?? null,
        reuploaded: true,
      },
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Erreur interne";
    return NextResponse.json({ error: "Erreur serveur", message: errorMsg }, { status: 500 });
  }
}
