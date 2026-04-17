import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { adminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Inbox, CheckCircle2, AlertCircle, Clock } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminHome() {
  const supa = createClient();
  const { data: { user } } = await supa.auth.getUser();
  if (!user) redirect("/login?next=/admin");

  const admin = adminClient();
  const { data: profile } = await admin
    .from("profiles").select("is_admin, email").eq("id", user.id).single();
  if (!profile?.is_admin) {
    return (
      <main className="container py-20 text-center">
        <h1 className="text-2xl font-serif mb-2">Forbidden</h1>
        <p className="text-white/60">Your account is not an admin.</p>
      </main>
    );
  }

  const { data: readings } = await admin
    .from("readings")
    .select("id, full_name, email, status, languages, created_at, updated_at")
    .order("created_at", { ascending: false })
    .limit(100);

  const groups = {
    pending_review: readings?.filter((r) => r.status === "pending_review") ?? [],
    in_progress: readings?.filter((r) => ["paid", "computing_chart", "generating"].includes(r.status)) ?? [],
    released: readings?.filter((r) => r.status === "released") ?? [],
    failed: readings?.filter((r) => ["failed", "rejected"].includes(r.status)) ?? [],
  };

  return (
    <main className="container py-10">
      <header className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-serif text-4xl">Admin back-office</h1>
          <p className="text-white/50 text-sm">Signed in as {profile.email}</p>
        </div>
      </header>

      <div className="grid md:grid-cols-4 gap-4 mb-10">
        <Stat label="Awaiting review" count={groups.pending_review.length} icon={<Inbox />} color="saffron" />
        <Stat label="In progress" count={groups.in_progress.length} icon={<Clock />} color="cosmic" />
        <Stat label="Released" count={groups.released.length} icon={<CheckCircle2 />} color="green" />
        <Stat label="Failed / rejected" count={groups.failed.length} icon={<AlertCircle />} color="red" />
      </div>

      <Section title="Awaiting review" rows={groups.pending_review} />
      <Section title="In progress" rows={groups.in_progress} />
      <Section title="Released" rows={groups.released} muted />
      <Section title="Failed / rejected" rows={groups.failed} muted />
    </main>
  );
}

function Stat({ label, count, icon, color }: { label: string; count: number; icon: React.ReactNode; color: string }) {
  const colorClass = {
    saffron: "text-saffron-500",
    cosmic: "text-cosmic-500",
    green: "text-green-400",
    red: "text-red-400",
  }[color];
  return (
    <Card>
      <CardContent className="p-5 flex items-center gap-4">
        <div className={`w-10 h-10 rounded-full bg-white/10 flex items-center justify-center ${colorClass}`}>
          {icon}
        </div>
        <div>
          <div className="text-2xl font-bold">{count}</div>
          <div className="text-xs text-white/50">{label}</div>
        </div>
      </CardContent>
    </Card>
  );
}

function Section({
  title, rows, muted,
}: {
  title: string;
  rows: { id: string; full_name: string; email: string; status: string; languages: string[]; created_at: string }[];
  muted?: boolean;
}) {
  if (rows.length === 0) return null;
  return (
    <section className="mb-10">
      <h2 className={`font-serif text-xl mb-3 ${muted ? "text-white/40" : ""}`}>{title}</h2>
      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 text-left text-xs text-white/50 uppercase">
                <th className="p-4">Name</th>
                <th className="p-4">Email</th>
                <th className="p-4">Langs</th>
                <th className="p-4">Created</th>
                <th className="p-4">Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-white/5 hover:bg-white/5">
                  <td className="p-4 font-medium">{r.full_name}</td>
                  <td className="p-4 text-white/70">{r.email}</td>
                  <td className="p-4 text-white/70">{r.languages.join(", ")}</td>
                  <td className="p-4 text-white/70">
                    {new Date(r.created_at).toLocaleString("en-MY")}
                  </td>
                  <td className="p-4">
                    <span className="inline-block px-2 py-0.5 rounded-full bg-white/10 text-xs">
                      {r.status}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <Link href={`/admin/${r.id}`} className="text-saffron-500 hover:underline">
                      review →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </section>
  );
}
