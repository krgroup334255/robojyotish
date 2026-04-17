/**
 * POST /api/process — runs the post-payment pipeline.
 * Body: { readingId: string }
 * Steps: compute chart → generate readings per language → save to DB.
 * Back-office review then uploads/publishes PDFs via /api/backoffice/release.
 *
 * This route is called from the client processing page. It streams SSE-like
 * status via a JSON array but for simplicity we return step-by-step via a
 * server action on poll. The client polls GET /api/reading/[id] for status.
 */
import { NextRequest, NextResponse } from "next/server";
import { adminClient } from "@/lib/supabase/admin";
import { computeChart } from "@/lib/jyotish/chart";
import { generateReading } from "@/lib/claude/reading";

const LANG_MAP: Record<string, string> = {
  en: "English",
  ta: "Tamil",
  ms: "Bahasa Malaysia",
};

export const runtime = "nodejs";
export const maxDuration = 300; // 5 min

export async function POST(req: NextRequest) {
  const { readingId } = await req.json();
  if (!readingId) return NextResponse.json({ error: "missing_id" }, { status: 400 });

  const supabase = adminClient();
  const { data: r, error } = await supabase
    .from("readings")
    .select("*")
    .eq("id", readingId)
    .single();
  if (error || !r) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  if (r.status !== "paid") {
    return NextResponse.json(
      { error: "not_paid", status: r.status },
      { status: 400 },
    );
  }

  // 1. Mark computing
  await supabase
    .from("readings")
    .update({ status: "computing_chart" })
    .eq("id", readingId);

  // 2. Compute chart
  let chart;
  try {
    chart = computeChart({
      date: r.birth_date,
      time: r.birth_time.slice(0, 5),
      lat: r.birth_place_lat,
      lng: r.birth_place_lng,
      timezone: r.birth_place_timezone,
    });
  } catch (e) {
    await supabase
      .from("readings")
      .update({
        status: "failed",
        admin_notes: `Chart compute failed: ${(e as Error).message}`,
      })
      .eq("id", readingId);
    return NextResponse.json({ error: "chart_failed" }, { status: 500 });
  }
  await supabase
    .from("readings")
    .update({ chart_data: chart, status: "generating" })
    .eq("id", readingId);

  // 3. Generate readings per language (sequentially, to keep rate-limit simple).
  const languages: string[] = r.languages;
  const readings: Record<string, string> = {};
  for (const code of languages) {
    const label = LANG_MAP[code] ?? code;
    try {
      readings[code] = await generateReading({
        chart,
        fullName: r.full_name,
        birthPlaceName: r.birth_place_name,
        currentLocation: r.current_location ?? undefined,
        lifeEvents: r.life_events ?? [],
        lifeEventsNotes: r.life_events_notes ?? undefined,
        language: label,
      });
    } catch (e) {
      readings[code] = `[Generation failed: ${(e as Error).message}]`;
    }
  }

  // 4. Store AI text, mark pending_review.
  await supabase
    .from("readings")
    .update({
      readings,
      status: "pending_review",
    })
    .eq("id", readingId);

  return NextResponse.json({ ok: true, status: "pending_review" });
}
