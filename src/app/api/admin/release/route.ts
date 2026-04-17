/**
 * POST /api/admin/release
 * Body: { readingId: string, readings?: Record<string,string> }
 * Re-renders PDFs for every language, uploads to storage, marks released.
 * Only callable by an admin user.
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { adminClient } from "@/lib/supabase/admin";
import { renderReadingPdf } from "@/lib/pdf/generate";

const LANG_LABEL: Record<string, string> = {
  en: "English",
  ta: "Tamil",
  ms: "Bahasa Malaysia",
};

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(req: NextRequest) {
  const supaUser = createClient();
  const { data: { user } } = await supaUser.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const admin = adminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();
  if (!profile?.is_admin) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { readingId, readings: overrides } = await req.json();
  if (!readingId) return NextResponse.json({ error: "missing_id" }, { status: 400 });

  const { data: r } = await admin
    .from("readings")
    .select("*")
    .eq("id", readingId)
    .single();
  if (!r) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const readingsToUse: Record<string, string> = overrides ?? r.readings ?? {};
  const pdfPaths: Record<string, string> = {};

  for (const [code, md] of Object.entries(readingsToUse)) {
    const lang = LANG_LABEL[code] ?? code;
    const pdf = await renderReadingPdf({
      markdown: md,
      clientName: r.full_name,
      language: lang,
      birthDate: r.birth_date,
      birthTime: r.birth_time,
      birthPlace: r.birth_place_name,
    });
    const storagePath = `${r.id}/${code}.pdf`;
    const { error: upErr } = await admin
      .storage.from("readings")
      .upload(storagePath, pdf, {
        upsert: true,
        contentType: "application/pdf",
      });
    if (upErr) {
      return NextResponse.json({ error: "upload_failed", message: upErr.message }, { status: 500 });
    }
    pdfPaths[code] = storagePath;
  }

  await admin
    .from("readings")
    .update({
      readings: readingsToUse,
      pdf_paths: pdfPaths,
      status: "released",
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", readingId);

  await admin.from("admin_audit").insert({
    reading_id: readingId,
    admin_id: user.id,
    action: "release",
    diff: { languages: Object.keys(readingsToUse) },
  });

  return NextResponse.json({ ok: true, pdfPaths });
}
