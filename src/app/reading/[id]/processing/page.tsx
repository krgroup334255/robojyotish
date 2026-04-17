"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, CheckCircle2, AlertCircle, Sparkles } from "lucide-react";

const STAGES = [
  { key: "pending_payment", label: "Verifying payment...", pct: 10 },
  { key: "paid", label: "Payment confirmed. Starting pipeline...", pct: 20 },
  { key: "computing_chart", label: "Computing your Vedic chart (Swiss Ephemeris)...", pct: 40 },
  { key: "generating", label: "AI Jyotishi writing your reading...", pct: 70 },
  { key: "pending_review", label: "Reading ready — awaiting astrologer review", pct: 90 },
  { key: "released", label: "Complete! Redirecting to your dashboard...", pct: 100 },
];

export default function ProcessingPage() {
  const { id } = useParams<{ id: string }>();
  const [stageKey, setStageKey] = useState("pending_payment");
  const [error, setError] = useState<string | null>(null);
  const triggered = useRef(false);

  useEffect(() => {
    let alive = true;

    async function triggerPipeline() {
      try {
        await fetch("/api/process", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ readingId: id }),
        });
      } catch (e) {
        setError((e as Error).message);
      }
    }

    async function poll() {
      while (alive) {
        try {
          const r = await fetch(`/api/reading/${id}`, { cache: "no-store" });
          const d = await r.json();
          if (!alive) return;
          setStageKey(d.status);

          if (d.status === "paid" && !triggered.current) {
            triggered.current = true;
            void triggerPipeline();
          }
          if (d.status === "released" || d.status === "failed") return;
        } catch (e) {
          setError((e as Error).message);
        }
        await new Promise((r) => setTimeout(r, 2500));
      }
    }
    poll();
    return () => { alive = false; };
  }, [id]);

  const stage = STAGES.find((s) => s.key === stageKey) ?? STAGES[0];
  const pct = stageKey === "failed" ? 0 : stage.pct;

  return (
    <main className="container max-w-xl min-h-screen flex items-center py-20">
      <Card className="w-full">
        <CardContent className="p-10">
          <div className="flex flex-col items-center text-center">
            {stageKey === "failed" ? (
              <AlertCircle className="w-16 h-16 text-red-400 mb-4" />
            ) : stageKey === "released" ? (
              <CheckCircle2 className="w-16 h-16 text-green-400 mb-4" />
            ) : stageKey === "pending_review" ? (
              <Sparkles className="w-16 h-16 text-saffron-500 mb-4 animate-pulse-glow" />
            ) : (
              <Loader2 className="w-16 h-16 text-saffron-500 mb-4 animate-spin" />
            )}

            <h1 className="font-serif text-3xl mb-3">
              {stageKey === "failed" ? "Something went wrong"
                : stageKey === "released" ? "Your reading is ready!"
                : "Creating your reading"}
            </h1>
            <p className="text-white/70 mb-8">{stage.label}</p>

            <Progress value={pct} className="mb-4" />
            <p className="text-xs text-white/50">{pct}% complete</p>

            {stageKey === "pending_review" && (
              <p className="mt-6 text-sm text-white/60">
                Your reading is now being reviewed by a human astrologer.
                We&apos;ll email you as soon as it&apos;s ready — usually within a few hours.
                <br />
                You can close this tab; we have your email.
              </p>
            )}
            {error && (
              <p className="mt-4 text-sm text-red-300">{error}</p>
            )}
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
