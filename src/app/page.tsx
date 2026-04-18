import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Sparkles,
  Bot,
  FileText,
  ShieldCheck,
  Languages,
  Star,
  Clock,
  Zap,
  CheckCircle2,
  Globe,
} from "lucide-react";
import { PRICE_MYR, SITE_NAME } from "@/lib/utils";
import { LaunchBanner } from "@/components/landing/LaunchBanner";
import { PromoCounter } from "@/components/landing/PromoCounter";
import { ShareBar } from "@/components/landing/ShareBar";

export default function Home() {
  return (
    <main className="relative z-10">
      <LaunchBanner />
      {/* ─── HEADER ─── */}
      <header className="container flex items-center justify-between py-6">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-saffron-500 to-cosmic-700 flex items-center justify-center animate-pulse-glow">
            <Bot className="w-6 h-6 text-white" />
          </div>
          <span className="font-serif text-2xl font-bold text-gradient-saffron">
            {SITE_NAME}
          </span>
        </Link>
        <nav className="hidden md:flex items-center gap-8 text-sm text-white/80">
          <a href="#how-it-works" className="hover:text-saffron-500">How it works</a>
          <a href="#features" className="hover:text-saffron-500">Features</a>
          <a href="#pricing" className="hover:text-saffron-500">Pricing</a>
          <a href="#faq" className="hover:text-saffron-500">FAQ</a>
        </nav>
        <div className="flex items-center gap-3">
          <Link href="/login">
            <Button variant="ghost" size="sm">Login</Button>
          </Link>
          <Link href="/reading">
            <Button size="sm">Claim FREE reading</Button>
          </Link>
        </div>
      </header>

      {/* ─── HERO ─── */}
      <section className="container pt-12 pb-20 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-saffron-500/40 bg-saffron-500/10 px-4 py-1.5 text-xs font-medium text-saffron-500 mb-6">
          <Sparkles className="w-3.5 h-3.5" />
          AI-Powered Vedic Astrology · Launching in Malaysia, Singapore & India
        </div>
        <h1 className="font-serif text-5xl md:text-7xl font-bold leading-[1.05] mb-6 text-balance">
          Your Life&apos;s Blueprint,
          <br />
          <span className="text-gradient-saffron">Decoded by AI Jyotish</span>
        </h1>
        <p className="max-w-2xl mx-auto text-lg text-white/70 mb-6 text-balance">
          Accurate Hindu <strong>Jyotish reading</strong> powered by Swiss Ephemeris
          and Anthropic&apos;s Claude AI. Delivered as a beautiful PDF in{" "}
          <strong>English, Tamil, or Bahasa Malaysia</strong>.
        </p>
        <p className="max-w-2xl mx-auto text-2xl font-serif mb-8 text-balance">
          <span className="line-through text-white/40 mr-2">
            RM{PRICE_MYR.toFixed(2)}
          </span>
          <span className="text-gradient-saffron font-bold">FREE</span>
          <span className="text-white/70 text-base ml-2">
            during our launch — first 1,000 readings
          </span>
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/reading">
            <Button size="lg" className="w-full sm:w-auto text-base">
              <Sparkles className="w-5 h-5 mr-2" />
              Claim my FREE reading
            </Button>
          </Link>
          <a href="#how-it-works">
            <Button size="lg" variant="outline" className="w-full sm:w-auto">
              How it works
            </Button>
          </a>
        </div>
        <div className="mt-8 flex justify-center">
          <PromoCounter />
        </div>
        <div className="mt-10 flex items-center justify-center gap-8 text-sm text-white/60 flex-wrap">
          <div className="flex items-center gap-1.5"><Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />4.8 / 5</div>
          <div className="flex items-center gap-1.5"><Clock className="w-4 h-4" />Ready in 10 minutes</div>
          <div className="flex items-center gap-1.5"><ShieldCheck className="w-4 h-4" />2FA secured</div>
          <div className="flex items-center gap-1.5"><Globe className="w-4 h-4" />MY · SG · IN</div>
        </div>
      </section>

      {/* ─── FEATURES ─── */}
      <section id="features" className="container py-20">
        <h2 className="font-serif text-4xl md:text-5xl font-bold text-center mb-4">
          Why <span className="text-gradient-saffron">{SITE_NAME}</span>?
        </h2>
        <p className="text-center text-white/60 max-w-2xl mx-auto mb-12">
          Traditional Jyotish rigour meets modern AI. Astronomically accurate,
          beautifully written, and one of the most affordable readings available
          anywhere in the world.
        </p>
        <div className="grid md:grid-cols-3 gap-6">
          {[
            {
              icon: <Bot className="w-8 h-8 text-saffron-500" />,
              title: "AI Jyotish Reading",
              body: "Claude AI interprets your D1 Rasi chart, Navamsa, nakshatras & dashas for a reading that feels written for you — not a generic template.",
            },
            {
              icon: <Zap className="w-8 h-8 text-saffron-500" />,
              title: "Astronomically Accurate",
              body: "We use Swiss Ephemeris (the same library used by professional astrologers) for precise planetary positions, lagna, and dasha periods.",
            },
            {
              icon: <Languages className="w-8 h-8 text-saffron-500" />,
              title: "English + Tamil + Bahasa",
              body: "Reading delivered in any language(s) you choose. Every PDF is typeset beautifully in Noto Sans Tamil and Latin serif fonts.",
            },
            {
              icon: <FileText className="w-8 h-8 text-saffron-500" />,
              title: "Downloadable PDF",
              body: "A 15-20 page typeset PDF covering life path, career, marriage, wealth, health & current dasha — yours to keep forever.",
            },
            {
              icon: <ShieldCheck className="w-8 h-8 text-saffron-500" />,
              title: "2FA Secure Login",
              body: "Email OTP authentication via Supabase. Your birth data and reading are stored encrypted; nobody else can download your chart.",
            },
            {
              icon: <Globe className="w-8 h-8 text-saffron-500" />,
              title: "Made for SE Asia",
              body: "Built for Hindu-Indian communities in Malaysia, Singapore & India. FPX, GrabPay, Visa/Mastercard supported via Stripe.",
            },
          ].map((f, i) => (
            <Card key={i}>
              <CardContent className="p-8">
                <div className="mb-4">{f.icon}</div>
                <h3 className="font-serif text-xl font-semibold mb-2">{f.title}</h3>
                <p className="text-white/70 text-sm leading-relaxed">{f.body}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* ─── HOW IT WORKS ─── */}
      <section id="how-it-works" className="container py-20">
        <h2 className="font-serif text-4xl md:text-5xl font-bold text-center mb-12">
          From Birth Details to PDF in <span className="text-gradient-saffron">5 Steps</span>
        </h2>
        <div className="grid md:grid-cols-5 gap-4">
          {[
            { n: "1", t: "Share details", d: "Name, birth date/time, birth city & current life events." },
            { n: "2", t: "Pay RM19.90", d: "Secure Stripe checkout. FPX, GrabPay & cards accepted." },
            { n: "3", t: "Chart computed", d: "Swiss Ephemeris calculates planetary positions & dasha." },
            { n: "4", t: "AI generates", d: "Claude AI writes your personalised reading in your chosen language(s)." },
            { n: "5", t: "Download PDF", d: "After our astrologer reviews, login with email OTP to download." },
          ].map((s, i) => (
            <Card key={i}>
              <CardContent className="p-6 text-center">
                <div className="w-12 h-12 mx-auto rounded-full bg-gradient-to-br from-saffron-500 to-cosmic-700 flex items-center justify-center font-bold text-xl mb-3">
                  {s.n}
                </div>
                <h3 className="font-semibold mb-2">{s.t}</h3>
                <p className="text-xs text-white/60">{s.d}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* ─── PRICING ─── */}
      <section id="pricing" className="container py-20">
        <div className="max-w-md mx-auto">
          <Card className="border-saffron-500/40 relative overflow-hidden">
            <div className="absolute top-3 -right-12 rotate-45 bg-saffron-500 text-white text-xs font-bold py-1 px-12 shadow-lg">
              LAUNCH SPECIAL
            </div>
            <CardContent className="p-10 text-center">
              <div className="text-sm uppercase tracking-widest text-saffron-500 mb-2">
                One-time reading
              </div>
              <div className="flex items-baseline justify-center gap-3 mb-1">
                <span className="text-3xl line-through text-white/40">
                  RM{PRICE_MYR.toFixed(2)}
                </span>
                <span className="text-6xl font-bold text-gradient-saffron">
                  FREE
                </span>
              </div>
              <p className="text-white/60 text-sm mb-2">
                First 1,000 users · No credit card required
              </p>
              <div className="mb-6">
                <PromoCounter />
              </div>
              <ul className="text-left space-y-3 mb-8">
                {[
                  "15-20 page personalised PDF",
                  "D1 Rasi + Navamsa D9 chart analysis",
                  "Current Mahadasha & Antardasha",
                  "Career, marriage, wealth, health guidance",
                  "Remedies & gemstone recommendations",
                  "English + any extra language (Tamil, Malay, etc.)",
                  "Secure 2FA login to download anytime",
                  "Manual astrologer review before release",
                ].map((b, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-white/80">
                    <CheckCircle2 className="w-5 h-5 text-saffron-500 flex-shrink-0 mt-0.5" />
                    {b}
                  </li>
                ))}
              </ul>
              <Link href="/reading">
                <Button size="lg" className="w-full">
                  <Sparkles className="w-5 h-5 mr-2" />
                  Claim my FREE reading
                </Button>
              </Link>
              <p className="text-xs text-white/50 mt-3">
                After launch promo ends, readings will be RM{PRICE_MYR.toFixed(2)}
                . One free reading per email.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* ─── FAQ ─── */}
      <section id="faq" className="container py-20">
        <h2 className="font-serif text-4xl md:text-5xl font-bold text-center mb-12">
          Frequently Asked <span className="text-gradient-saffron">Questions</span>
        </h2>
        <div className="max-w-3xl mx-auto space-y-4">
          {[
            {
              q: "Is AI Jyotish reading accurate?",
              a: "Yes. We use Swiss Ephemeris — the same ephemeris library used by professional Vedic astrologers worldwide — to compute your exact planetary positions, Lagna, Nakshatra and Vimshottari Dasha periods. Claude AI then interprets that data using classical Parashara principles. Every reading is also manually reviewed by a human before release.",
            },
            {
              q: "How is this different from free online Kundli sites?",
              a: "Most free sites generate a chart and stop there, or produce generic paragraph templates. RoboJyotish gives you a full AI-written interpretation tailored to your actual life events (job loss, marriage, health, etc.) — typeset into a professional PDF you keep forever.",
            },
            {
              q: "Can I get the reading in Tamil?",
              a: "Yes. Tamil, English, and Bahasa Malaysia are built-in. You can also type any other language into the form and we'll generate it for you.",
            },
            {
              q: "How long does it take?",
              a: "Chart computation and AI generation takes about 3-5 minutes. A human astrologer reviews it — the completed PDF is usually ready within a few hours.",
            },
            {
              q: "Is my data safe?",
              a: "Yes. We use Supabase with email-OTP 2-factor authentication. Your birth data and PDF are stored in a private bucket only you (via OTP) can access.",
            },
            {
              q: "Do you offer refunds?",
              a: "If the AI fails to produce a reading or there's a technical error, we refund fully. Astrological content itself is not refundable once delivered.",
            },
            {
              q: "How do I get help?",
              a: "Email us at support@robojyotish.com — we reply within 24 hours. For issues with your PDF or login, include your order reference and the email you used.",
            },
          ].map((item, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <h3 className="font-semibold text-lg mb-2">{item.q}</h3>
                <p className="text-white/70 text-sm leading-relaxed">{item.a}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* ─── SHARE ─── */}
      <section className="container py-12">
        <ShareBar />
      </section>

      {/* ─── FINAL CTA ─── */}
      <section className="container py-20">
        <Card className="bg-gradient-to-br from-saffron-500/20 via-cosmic-700/20 to-cosmic-950/20 border-saffron-500/30">
          <CardContent className="p-12 text-center">
            <h2 className="font-serif text-4xl md:text-5xl font-bold mb-4">
              Ready to meet your AI Jyotishi?
            </h2>
            <p className="text-white/70 mb-8 max-w-xl mx-auto">
              Join thousands of Malaysian, Singaporean & Indian clients discovering
              what their stars have to say.
            </p>
            <Link href="/reading">
              <Button size="lg">
                <Sparkles className="w-5 h-5 mr-2" />
                Claim my FREE reading
              </Button>
            </Link>
          </CardContent>
        </Card>
      </section>

      {/* ─── FOOTER ─── */}
      <footer className="border-t border-white/10 mt-12">
        <div className="container py-10 text-sm text-white/50">
          <div className="flex flex-col md:flex-row justify-between gap-6">
            <div>
              <div className="font-serif text-xl text-gradient-saffron mb-2">
                {SITE_NAME}
              </div>
              <p className="max-w-md">
                AI-powered Hindu Vedic Jyotish readings for Malaysia, Singapore &
                India. Made with respect for tradition.
              </p>
            </div>
            <div className="flex gap-8 flex-wrap">
              <div>
                <div className="text-white/80 font-medium mb-2">Product</div>
                <ul className="space-y-1">
                  <li><a href="#features">Features</a></li>
                  <li><a href="#pricing">Pricing</a></li>
                  <li><Link href="/reading">Get reading</Link></li>
                </ul>
              </div>
              <div>
                <div className="text-white/80 font-medium mb-2">Support</div>
                <ul className="space-y-1">
                  <li>
                    <a
                      href="mailto:support@robojyotish.com"
                      className="hover:text-saffron-500"
                    >
                      support@robojyotish.com
                    </a>
                  </li>
                  <li><a href="#faq">FAQ</a></li>
                  <li>Reply within 24 hours</li>
                </ul>
              </div>
              <div>
                <div className="text-white/80 font-medium mb-2">Company</div>
                <ul className="space-y-1">
                  <li><Link href="/terms">Terms</Link></li>
                  <li><Link href="/privacy">Privacy</Link></li>
                  <li><Link href="/contact">Contact</Link></li>
                </ul>
              </div>
            </div>
          </div>
          <div className="mt-10 pt-6 border-t border-white/5 text-xs">
            © {new Date().getFullYear()} {SITE_NAME}. Readings are for guidance
            and entertainment; not a substitute for professional medical, legal, or
            financial advice.
          </div>
        </div>
      </footer>
    </main>
  );
}
