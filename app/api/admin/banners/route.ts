import { randomUUID } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { ADMIN_PIN_COOKIE, verifyAdminPinSessionToken } from "@/lib/adminPin";
import { getAuthenticatedUser } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";

const allowedImageTypes: Record<string, string> = {
  "image/avif": "avif",
  "image/gif": "gif",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};
const maxImageBytes = 10 * 1024 * 1024;

type AdminAccess =
  | { authorized: true; client: SupabaseClient }
  | { authorized: false; response: NextResponse };

async function requireAdmin(req: NextRequest): Promise<AdminAccess> {
  const { user } = await getAuthenticatedUser(req);
  const email = user?.email?.toLowerCase();
  const isManager = Boolean(
    user &&
      (user.app_metadata?.role === "manager" ||
        email === "adiiopase@gmail.com" ||
        email === "adiopa@yahoo.fr"),
  );

  if (!user) {
    return {
      authorized: false,
      response: NextResponse.json({ error: "Authentification requise." }, { status: 401 }),
    };
  }
  if (!isManager) {
    return {
      authorized: false,
      response: NextResponse.json({ error: "Accès administrateur requis." }, { status: 403 }),
    };
  }
  if (!verifyAdminPinSessionToken(req.cookies.get(ADMIN_PIN_COOKIE)?.value)) {
    return {
      authorized: false,
      response: NextResponse.json({ error: "Authentification administrateur renforcée requise." }, { status: 403 }),
    };
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    return {
      authorized: false,
      response: NextResponse.json(
        { error: "Configuration serveur Supabase indisponible." },
        { status: 503 },
      ),
    };
  }

  return {
    authorized: true,
    client: createClient(url, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    }),
  };
}

export async function GET(req: NextRequest) {
  const access = await requireAdmin(req);
  if (!access.authorized) return access.response;

  const { data, error } = await access.client
    .from("homepage_banners")
    .select("id, title, alt_text, image_url, storage_path, is_active, sort_order, created_at")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ banners: data });
}

