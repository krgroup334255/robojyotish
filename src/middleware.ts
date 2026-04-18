import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(req: NextRequest) {
  const res = NextResponse.next({ request: req });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) { return req.cookies.get(name)?.value; },
        set(name, value, options) {
          res.cookies.set({ name, value, ...options });
        },
        remove(name, options) {
          res.cookies.set({ name, value: "", ...options });
        },
      },
    },
  );

  const { data: { user } } = await supabase.auth.getUser();
  const path = req.nextUrl.pathname;

  // Legacy /admin URLs → redirect permanently to /backoffice
  if (path === "/admin" || path.startsWith("/admin/")) {
    const url = req.nextUrl.clone();
    url.pathname = path.replace(/^\/admin/, "/backoffice");
    return NextResponse.redirect(url, 308);
  }

  // Back-office pages use the staff-login page (distinct from customer login)
  if (path.startsWith("/backoffice") && !user) {
    const url = req.nextUrl.clone();
    url.pathname = "/staff-login";
    return NextResponse.redirect(url);
  }

  // Customer-facing authenticated routes go to /login
  const needsAuth =
    path.startsWith("/dashboard") || path === "/reading";
  if (needsAuth && !user) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", path);
    return NextResponse.redirect(url);
  }
  return res;
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/backoffice/:path*",
    "/admin/:path*",
    "/reading",
  ],
};
