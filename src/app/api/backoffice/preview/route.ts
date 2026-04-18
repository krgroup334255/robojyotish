/**
 * POST /api/backoffice/preview
 * Body: { readingId, language, markdown }
 *
 * Renders a PDF preview using the current markdown WITHOUT saving it
 * or marking the reading as released. Streams the PDF back so the
 * admin can eyeball the final output before approving.
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
export const maxDuration = 120;

export async function POST(req: NextRequest) {
  const supaUser = createClient();
  const {
    data: { user },
  } = await supaUser.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const admin = adminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();
  if (!profile?.is_admin)
    return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { readingId, language, markdown } = await req.json();
  const { data: r } = await admin
    .from("readings")
    .select("full_name, birth_date, birth_time, birth_place_name")
    .eq("id", readingId)
    .single();
  if (!r) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const pdf = await renderReadingPdf({
    markdown: markdown ?? "",
    clientName: r.full_name,
    language: LANG_LABEL[language] ?? language,
    birthDate: r.birth_date,
    birthTime: r.birth_time,
    birthPlace: r.birth_place_name,
  });

  return new NextResponse(pdf as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="preview-${readingId}-${language}.pdf"`,
    },
  });
}
