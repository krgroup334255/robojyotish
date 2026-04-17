import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { adminClient } from "@/lib/supabase/admin";

export async function POST(req: NextRequest) {
  const supaUser = createClient();
  const { data: { user } } = await supaUser.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const admin = adminClient();
  const { data: profile } = await admin
    .from("profiles").select("is_admin").eq("id", user.id).single();
  if (!profile?.is_admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { readingId, notes } = await req.json();
  await admin.from("readings")
    .update({
      status: "rejected",
      admin_notes: notes ?? "",
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", readingId);
  return NextResponse.json({ ok: true });
}
