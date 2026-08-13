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

  // Public routes — allow without checks
  if (
    path === "/login" ||
    path === "/signup" ||
    path === "/" ||
    path.startsWith("/api") ||
    path.startsWith("/_next") ||
    path.startsWith("/favicon")
  ) {
    return supabaseResponse;
  }

  const { data: { user } } = await supabase.auth.getUser();

  // Not logged in
  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Get user role
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, status")
    .eq("id", user.id)
    .single();

  const userRole = profile?.role || "cashier";

  // Block inactive
  if (profile?.status === "INACTIVE") {
    return NextResponse.redirect(new URL("/login?error=pending", request.url));
  }

  // Redirect /dashboard to role-based route
  if (path.startsWith("/dashboard")) {
    const newPath = path.replace("/dashboard", userRole === "cashier" ? "/cashier" : "/manager");
    return NextResponse.redirect(new URL(newPath, request.url));
  }

  // Cashier can't access /manager
  if (userRole === "cashier" && path.startsWith("/manager")) {
    return NextResponse.redirect(new URL("/cashier", request.url));
  }

  // Manager can't access /cashier
  if (userRole === "admin" && path.startsWith("/cashier")) {
    return NextResponse.redirect(new URL("/manager", request.url));
  }

  // Root redirect
  if (path === "/") {
    const redirectPath = userRole === "cashier" ? "/cashier" : "/manager";
    return NextResponse.redirect(new URL(redirectPath, request.url));
  }

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