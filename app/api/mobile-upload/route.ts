import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

export async function POST(req: NextRequest) {
  // 1. Vérifier le token envoyé par l'app mobile
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.replace("Bearer ", "");

  if (!token) {
    return NextResponse.json({ error: "Token manquant" }, { status: 401 });
  }

  // 2. Vérifier que le token correspond à un utilisateur Supabase
  const { data: userData, error: authError } = await supabase.auth.getUser(token);

  if (authError || !userData?.user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const user = userData.user;

  // 3. Récupérer le fichier envoyé (scan mobile)
  const arrayBuffer = await req.arrayBuffer();
  const fileBuffer = Buffer.from(arrayBuffer);

  // 4. Générer un nom unique
  const fileName = `scan-mobile-${Date.now()}.jpg`;
  const path = `${user.id}/${fileName}`;

  // 5. Upload dans Supabase Storage
  const { error: uploadError } = await supabase.storage
    .from("documents")
    .upload(path, fileBuffer, {
      contentType: "image/jpeg",
      upsert: false,
    });

  if (uploadError) {
    return NextResponse.json({ error: "Erreur upload" }, { status: 500 });
  }

  // 6. Récupérer l’URL publique
  const { data: publicData } = supabase.storage
    .from("documents")
    .getPublicUrl(path);

  // 7. Réponse envoyée à l'app mobile
  return NextResponse.json(
    {
      url: publicData.publicUrl,
      name: fileName,
      owner: user.id,
      source: "mobile",
    },
    { status: 200 }
  );
}
