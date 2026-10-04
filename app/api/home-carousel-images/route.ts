import { readdir } from "node:fs/promises";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const allowedImageExtension = /\.(avif|gif|jpe?g|png|webp)$/i;

export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (supabaseUrl && anonKey) {
    const supabase = createClient(supabaseUrl, anonKey);
    const { data, error } = await supabase
      .from("homepage_banners")
      .select("title, alt_text, image_url")
      .eq("is_active", true)
      .order("sort_order", { ascending: true });

    if (!error) {
      return Response.json(
        {
          images: data.map((banner) => ({
            src: banner.image_url,
            alt: banner.alt_text || banner.title,
          })),
        },
        { headers: { "Cache-Control": "no-store, max-age=0" } },
      );
    }
  }

  try {
    const imageDirectory = path.join(process.cwd(), "public", "images", "carousel");
    const entries = await readdir(imageDirectory, { withFileTypes: true });
    const images = entries
      .filter((entry) => entry.isFile() && allowedImageExtension.test(entry.name))
      .map((entry) => ({
        src: `/images/carousel/${encodeURIComponent(entry.name)}`,
        alt: entry.name.replace(/\.[^.]+$/, "").replace(/[-_]/g, " "),
      }))
      .sort((left, right) => left.src.localeCompare(right.src));

    return Response.json(
      { images },
      { headers: { "Cache-Control": "no-store, max-age=0" } },
    );
  } catch {
    return Response.json(
      { images: [] },
      { headers: { "Cache-Control": "no-store, max-age=0" } },
    );
  }
}
