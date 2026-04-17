import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ReadingForm } from "@/components/forms/ReadingForm";
import { Bot, Sparkles } from "lucide-react";
import { SITE_NAME, PRICE_MYR } from "@/lib/utils";
import { createClient } from "@/lib/supabase/server";
import { adminClient } from "@/lib/supabase/admin";

export const metadata: Metadata = {
  title: "Get your AI Jyotish Reading — Free during launch",
  description:
    "Fill in your birth details and receive an accurate Vedic astrology reading in PDF — English, Tamil, or Bahasa Malaysia. Powered by Claude AI + Swiss Ephemeris.",
  alternates: { canonical: "/reading" },
};

export const dynamic = "force-dynamic";

export default async function ReadingIntakePage() {
  const supa = createClient();
  const {
    data: { user },
  } = await supa.auth.getUser();
  if (!user) redirect("/login?next=/reading");

  // Check promo eligibility for this email
  const admin = adminClient();
  const email = user.email!.toLowerCase().trim();
  const { data: cfg } = await admin
    .from("promo_config")
    .select("free_cap, free_claimed, is_active")
    .eq("id", 1)
    .maybeSingle();
  const { data: prior } = await admin
    .from("promo_claims")
    .select("email")
    .eq("email", email)
    .maybeSingle();

  const remaining = Math.max(
    (cfg?.free_cap ?? 1000) - (cfg?.free_claimed ?? 0),
    0,
  );
  const eligibleForFree =
    !!cfg?.is_active && !prior && remaining > 0;

  return (
    <main className="relative z-10">
      <header className="container flex items-center justify-between py-6">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-saffron-500 to-cosmic-700 flex items-center justify-center">
            <Bot className="w-6 h-6 text-white" />
          </div>
          <span className="font-serif text-2xl font-bold text-gradient-saffron">
            {SITE_NAME}
          </span>
        </Link>
        <div className="text-sm text-white/60">{user.email}</div>
      </header>

      <section className="container max-w-3xl py-10">
        {eligibleForFree ? (
          <div className="mb-8 rounded-2xl border border-saffron-500/40 bg-gradient-to-r from-saffron-500/20 to-cosmic-700/20 p-5 text-center">
            <div className="inline-flex items-center gap-2 text-saffron-500 font-semibold mb-1">
              <Sparkles className="w-4 h-4" />
              Launch special — your reading is FREE
            </div>
            <p className="text-sm text-white/70">
              You&apos;re one of our first <strong>1,000 users</strong>.
              Your reading is on the house (RM19.90 waived).{" "}
              <strong className="text-saffron-500">{remaining}</strong> free
              slots remaining.
            </p>
          </div>
        ) : prior ? (
          <div className="mb-8 rounded-2xl border border-cosmic-500/40 bg-cosmic-700/20 p-5 text-center text-sm text-white/70">
            You&apos;ve already claimed your free launch reading on{" "}
            <strong>{email}</strong>. Additional readings are RM{PRICE_MYR.toFixed(2)}.
          </div>
        ) : null}

        <h1 className="font-serif text-4xl md:text-5xl font-bold mb-3 text-center">
          Tell us about yourself
        </h1>
        <p className="text-center text-white/60 mb-10">
          Your details are used only to generate and deliver your reading.
        </p>
        <ReadingForm defaultEmail={email} isFree={eligibleForFree} />
      </section>
    </main>
  );
}
