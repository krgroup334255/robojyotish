/**
 * POST /api/reading
 * Creates a reading row in "pending_payment" status, returns its id.
 * No auth required here; the row is anonymous until paid + OTP verified.
 */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { adminClient } from "@/lib/supabase/admin";

const schema = z.object({
  email: z.string().email(),
  fullName: z.string().min(2).max(120),
  birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  birthTime: z.string().regex(/^\d{2}:\d{2}$/),
  birthPlaceName: z.string().min(2),
  birthPlaceLat: z.number(),
  birthPlaceLng: z.number(),
  birthPlaceTimezone: z.string().min(3),
  currentLocation: z.string().optional(),
  lifeEvents: z.array(z.string()).default([]),
  lifeEventsNotes: z.string().optional(),
  languages: z.array(z.string()).min(1),
});

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "validation", details: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const d = parsed.data;
  const supabase = adminClient();
  const { data, error } = await supabase
    .from("readings")
    .insert({
      email: d.email,
      full_name: d.fullName,
      birth_date: d.birthDate,
      birth_time: d.birthTime,
      birth_place_name: d.birthPlaceName,
      birth_place_lat: d.birthPlaceLat,
      birth_place_lng: d.birthPlaceLng,
      birth_place_timezone: d.birthPlaceTimezone,
      current_location: d.currentLocation,
      life_events: d.lifeEvents,
      life_events_notes: d.lifeEventsNotes,
      languages: d.languages,
      status: "pending_payment",
      amount_cents: Number(process.env.STRIPE_PRICE_MYR_CENTS ?? 1990),
      currency: "myr",
    })
    .select("id")
    .single();

  if (error) {
    return NextResponse.json({ error: "db_insert", message: error.message }, { status: 500 });
  }
  return NextResponse.json({ id: data.id });
}
