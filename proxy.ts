import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const adminPaths = ["/users", "/accounting"];

export async function proxy(request: NextRequest) {
  const response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  const isProtected =
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/documents") ||
    pathname.startsWith("/digital-docs") ||
    pathname.startsWith("/pricing") ||
    pathname.startsWith("/products") ||
    pathname.startsWith("/nos-produits") ||
    pathname.startsWith("/devis") ||
    pathname.startsWith("/billing") ||
    pathname.startsWith("/commande");

  const isAdminPage = adminPaths.some((path) => pathname.startsWith(path));

  if ((isProtected || isAdminPage) && !user) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (isAdminPage && user?.app_metadata?.role !== "manager") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return response;
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/documents/:path*",
    "/digital-docs/:path*",
    "/pricing/:path*",
    "/products/:path*",
    "/nos-produits/:path*",
    "/devis/:path*",
    "/commande/:path*",
    "/users/:path*",
    "/billing/:path*",
    "/accounting/:path*",
  ],
};
