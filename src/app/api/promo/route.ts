/**
 * GET /api/promo[?email=]
 * Returns:
 *   - active:      boolean, is the promo currently running
 *   - cap:         total free slots
 *   - claimed:     how many claimed
 *   - remaining:   free slots left
 *   - eligible:    if email provided, whether THIS email can still claim
 */
import { NextRequest, NextResponse } from "next/server";
import { adminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const email = req.nextUrl.searchParams.get("email")?.toLowerCase().trim();
  const supa = adminClient();

  const { data: cfg } = await supa
    .from("promo_config")
    .select("free_cap, free_claimed, is_active")
    .eq("id", 1)
    .single();

  const cap = cfg?.free_cap ?? 1000;
  const claimed = cfg?.free_claimed ?? 0;
  const active = cfg?.is_active ?? false;
  const remaining = Math.max(cap - claimed, 0);

  let eligible = active && remaining > 0;
  let alreadyClaimed = false;
  if (email) {
    const { data: prior } = await supa
      .from("promo_claims")
      .select("email")
      .eq("email", email)
      .maybeSingle();
    if (prior) {
      alreadyClaimed = true;
      eligible = false;
    }
  }

  return NextResponse.json({
    active, cap, claimed, remaining, eligible, alreadyClaimed,
  });
}
