import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Bot, Sparkles, Star, Clock, ShieldCheck, CheckCircle2 } from "lucide-react";
import { PRICE_MYR, SITE_NAME } from "@/lib/utils";
import { LaunchBanner } from "@/components/landing/LaunchBanner";
import { PromoCounter } from "@/components/landing/PromoCounter";

export const metadata: Metadata = {
  title: "AI ஜோதிட பலன் — RoboJyotish",
  description:
    "துல்லியமான ஹிந்து வேத ஜோதிட பலன் AI மூலம். PDF வடிவில் தமிழில் பெறலாம். RM19.90 முதல். மலேசியா, சிங்கப்பூர் & இந்தியாவிற்கு.",
  alternates: { canonical: "/ta", languages: { "en-MY": "/", "ms-MY": "/ms" } },
};

export default function HomeTamil() {
  return (
    <main className="relative z-10 font-tamil">
      <LaunchBanner />
      <header className="container flex items-center justify-between py-6">
        <Link href="/ta" className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-saffron-500 to-cosmic-700 flex items-center justify-center animate-pulse-glow">
            <Bot className="w-6 h-6 text-white" />
          </div>
          <span className="font-serif text-2xl font-bold text-gradient-saffron">
            {SITE_NAME}
          </span>
        </Link>
        <nav className="flex gap-4 text-sm">
          <Link href="/" className="text-white/70 hover:text-saffron-500">English</Link>
          <Link href="/ms" className="text-white/70 hover:text-saffron-500">Bahasa</Link>
          <Link href="/reading"><Button size="sm">பலன் பெற</Button></Link>
        </nav>
      </header>

      <section className="container pt-12 pb-20 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-saffron-500/40 bg-saffron-500/10 px-4 py-1.5 text-xs font-medium text-saffron-500 mb-6">
          <Sparkles className="w-3.5 h-3.5" />
          AI வேத ஜோதிடம் · மலேசியா, சிங்கப்பூர் & இந்தியா
        </div>
        <h1 className="font-serif text-5xl md:text-7xl font-bold leading-[1.1] mb-6">
          உங்கள் வாழ்வின் திட்டம்,
          <br />
          <span className="text-gradient-saffron">AI ஜோதிடர் சொல்கிறார்</span>
        </h1>
        <p className="max-w-2xl mx-auto text-lg text-white/70 mb-6">
          சுவிஸ் எபிமெரிஸ் மற்றும் Claude AI-ஐ பயன்படுத்தி துல்லியமான ஹிந்து ஜோதிட பலன் —
          தமிழில் அழகான PDF-ஆக.
        </p>
        <p className="text-2xl font-serif mb-8">
          <span className="line-through text-white/40 mr-2">
            RM{PRICE_MYR.toFixed(2)}
          </span>
          <span className="text-gradient-saffron font-bold">இலவசம்</span>
          <span className="text-white/70 text-base ml-2">
            · முதல் 1,000 பயனர்களுக்கு
          </span>
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/reading">
            <Button size="lg">
              <Sparkles className="w-5 h-5 mr-2" />
              இலவச ஜோதிட பலன் பெற
            </Button>
          </Link>
        </div>
        <div className="mt-6 flex justify-center">
          <PromoCounter />
        </div>
        <div className="mt-10 flex items-center justify-center gap-8 text-sm text-white/60">
          <div className="flex items-center gap-1.5"><Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />4.8 / 5</div>
          <div className="flex items-center gap-1.5"><Clock className="w-4 h-4" />10 நிமிடத்திற்குள்</div>
          <div className="flex items-center gap-1.5"><ShieldCheck className="w-4 h-4" />2FA பாதுகாப்பு</div>
        </div>
      </section>

      <section className="container py-20">
        <h2 className="font-serif text-4xl font-bold text-center mb-10">
          என்ன கிடைக்கும்?
        </h2>
        <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
          {[
            "15-20 பக்க PDF பலன் (தமிழில்)",
            "D1 ராசி & D9 நவாம்ச பகுப்பாய்வு",
            "தற்போதைய மகாதசை & அந்தர்தசை",
            "தொழில், திருமணம், செல்வம், உடல்நலம்",
            "பரிகாரங்கள் & மணிக்கல் பரிந்துரைகள்",
            "English + Tamil இரண்டிலும் பெறலாம்",
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
              தயாரா? AI ஜோதிடர் உங்களுக்காக காத்திருக்கிறார்.
            </h2>
            <Link href="/reading">
              <Button size="lg">
                <Sparkles className="w-5 h-5 mr-2" />
                இலவச பலன் பெற
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
