/**
 * POST /api/admin/regenerate
 * Body: { readingId, language }  — regenerates the AI text for a given language.
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { adminClient } from "@/lib/supabase/admin";
import { generateReading } from "@/lib/claude/reading";

const LANG_LABEL: Record<string, string> = {
  en: "English", ta: "Tamil", ms: "Bahasa Malaysia",
};

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(req: NextRequest) {
  const supaUser = createClient();
  const { data: { user } } = await supaUser.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const admin = adminClient();
  const { data: profile } = await admin
    .from("profiles").select("is_admin").eq("id", user.id).single();
  if (!profile?.is_admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { readingId, language } = await req.json();
  const { data: r } = await admin.from("readings").select("*").eq("id", readingId).single();
  if (!r || !r.chart_data) {
    return NextResponse.json({ error: "no_chart" }, { status: 400 });
  }
  const code = language as string;
  const text = await generateReading({
    chart: r.chart_data,
    fullName: r.full_name,
    birthPlaceName: r.birth_place_name,
    currentLocation: r.current_location ?? undefined,
    lifeEvents: r.life_events ?? [],
    lifeEventsNotes: r.life_events_notes ?? undefined,
    language: LANG_LABEL[code] ?? code,
  });
  const readings = { ...(r.readings ?? {}), [code]: text };
  await admin.from("readings").update({ readings }).eq("id", readingId);
  return NextResponse.json({ ok: true, text });
}
