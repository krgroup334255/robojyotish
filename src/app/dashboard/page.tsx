import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { adminClient } from "@/lib/supabase/admin";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Clock, CheckCircle2, Shield } from "lucide-react";

const LANG_LABEL: Record<string, string> = {
  en: "English", ta: "தமிழ்", ms: "Bahasa Malaysia",
};

export const dynamic = "force-dynamic";

const DOWNLOAD_ERRORS: Record<string, string> = {
  missing_params: "The download link was malformed. Try again from your list.",
  reading_not_found: "That reading could not be found.",
  forbidden: "You're signed in with a different email than the one on this order. Please sign in with the email you used to order.",
  not_ready: "This reading isn't ready for download yet. Our team is still reviewing it.",
  no_pdf: "The PDF file is missing. Please email support@robojyotish.com — we'll regenerate it.",
  sign_failed: "We couldn't generate the download link. Try again in a moment.",
  internal_error: "Something went wrong while preparing the download. Please contact support@robojyotish.com.",
};

export default async function Dashboard({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  const supa = createClient();
  const { data: { user } } = await supa.auth.getUser();
  if (!user) redirect("/login?next=/dashboard");

  // Find readings via email (case-insensitive) — Supabase sometimes stores
  // the signup email with different casing than what the user typed.
  const admin = adminClient();
  const userEmail = (user.email ?? "").toLowerCase().trim();
  const { data: readings } = await admin
    .from("readings")
    .select("id, full_name, status, languages, pdf_paths, created_at, birth_date, birth_place_name")
    .ilike("email", userEmail)
    .order("created_at", { ascending: false });

  const downloadError = searchParams.error
    ? DOWNLOAD_ERRORS[searchParams.error] ?? `Download error: ${searchParams.error}`
    : null;

  // Check if this user is an admin to show back-office shortcut
  const { data: profile } = await admin
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .maybeSingle();
  const isAdmin = !!profile?.is_admin;

  return (
    <main className="container py-10">
      {downloadError && (
        <div className="mb-6 rounded-2xl border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-200">
          {downloadError}
        </div>
      )}
      <header className="mb-8 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-serif text-4xl mb-1">My readings</h1>
          <p className="text-white/60 text-sm">Signed in as {user.email}</p>
        </div>
        {isAdmin && (
          <Link href="/backoffice">
            <Button variant="cosmic" size="sm">
              <Shield className="w-4 h-4 mr-2" />
              Open back-office
            </Button>
          </Link>
        )}
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

                {r.status === "released" && (
                  <div className="mt-4">
                    {Object.keys(r.pdf_paths ?? {}).length > 0 ? (
                      <div className="flex flex-wrap gap-2">
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
                    ) : (
                      <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-xs text-amber-200">
                        Your reading was marked ready but the PDF files are
                        missing — this is usually a temporary issue. Please
                        email{" "}
                        <a
                          href="mailto:support@robojyotish.com"
                          className="text-saffron-500 hover:underline"
                        >
                          support@robojyotish.com
                        </a>{" "}
                        with your order ID{" "}
                        <span className="font-mono">{r.id.slice(0, 8)}</span>{" "}
                        and we&apos;ll regenerate it for you.
                      </div>
                    )}
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
