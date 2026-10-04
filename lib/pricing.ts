import { supabase } from "@/lib/supabaseClient";

export async function calculateOcrPrice(ocrType: string, pageCount: number) {
  const { data: product, error } = await supabase
    .from("products")
    .select("price_per_page_cents")
    .eq("product_code", ocrType)
    .single();

  if (error || !product) throw new Error("Produit OCR introuvable");

  const total_ht_cents = product.price_per_page_cents * pageCount;
  const total_ttc_cents = Math.round(total_ht_cents * 1.20); // TVA 20%

  return { total_ht_cents, total_ttc_cents };
}
