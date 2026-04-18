/**
 * POST /api/staff-check
 * Body: { email }
 * Returns { allowed: boolean } — is this email on the admin_emails roster?
 * Checked BEFORE sending an OTP so non-staff never receive one.
 */
import { NextRequest, NextResponse } from "next/server";
import { adminClient } from "@/lib/supabase/admin";

export async function POST(req: NextRequest) {
  const { email } = await req.json();
  if (!email || typeof email !== "string") {
    return NextResponse.json({ allowed: false });
  }
  const supa = adminClient();
  const { data } = await supa
    .from("admin_emails")
    .select("email")
    .ilike("email", email.trim())
    .maybeSingle();
  return NextResponse.json({ allowed: !!data });
}
