/**
 * POST /api/process — runs the post-payment pipeline.
 *
 * Body: { readingId: string; language?: string; finalize?: boolean }
 *
 * When `language` is provided, only that one language is generated.
 * This allows the client to call once per language so each call gets
 * its own full 300 s Vercel timeout budget — preventing mid-sentence
 * truncation caused by multi-language sequential generation in one call.
 *
 * When `finalize` is true (sent after the last language), the reading
 * is moved to "pending_review".
 *
 * Legacy call (no language / no finalize) still works: generates ALL
 * languages and finalises in one shot (used by back-office regenerate).
 */
import { NextRequest, NextResponse } from "next/server";
import { adminClient } from "@/lib/supabase/admin";
import { computeChart } from "@/lib/jyotish/chart";
import { generateReading, ageFromBirthDate } from "@/lib/claude/reading";

const LANG_MAP: Record<string, string> = {
  en: "English",
  ta: "Tamil",
  ms: "Bahasa Malaysia",
};

export const runtime = "nodejs";
export const maxDuration = 300; // 5 min — one language per call fits comfortably

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { readingId, language: requestedLangCode, finalize } = body as {
    readingId?: string;
    language?: string;
    finalize?: boolean;
  };

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

  // Allow retries from back-office: accept paid / computing_chart / generating / failed
  const resumableStatuses = ["paid", "computing_chart", "generating", "failed"];
  if (!resumableStatuses.includes(r.status)) {
    return NextResponse.json(
      { error: "not_paid", status: r.status },
      { status: 400 },
    );
  }

  // ── 1. Compute chart (reuse if already present) ───────────────
  let chart = r.chart_data;
  if (!chart) {
    await supabase
      .from("readings")
      .update({ status: "computing_chart" })
      .eq("id", readingId);
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
  } else if (r.status !== "generating") {
    await supabase
      .from("readings")
      .update({ status: "generating" })
      .eq("id", readingId);
  }

  // ── 2. Determine which languages to generate this call ────────
  const allLanguages: string[] = r.languages;
  const readings: Record<string, string> = { ...(r.readings ?? {}) };

  // If a specific language code was requested, process only that one.
  // Otherwise (legacy/backoffice call) process all.
  const languagesToProcess = requestedLangCode
    ? allLanguages.filter((c) => c === requestedLangCode)
    : allLanguages;

  for (const code of languagesToProcess) {
    // Skip if already generated (idempotent)
    if (readings[code] && readings[code].length > 100) continue;

    const label = LANG_MAP[code] ?? code;
    try {
      const text = await generateReading({
        chart,
        fullName: r.full_name,
        birthPlaceName: r.birth_place_name,
        currentLocation: r.current_location ?? undefined,
        lifeEvents: r.life_events ?? [],
        lifeEventsNotes: r.life_events_notes ?? undefined,
        language: label,
        ageYears: ageFromBirthDate(r.birth_date),
      });
      readings[code] = text;
    } catch (e) {
      readings[code] = `[Generation failed: ${(e as Error).message}]`;
    }

    // Incremental save after each language
    await supabase
      .from("readings")
      .update({ readings })
      .eq("id", readingId);
  }

  // ── 3. Finalize when all languages are done ───────────────────
  // In per-language mode the client sends finalize=true on the last call.
  // In legacy (all-at-once) mode we always finalize here.
  const shouldFinalize = finalize === true || !requestedLangCode;
  if (shouldFinalize) {
    await supabase
      .from("readings")
      .update({ status: "pending_review" })
      .eq("id", readingId);
    return NextResponse.json({ ok: true, status: "pending_review" });
  }

  return NextResponse.json({ ok: true, status: "generating" });
}
