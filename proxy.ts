import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { ADMIN_PIN_COOKIE, verifyAdminPinSessionToken } from "@/lib/adminPin";

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
    pathname.startsWith("/api-docs") ||
    pathname.startsWith("/billing") ||
    pathname.startsWith("/commande");

  const isAdminPage = adminPaths.some((path) => pathname.startsWith(path));
  const normalizedEmail = user?.email?.toLowerCase();
  const isAdminUser = Boolean(
    user &&
      (user.app_metadata?.role === "manager" ||
        normalizedEmail === "adiiopase@gmail.com" ||
        normalizedEmail === "adiopa@yahoo.fr"),
  );

  if ((isProtected || isAdminPage) && !user) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (isAdminPage && !isAdminUser) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  const requiresAdminPin = isAdminPage ||
    (normalizedEmail === "adiiopase@gmail.com" && pathname.startsWith("/dashboard"));

  if (requiresAdminPin && !verifyAdminPinSessionToken(request.cookies.get(ADMIN_PIN_COOKIE)?.value)) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    loginUrl.searchParams.set("requiresAdminPin", "1");
    return NextResponse.redirect(loginUrl);
  }

  return response;
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/documents/:path*",
    "/digital-docs/:path*",
    "/api-docs/:path*",
    "/commande/:path*",
    "/users/:path*",
    "/billing/:path*",
    "/accounting/:path*",
  ],
};
