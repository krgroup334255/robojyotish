"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Bot, Mail, KeyRound, ArrowRight, Loader2 } from "lucide-react";
import { SITE_NAME } from "@/lib/utils";

export default function LoginPage() {
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
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <main className="container max-w-md min-h-screen flex flex-col justify-center py-12">
      <Link href="/" className="flex items-center gap-2 justify-center mb-8">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-saffron-500 to-cosmic-700 flex items-center justify-center">
          <Bot className="w-6 h-6 text-white" />
        </div>
        <span className="font-serif text-2xl font-bold text-gradient-saffron">
          {SITE_NAME}
        </span>
      </Link>

      <Card>
        <CardContent className="p-8">
          <h1 className="font-serif text-3xl mb-2 text-center">
            {step === "email" ? "Secure sign in" : "Enter your code"}
          </h1>
          <p className="text-center text-white/60 text-sm mb-8">
            {step === "email"
              ? "We'll email you a 6-digit code — no password needed."
              : `Enter the 6-digit code we sent to ${email}`}
          </p>

          {step === "email" ? (
            <form onSubmit={sendOtp} className="space-y-4">
              <div>
                <Label htmlFor="email">Email address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                  <Input
                    id="email" type="email" required
                    value={email} onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                    placeholder="you@example.com"
                  />
                </div>
              </div>
              {error && <p className="text-sm text-red-300">{error}</p>}
              <Button type="submit" size="lg" className="w-full" disabled={loading}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Send code <ArrowRight className="w-4 h-4 ml-2" /></>}
              </Button>
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
              <Button type="submit" size="lg" className="w-full" disabled={loading || otp.length !== 6}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Verify & sign in"}
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
    </main>
  );
}
