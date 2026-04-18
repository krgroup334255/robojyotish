"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Shield, Mail, KeyRound, ArrowRight, Loader2, Lock } from "lucide-react";
import { SITE_NAME } from "@/lib/utils";

export default function StaffLoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [step, setStep] = useState<"email" | "otp">("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function sendOtp(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    // Check eligibility server-side before sending OTP to prevent enumeration
    const res = await fetch("/api/staff-check", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const d = await res.json();
    if (!d.allowed) {
      setLoading(false);
      setError(
        "This email is not registered as staff. Contact support@robojyotish.com if you believe this is an error.",
      );
      return;
    }
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: true },
    });
    setLoading(false);
    if (error) setError(error.message);
    else setStep("otp");
  }

  async function verifyOtp(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.verifyOtp({
      email,
      token: otp,
      type: "email",
    });
    setLoading(false);
    if (error) return setError(error.message);
    router.push("/backoffice");
    router.refresh();
  }

  return (
    <main className="container max-w-md min-h-screen flex flex-col justify-center py-12">
      <div className="flex items-center gap-2 justify-center mb-8">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cosmic-700 to-cosmic-950 flex items-center justify-center">
          <Shield className="w-6 h-6 text-saffron-500" />
        </div>
        <div>
          <span className="font-serif text-2xl font-bold text-white block leading-none">
            {SITE_NAME}
          </span>
          <span className="text-xs text-cosmic-500 tracking-widest uppercase">
            Staff portal
          </span>
        </div>
      </div>

      <Card className="border-cosmic-500/30">
        <CardContent className="p-8">
          <div className="flex items-center justify-center gap-2 text-xs text-cosmic-500 mb-4">
            <Lock className="w-3.5 h-3.5" />
            Authorised personnel only · 2FA enforced
          </div>
          <h1 className="font-serif text-3xl mb-2 text-center">
            {step === "email" ? "Back-office sign in" : "Enter your code"}
          </h1>
          <p className="text-center text-white/60 text-sm mb-8">
            {step === "email"
              ? "Only registered staff emails are accepted here."
              : `6-digit code sent to ${email}`}
          </p>

          {step === "email" ? (
            <form onSubmit={sendOtp} className="space-y-4">
              <div>
                <Label htmlFor="email">Staff email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                  <Input
                    id="email" type="email" required
                    value={email} onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                    placeholder="you@robojyotish.com"
                  />
                </div>
              </div>
              {error && <p className="text-sm text-red-300">{error}</p>}
              <Button type="submit" size="lg" className="w-full" variant="cosmic" disabled={loading}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Send code <ArrowRight className="w-4 h-4 ml-2" /></>}
              </Button>
              <p className="text-center text-xs text-white/40 pt-2">
                Are you a customer?{" "}
                <a href="/login" className="text-saffron-500 hover:underline">
                  Sign in here
                </a>
              </p>
            </form>
          ) : (
            <form onSubmit={verifyOtp} className="space-y-4">
              <div>
                <Label htmlFor="otp">6-digit code</Label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                  <Input
                    id="otp" required maxLength={6} inputMode="numeric"
                    value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                    className="pl-10 tracking-[0.5em] text-center"
                    placeholder="000000"
                    autoFocus
                  />
                </div>
              </div>
              {error && <p className="text-sm text-red-300">{error}</p>}
              <Button type="submit" size="lg" className="w-full" variant="cosmic" disabled={loading || otp.length !== 6}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Verify & enter back-office"}
              </Button>
              <button
                type="button"
                onClick={() => setStep("email")}
                className="text-xs text-white/60 hover:text-saffron-500 w-full text-center"
              >
                Use a different email
              </button>
            </form>
          )}
        </CardContent>
      </Card>

      <p className="text-center text-xs text-white/40 mt-6">
        Problems signing in?{" "}
        <a href="mailto:support@robojyotish.com" className="text-saffron-500 hover:underline">
          support@robojyotish.com
        </a>
      </p>
    </main>
  );
}
