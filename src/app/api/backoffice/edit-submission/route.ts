/**
 * POST /api/backoffice/edit-submission
 * Admin-only route to correct customer birth details after submission.
 * Clears chart_data and readings so the pipeline re-runs cleanly.
 *
 * Body: {
 *   readingId: string;
 *   fullName?: string;
 *   birthDate?: string;       // YYYY-MM-DD
 *   birthTime?: string;       // HH:mm
 *   birthPlaceName?: string;
 *   birthPlaceLat?: number;
 *   birthPlaceLng?: number;
 *   birthPlaceTimezone?: string;
 *   currentLocation?: string;
 *   lifeEvents?: string[];
 *   lifeEventsNotes?: string;
 * }
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { adminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    // Auth: must be logged-in admin
    const supaUser = createClient();
    const {
      data: { user },
    } = await supaUser.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const admin = adminClient();
    const { data: profile } = await admin
      .from("profiles")
      .select("is_admin")
      .eq("id", user.id)
      .single();
    if (!profile?.is_admin) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { readingId, ...fields } = body as {
      readingId: string;
      fullName?: string;
      birthDate?: string;
      birthTime?: string;
      birthPlaceName?: string;
      birthPlaceLat?: number;
      birthPlaceLng?: number;
      birthPlaceTimezone?: string;
      currentLocation?: string;
      lifeEvents?: string[];
      lifeEventsNotes?: string;
    };

    if (!readingId) {
      return NextResponse.json({ error: "missing_params" }, { status: 400 });
    }

    // Build the update payload — only include fields that were sent
    const update: Record<string, unknown> = {
      // Always reset pipeline when submission data changes
      chart_data: null,
      readings: {},
      status: "paid", // allow /api/process to re-run
      updated_at: new Date().toISOString(),
    };

    if (fields.fullName !== undefined) update.full_name = fields.fullName.trim();
    if (fields.birthDate !== undefined) update.birth_date = fields.birthDate;
    if (fields.birthTime !== undefined) update.birth_time = fields.birthTime;
    if (fields.birthPlaceName !== undefined) update.birth_place_name = fields.birthPlaceName.trim();
    if (fields.birthPlaceLat !== undefined) update.birth_place_lat = fields.birthPlaceLat;
    if (fields.birthPlaceLng !== undefined) update.birth_place_lng = fields.birthPlaceLng;
    if (fields.birthPlaceTimezone !== undefined) update.birth_place_timezone = fields.birthPlaceTimezone;
    if (fields.currentLocation !== undefined) update.current_location = fields.currentLocation.trim() || null;
    if (fields.lifeEvents !== undefined) update.life_events = fields.lifeEvents;
    if (fields.lifeEventsNotes !== undefined) update.life_events_notes = fields.lifeEventsNotes.trim() || null;

    const { error } = await admin
      .from("readings")
      .update(update)
      .eq("id", readingId);

    if (error) {
      console.error("[edit-submission] DB error", error);
      return NextResponse.json(
        { error: "db_error", message: error.message },
        { status: 500 },
      );
    }

    // Log the edit in the audit table (best-effort — don't fail if missing)
    try {
      await admin.from("admin_audit").insert({
        reading_id: readingId,
        admin_id: user.id,
        action: "edit_submission",
        diff: JSON.stringify(fields),
      });
    } catch {
      // Non-critical — audit table may not exist in all environments
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[edit-submission] fatal", e);
    return NextResponse.json(
      { error: "internal_error", message: (e as Error).message },
      { status: 500 },
    );
  }
}
