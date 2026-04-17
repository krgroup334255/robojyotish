import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { adminClient } from "@/lib/supabase/admin";
import { AdminReviewEditor } from "@/components/admin/AdminReviewEditor";

export const dynamic = "force-dynamic";

export default async function AdminReadingPage({ params }: { params: { id: string } }) {
  const supa = createClient();
  const { data: { user } } = await supa.auth.getUser();
  if (!user) redirect(`/login?next=/admin/${params.id}`);

  const admin = adminClient();
  const { data: profile } = await admin
    .from("profiles").select("is_admin").eq("id", user.id).single();
  if (!profile?.is_admin) redirect("/admin");

  const { data: reading } = await admin
    .from("readings").select("*").eq("id", params.id).single();
  if (!reading) return notFound();

  return (
    <main className="container py-8">
      <AdminReviewEditor reading={reading} />
    </main>
  );
}
