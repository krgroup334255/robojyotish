/**
 * POST /api/checkout
 * Body: { readingId: string }
 *
 * Pricing is currently disabled — all readings are free.
 * Simply marks the reading as paid and redirects to processing.
 */
import { NextRequest, NextResponse } from "next/server";
import { adminClient } from "@/lib/supabase/admin";
import { SITE_URL } from "@/lib/utils";

export async function POST(req: NextRequest) {
  const { readingId } = await req.json();
  if (!readingId) {
    return NextResponse.json({ error: "missing_id" }, { status: 400 });
  }

  const supabase = adminClient();
  const { data: reading } = await supabase
    .from("readings")
    .select("id, status")
    .eq("id", readingId)
    .single();
  if (!reading) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  // Mark as paid immediately — no payment required
  await supabase
    .from("readings")
    .update({ status: "paid", amount_cents: 0 })
    .eq("id", readingId);

  return NextResponse.json({
    url: `${SITE_URL}/reading/${readingId}/processing`,
  });
}
