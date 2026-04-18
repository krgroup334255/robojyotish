/**
 * POST /api/backoffice/regenerate
 * Body: { readingId, language }  — regenerates the AI text for a given language.
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { adminClient } from "@/lib/supabase/admin";
import { generateReading, ageFromBirthDate } from "@/lib/claude/reading";

const LANG_LABEL: Record<string, string> = {
  en: "English", ta: "Tamil", ms: "Bahasa Malaysia",
};

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(req: NextRequest) {
  try {
    const supaUser = createClient();
    const { data: { user } } = await supaUser.auth.getUser();
    if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const admin = adminClient();
    const { data: profile } = await admin
      .from("profiles").select("is_admin").eq("id", user.id).single();
    if (!profile?.is_admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });

    const { readingId, language } = await req.json();
    if (!readingId || !language) {
      return NextResponse.json({ error: "missing_params" }, { status: 400 });
    }

    const { data: r } = await admin.from("readings").select("*").eq("id", readingId).single();
    if (!r) return NextResponse.json({ error: "not_found" }, { status: 404 });
    if (!r.chart_data) {
      return NextResponse.json({ error: "no_chart" }, { status: 400 });
    }

    const code = language as string;
    let text: string;
    try {
      text = await generateReading({
        chart: r.chart_data,
        fullName: r.full_name,
        birthPlaceName: r.birth_place_name,
        currentLocation: r.current_location ?? undefined,
        lifeEvents: r.life_events ?? [],
        lifeEventsNotes: r.life_events_notes ?? undefined,
        language: LANG_LABEL[code] ?? code,
        ageYears: ageFromBirthDate(r.birth_date),
      });
    } catch (e) {
      console.error("[regenerate] Claude error", e);
      return NextResponse.json(
        {
          error: "claude_failed",
          message: (e as Error).message,
        },
        { status: 502 },
      );
    }

    const readings = { ...(r.readings ?? {}), [code]: text };
    await admin.from("readings").update({ readings }).eq("id", readingId);
    return NextResponse.json({ ok: true, text });
  } catch (e) {
    console.error("[regenerate] fatal", e);
    return NextResponse.json(
      { error: "internal_error", message: (e as Error).message },
      { status: 500 },
    );
  }
}
