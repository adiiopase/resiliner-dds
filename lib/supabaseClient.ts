import { createBrowserClient } from "@supabase/ssr";

console.log("SUPABASE_URL =", process.env.NEXT_PUBLIC_SUPABASE_URL);
console.log("SUPABASE_KEY =", process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);
