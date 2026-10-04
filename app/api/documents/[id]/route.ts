import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { user, client: supabase } = await getAuthenticatedUser(req);

    if (!user || !supabase) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const { data: doc, error } = await supabase
      .from("documents")
      .select("*")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (error || !doc) {
      return NextResponse.json({ error: "Document introuvable" }, { status: 404 });
    }

    // Generate signed download URL
    const { data: signedData } = await supabase.storage
      .from("documents")
      .createSignedUrl(doc.path, 3600, { download: doc.name });

    return NextResponse.json({
      document: {
        ...doc,
        download_url: signedData?.signedUrl ?? null,
      },
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Erreur interne";
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { user, client: supabase } = await getAuthenticatedUser(req);

    if (!user || !supabase) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    // 1. Get document details
    const { data: doc, error: docError } = await supabase
      .from("documents")
      .select("id, path, size_bytes")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (docError || !doc) {
      return NextResponse.json({ error: "Document introuvable" }, { status: 404 });
    }

    // 2. Release quota
    if (doc.size_bytes && doc.size_bytes > 0) {
      await supabase.rpc("release_document_bytes", {
        released_bytes: doc.size_bytes,
      });
    }

    // 3. Remove from storage
    if (doc.path) {
      await supabase.storage.from("documents").remove([doc.path]);
    }

    // 4. Delete record
    const { error: deleteError } = await supabase
      .from("documents")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: "Document supprimé et quota libéré avec succès.",
      released_bytes: doc.size_bytes,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Erreur interne";
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
