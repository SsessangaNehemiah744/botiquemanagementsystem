import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const path = request.nextUrl.pathname;

  // Allow all public paths
  if (
    path === "/login" ||
    path === "/signup" ||
    path === "/" ||
    path.startsWith("/api") ||
    path.startsWith("/_next") ||
    path.startsWith("/favicon") ||
    path.startsWith("/manifest") ||
    path.startsWith("/sw.js") ||
    path.startsWith("/icon")
  ) {
    return supabaseResponse;
  }

  // For protected routes, just let them through
  // The layouts will handle session check (including offline)
  return supabaseResponse;
}

export const config = {
  matcher: [
    "/",
    "/login",
    "/signup",
    "/dashboard/:path*",
    "/manager/:path*",
    "/cashier/:path*",
  ],
};