/**
 * POST /api/download — issues a signed URL for the caller's PDF.
 * Body form-encoded: readingId, language
 *
 * Owner check: logged-in user's email (case-insensitive) must match
 * readings.email. Admins can always download.
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { adminClient } from "@/lib/supabase/admin";

function errorRedirect(req: NextRequest, code: string) {
  // Redirect back to the dashboard with an ?error= query so the user can see why.
  const url = new URL("/dashboard", req.url);
  url.searchParams.set("error", code);
  return NextResponse.redirect(url);
}

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const readingId = String(form.get("readingId") ?? "");
    const language = String(form.get("language") ?? "");
    if (!readingId || !language) return errorRedirect(req, "missing_params");

    const supa = createClient();
    const {
      data: { user },
    } = await supa.auth.getUser();
    if (!user) {
      const url = new URL("/login", req.url);
      url.searchParams.set("next", "/dashboard");
      return NextResponse.redirect(url);
    }

    const admin = adminClient();
    const { data: r } = await admin
      .from("readings")
      .select("email, pdf_paths, status")
      .eq("id", readingId)
      .single();
    if (!r) return errorRedirect(req, "reading_not_found");

    const { data: profile } = await admin
      .from("profiles")
      .select("is_admin")
      .eq("id", user.id)
      .single();

    const userEmail = (user.email ?? "").toLowerCase().trim();
    const ownerEmail = (r.email ?? "").toLowerCase().trim();
    const isOwner = userEmail === ownerEmail;
    const isAdmin = !!profile?.is_admin;

    if (!isOwner && !isAdmin) return errorRedirect(req, "forbidden");
    if (r.status !== "released" && !isAdmin) return errorRedirect(req, "not_ready");

    const storagePath = (r.pdf_paths as Record<string, string> | null)?.[
      language
    ];
    if (!storagePath) return errorRedirect(req, "no_pdf");

    const { data: signed, error: signErr } = await admin.storage
      .from("readings")
      .createSignedUrl(storagePath, 60 * 10); // 10 min
    if (signErr || !signed?.signedUrl) {
      console.error("[download] sign failed", signErr);
      return errorRedirect(req, "sign_failed");
    }
    return NextResponse.redirect(signed.signedUrl);
  } catch (e) {
    console.error("[download] fatal", e);
    return errorRedirect(req, "internal_error");
  }
}
