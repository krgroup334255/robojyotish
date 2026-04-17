/**
 * POST /api/download — issues a signed URL for the caller's PDF.
 * Body form-encoded: readingId, language
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { adminClient } from "@/lib/supabase/admin";

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const readingId = String(form.get("readingId") ?? "");
  const language = String(form.get("language") ?? "");

  const supa = createClient();
  const { data: { user } } = await supa.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/login", req.url));

  const admin = adminClient();
  const { data: r } = await admin
    .from("readings")
    .select("email, pdf_paths, status, user_id")
    .eq("id", readingId)
    .single();
  if (!r) return NextResponse.json({ error: "not_found" }, { status: 404 });

  // Owner check: email match OR admin
  const { data: profile } = await admin
    .from("profiles").select("is_admin").eq("id", user.id).single();
  const isOwner = r.email === user.email;
  if (!isOwner && !profile?.is_admin) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  if (r.status !== "released" && !profile?.is_admin) {
    return NextResponse.json({ error: "not_ready" }, { status: 400 });
  }
  const path = (r.pdf_paths as Record<string, string> | null)?.[language];
  if (!path) return NextResponse.json({ error: "no_pdf" }, { status: 404 });

  const { data: signed } = await admin.storage
    .from("readings").createSignedUrl(path, 60 * 5);
  if (!signed?.signedUrl) {
    return NextResponse.json({ error: "sign_failed" }, { status: 500 });
  }
  return NextResponse.redirect(signed.signedUrl);
}