export async function POST(req: NextRequest) {
  const access = await requireAdmin(req);
  if (!access.authorized) return access.response;

  const form = await req.formData();
  const image = form.get("image");
  const title = String(form.get("title") || "").trim();
  const altText = String(form.get("alt_text") || "").trim();

  if (!(image instanceof File) || !title) {
    return NextResponse.json(
      { error: "Une image et un titre sont obligatoires." },
      { status: 400 },
    );
  }

  const extension = allowedImageTypes[image.type];
  if (!extension) {
    return NextResponse.json(
      { error: "Format non pris en charge. Utilise JPEG, PNG, WebP, AVIF ou GIF." },
      { status: 415 },
    );
  }
  if (image.size <= 0 || image.size > maxImageBytes) {
    return NextResponse.json(
      { error: "L’image doit peser entre 1 octet et 10 Mo." },
      { status: 413 },
    );
  }

  const storagePath = `${randomUUID()}.${extension}`;
  const { error: uploadError } = await access.client.storage
    .from("home-carousel")
    .upload(storagePath, await image.arrayBuffer(), {
      contentType: image.type,
      upsert: false,
    });

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  const { data: publicUrl } = access.client.storage
    .from("home-carousel")
    .getPublicUrl(storagePath);
  const { data: lastBanner } = await access.client
    .from("homepage_banners")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data, error } = await access.client
    .from("homepage_banners")
    .insert({
      title,
      alt_text: altText || title,
      image_url: publicUrl.publicUrl,
      storage_path: storagePath,
      sort_order: (lastBanner?.sort_order ?? -1) + 1,
    })
    .select("id, title, alt_text, image_url, storage_path, is_active, sort_order, created_at")
    .single();

  if (error) {
    await access.client.storage.from("home-carousel").remove([storagePath]);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ banner: data }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const access = await requireAdmin(req);
  if (!access.authorized) return access.response;

  const isMultipart = req.headers.get("content-type")?.includes("multipart/form-data") || false;
  const body = isMultipart ? await req.formData() : await req.json();
  const id = typeof body.get === "function"
    ? String(body.get("id") || "")
    : typeof body.id === "string" ? body.id : "";
  const changes: Record<string, string | number | boolean> = {};
  let newStoragePath = "";
  let oldStoragePath: string | null = null;

  if (isMultipart) {
    const form = body as FormData;
    const image = form.get("image");
    const title = String(form.get("title") || "").trim();
    if (!(image instanceof File) || !title) {
      return NextResponse.json({ error: "Une nouvelle image et un titre sont obligatoires." }, { status: 400 });
    }

    const extension = allowedImageTypes[image.type];
    if (!extension) {
      return NextResponse.json({ error: "Format d’image non pris en charge." }, { status: 415 });
    }
    if (image.size <= 0 || image.size > maxImageBytes) {
      return NextResponse.json({ error: "L’image doit peser au maximum 10 Mo." }, { status: 413 });
    }

    const { data: current, error: findError } = await access.client
      .from("homepage_banners")
      .select("storage_path")
      .eq("id", id)
      .single();
    if (findError || !current) {
      return NextResponse.json({ error: "Bannière introuvable." }, { status: 404 });
    }

    newStoragePath = `${randomUUID()}.${extension}`;
    const { error: uploadError } = await access.client.storage
      .from("home-carousel")
      .upload(newStoragePath, await image.arrayBuffer(), {
        contentType: image.type,
        upsert: false,
      });
    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    const { data: publicUrl } = access.client.storage
      .from("home-carousel")
      .getPublicUrl(newStoragePath);
    oldStoragePath = current.storage_path;
    changes.title = title;
    changes.alt_text = String(form.get("alt_text") || "").trim() || title;
    changes.image_url = publicUrl.publicUrl;
    changes.storage_path = newStoragePath;
  } else {
    const jsonBody = body as Record<string, unknown>;
    if (typeof jsonBody.title === "string" && jsonBody.title.trim()) changes.title = jsonBody.title.trim();
    if (typeof jsonBody.alt_text === "string") changes.alt_text = jsonBody.alt_text.trim();
    if (typeof jsonBody.is_active === "boolean") changes.is_active = jsonBody.is_active;
    if (Number.isInteger(jsonBody.sort_order)) changes.sort_order = jsonBody.sort_order as number;
  }

  if (!id || !Object.keys(changes).length) {
    if (newStoragePath) await access.client.storage.from("home-carousel").remove([newStoragePath]);
    return NextResponse.json(
      { error: "Identifiant ou modifications invalides." },
      { status: 400 },
    );
  }

  changes.updated_at = new Date().toISOString();
  const { data, error } = await access.client
    .from("homepage_banners")
    .update(changes)
    .eq("id", id)
    .select("id, title, alt_text, image_url, storage_path, is_active, sort_order, created_at")
    .single();

  if (error) {
    if (newStoragePath) await access.client.storage.from("home-carousel").remove([newStoragePath]);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (oldStoragePath) {
    await access.client.storage.from("home-carousel").remove([oldStoragePath]);
  }
  return NextResponse.json({ banner: data });
}

export async function DELETE(req: NextRequest) {
  const access = await requireAdmin(req);
  if (!access.authorized) return access.response;

  const body = await req.json();
  const id = typeof body.id === "string" ? body.id : "";
  if (!id) return NextResponse.json({ error: "Identifiant manquant." }, { status: 400 });

  const { data: banner, error: findError } = await access.client
    .from("homepage_banners")
    .select("id, storage_path")
    .eq("id", id)
    .single();

  if (findError || !banner) {
    return NextResponse.json({ error: "Bannière introuvable." }, { status: 404 });
  }

  const { error } = await access.client
    .from("homepage_banners")
    .delete()
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (banner.storage_path) {
    const { error: storageError } = await access.client.storage
      .from("home-carousel")
      .remove([banner.storage_path]);
    if (storageError) {
      return NextResponse.json({
        success: true,
        warning: `Bannière supprimée, mais le fichier de stockage n’a pas pu être supprimé : ${storageError.message}`,
      });
    }
  }

  return NextResponse.json({ success: true });
}
