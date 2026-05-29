import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ReadingForm } from "@/components/forms/ReadingForm";
import { Bot } from "lucide-react";
import { SITE_NAME } from "@/lib/utils";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Get your AI Jyotish Reading",
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

  const email = user.email!.toLowerCase().trim();

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
        <h1 className="font-serif text-4xl md:text-5xl font-bold mb-3 text-center">
          Tell us about yourself
        </h1>
        <p className="text-center text-white/60 mb-10">
          Your details are used only to generate and deliver your reading.
        </p>
        <ReadingForm defaultEmail={email} />
      </section>
    </main>
  );
}
