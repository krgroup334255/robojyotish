import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { adminClient } from "@/lib/supabase/admin";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Clock, CheckCircle2 } from "lucide-react";

const LANG_LABEL: Record<string, string> = {
  en: "English", ta: "தமிழ்", ms: "Bahasa Malaysia",
};

export const dynamic = "force-dynamic";

export default async function Dashboard() {
  const supa = createClient();
  const { data: { user } } = await supa.auth.getUser();
  if (!user) redirect("/login?next=/dashboard");

  // Find readings via email (anonymous orders) OR user_id
  const admin = adminClient();
  const { data: readings } = await admin
    .from("readings")
    .select("id, full_name, status, languages, pdf_paths, created_at, birth_date, birth_place_name")
    .eq("email", user.email!)
    .order("created_at", { ascending: false });

  return (
    <main className="container py-10">
      <header className="mb-8">
        <h1 className="font-serif text-4xl mb-1">My readings</h1>
        <p className="text-white/60 text-sm">Signed in as {user.email}</p>
      </header>

      {(!readings || readings.length === 0) ? (
        <Card>
          <CardContent className="p-10 text-center">
            <p className="text-white/60 mb-4">You have no readings yet.</p>
            <Link href="/reading">
              <Button>Get my first reading</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {readings.map((r) => (
            <Card key={r.id}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="font-serif text-xl">{r.full_name}</h3>
                    <p className="text-sm text-white/60">
                      Born {r.birth_date} · {r.birth_place_name}
                    </p>
                    <p className="text-xs text-white/40 mt-1">
                      Ordered {new Date(r.created_at).toLocaleDateString("en-MY")}
                    </p>
                  </div>
                  <div>
                    {r.status === "released" ? (
                      <span className="inline-flex items-center gap-1.5 text-green-400 text-sm">
                        <CheckCircle2 className="w-4 h-4" /> Ready
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-saffron-500 text-sm">
                        <Clock className="w-4 h-4" /> {r.status}
                      </span>
                    )}
                  </div>
                </div>

                {r.status === "released" && r.pdf_paths && (
                  <div className="flex flex-wrap gap-2 mt-4">
                    {Object.entries(r.pdf_paths).map(([code]) => (
                      <form key={code} action="/api/download" method="POST">
                        <input type="hidden" name="readingId" value={r.id} />
                        <input type="hidden" name="language" value={code} />
                        <Button type="submit" size="sm" variant="secondary">
                          <Download className="w-4 h-4 mr-2" />
                          Download {LANG_LABEL[code] ?? code}
                        </Button>
                      </form>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </main>
  );
}
