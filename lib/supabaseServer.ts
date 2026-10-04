import { createServerClient } from "@supabase/ssr";
import { createClient, SupabaseClient, User } from "@supabase/supabase-js";
import { NextRequest } from "next/server";

export type AuthContext = {
  user: User | null;
  client: SupabaseClient | null;
};

/**
 * Authenticates the user from either a Bearer JWT token (Mobile / API client)
 * or Next.js SSR session cookies (Web Portal).
 */
export async function getAuthenticatedUser(req: NextRequest): Promise<AuthContext> {
  const authHeader = req.headers.get("authorization");

  // 1. Check Bearer Token header
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.replace("Bearer ", "").trim();
    if (token) {
      const directClient = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          global: {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        }
      );

      const { data, error } = await directClient.auth.getUser(token);
      if (!error && data?.user) {
        return { user: data.user, client: directClient };
      }
    }
  }

  // 2. Check Cookie Session
  const cookieClient = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => req.cookies.getAll(),
        setAll: () => {},
      },
    }
  );

  const { data: cookieUserData, error: cookieError } = await cookieClient.auth.getUser();
  if (!cookieError && cookieUserData?.user) {
    return { user: cookieUserData.user, client: cookieClient };
  }

  return { user: null, client: null };
}
