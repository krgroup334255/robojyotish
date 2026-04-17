import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { adminClient } from "@/lib/supabase/admin";
import { BackofficeReviewEditor } from "@/components/backoffice/BackofficeReviewEditor";

export const dynamic = "force-dynamic";

export default async function BackofficeReadingPage({ params }: { params: { id: string } }) {
  const supa = createClient();
  const { data: { user } } = await supa.auth.getUser();
  if (!user) redirect(`/login?next=/backoffice/${params.id}`);

  const admin = adminClient();
  const { data: profile } = await admin
    .from("profiles").select("is_admin").eq("id", user.id).single();
  if (!profile?.is_admin) redirect("/backoffice");

  const { data: reading } = await admin
    .from("readings").select("*").eq("id", params.id).single();
  if (!reading) return notFound();

  return (
    <main className="container py-8">
      <BackofficeReviewEditor reading={reading} />
    </main>
  );
}
