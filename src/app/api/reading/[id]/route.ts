/**
 * GET /api/reading/[id] — returns status + metadata (no reading body unless authenticated).
 * Used by the processing page to poll progress.
 */
import { NextRequest, NextResponse } from "next/server";
import { adminClient } from "@/lib/supabase/admin";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const supabase = adminClient();
  const { data, error } = await supabase
    .from("readings")
    .select(
      "id, status, full_name, email, languages, created_at, updated_at, pdf_paths",
    )
    .eq("id", params.id)
    .single();
  if (error || !data) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  return NextResponse.json(data);
}
