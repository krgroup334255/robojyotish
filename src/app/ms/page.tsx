import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Bot, Sparkles, Star, Clock, ShieldCheck, CheckCircle2 } from "lucide-react";
import { PRICE_MYR, SITE_NAME } from "@/lib/utils";
import { LaunchBanner } from "@/components/landing/LaunchBanner";
import { PromoCounter } from "@/components/landing/PromoCounter";

export const metadata: Metadata = {
  title: "Bacaan AI Jyotish — Astrologi Veda Hindu dari RM19.90 | RoboJyotish",
  description:
    "Bacaan Jyotish Hindu yang tepat dikuasakan AI. Dihantar sebagai PDF dalam Bahasa Malaysia, Tamil, atau Bahasa Inggeris. Untuk pelanggan Malaysia, Singapura & India.",
  alternates: { canonical: "/ms", languages: { "en-MY": "/", "ta-IN": "/ta" } },
};

export default function HomeMalay() {
  return (
    <main className="relative z-10">
      <LaunchBanner />
      <header className="container flex items-center justify-between py-6">
        <Link href="/ms" className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-saffron-500 to-cosmic-700 flex items-center justify-center animate-pulse-glow">
            <Bot className="w-6 h-6 text-white" />
          </div>
          <span className="font-serif text-2xl font-bold text-gradient-saffron">
            {SITE_NAME}
          </span>
        </Link>
        <nav className="flex gap-4 text-sm">
          <Link href="/" className="text-white/70 hover:text-saffron-500">English</Link>
          <Link href="/ta" className="text-white/70 hover:text-saffron-500">தமிழ்</Link>
          <Link href="/reading"><Button size="sm">Dapatkan bacaan</Button></Link>
        </nav>
      </header>

      <section className="container pt-12 pb-20 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-saffron-500/40 bg-saffron-500/10 px-4 py-1.5 text-xs font-medium text-saffron-500 mb-6">
          <Sparkles className="w-3.5 h-3.5" />
          Astrologi Veda berkuasa AI · Malaysia, Singapura & India
        </div>
        <h1 className="font-serif text-5xl md:text-7xl font-bold leading-[1.05] mb-6 text-balance">
          Pelan Hidup Anda,
          <br />
          <span className="text-gradient-saffron">Dinyahkod oleh AI Jyotish</span>
        </h1>
        <p className="max-w-2xl mx-auto text-lg text-white/70 mb-6 text-balance">
          Bacaan Jyotish Hindu yang tepat dikuasakan Swiss Ephemeris dan AI
          Claude. PDF dalam <strong>Bahasa Malaysia, Tamil, atau Inggeris</strong>.
        </p>
        <p className="text-2xl font-serif mb-8">
          <span className="line-through text-white/40 mr-2">
            RM{PRICE_MYR.toFixed(2)}
          </span>
          <span className="text-gradient-saffron font-bold">PERCUMA</span>
          <span className="text-white/70 text-base ml-2">
            · 1,000 pengguna terawal
          </span>
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/reading">
            <Button size="lg">
              <Sparkles className="w-5 h-5 mr-2" />
              Tuntut bacaan PERCUMA
            </Button>
          </Link>
        </div>
        <div className="mt-6 flex justify-center">
          <PromoCounter />
        </div>
        <div className="mt-10 flex items-center justify-center gap-8 text-sm text-white/60">
          <div className="flex items-center gap-1.5"><Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />4.8 / 5</div>
          <div className="flex items-center gap-1.5"><Clock className="w-4 h-4" />Di bawah 10 minit</div>
          <div className="flex items-center gap-1.5"><ShieldCheck className="w-4 h-4" />Dijamin 2FA</div>
        </div>
      </section>

      <section className="container py-20">
        <h2 className="font-serif text-4xl font-bold text-center mb-10">
          Apa yang anda terima?
        </h2>
        <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
          {[
            "PDF 15-20 halaman peribadi",
            "Analisis Carta D1 Rasi + Navamsa D9",
            "Mahadasha & Antardasha semasa",
            "Panduan kerjaya, perkahwinan, kekayaan, kesihatan",
            "Cadangan petua & batu permata",
            "Dalam bahasa pilihan anda",
          ].map((b, i) => (
            <Card key={i}>
              <CardContent className="p-5 flex gap-3">
                <CheckCircle2 className="w-6 h-6 text-saffron-500 flex-shrink-0 mt-0.5" />
                <span>{b}</span>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="container py-20 text-center">
        <Card className="bg-gradient-to-br from-saffron-500/20 via-cosmic-700/20 to-cosmic-950/20 border-saffron-500/30">
          <CardContent className="p-12">
            <h2 className="font-serif text-4xl font-bold mb-4">
              Sedia berjumpa dengan Jyotishi AI anda?
            </h2>
            <Link href="/reading">
              <Button size="lg">
                <Sparkles className="w-5 h-5 mr-2" />
                Tuntut bacaan PERCUMA
              </Button>
            </Link>
          </CardContent>
        </Card>
      </section>

      <footer className="border-t border-white/10 mt-12 container py-8 text-sm text-white/50 text-center">
        © {new Date().getFullYear()} {SITE_NAME} · robojyotish.com
      </footer>
    </main>
  );
}
