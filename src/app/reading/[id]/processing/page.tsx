"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Mail,
  Star,
} from "lucide-react";

const STAGES: { key: string; label: string; sub?: string; pct: number }[] = [
  { key: "pending_payment", label: "Verifying your entry…", pct: 10 },
  { key: "paid", label: "Kicking off your chart computation…", pct: 25 },
  {
    key: "computing_chart",
    label: "Computing your Vedic chart",
    sub: "Swiss Ephemeris · Lahiri ayanamsa · Lagna · Nakshatra · Dasha",
    pct: 45,
  },
  {
    key: "generating",
    label: "Our AI Jyotishi is writing your reading",
    sub: "Typing in Tamil, English and your chosen languages…",
    pct: 75,
  },
  {
    key: "pending_review",
    label: "Reading drafted — waiting for a human astrologer to review",
    sub: "We'll email you the moment it's ready",
    pct: 90,
  },
  {
    key: "released",
    label: "Your reading is ready!",
    pct: 100,
  },
];

export default function ProcessingPage() {
  const { id } = useParams<{ id: string }>();
  const [stageKey, setStageKey] = useState("pending_payment");
  const [error, setError] = useState<string | null>(null);
  const [smoothPct, setSmoothPct] = useState(5);
  const triggered = useRef(false);
  const attempts = useRef(0);

  // Smooth animated progress — eases toward target pct
  useEffect(() => {
    const stage = STAGES.find((s) => s.key === stageKey);
    const target = stage?.pct ?? 5;
    const interval = setInterval(() => {
      setSmoothPct((prev) => {
        if (Math.abs(prev - target) < 0.5) return target;
        return prev + (target - prev) * 0.08;
      });
    }, 80);
    return () => clearInterval(interval);
  }, [stageKey]);

  // Add visual "working" pulse during long steps — creeps toward next milestone
  useEffect(() => {
    if (stageKey !== "computing_chart" && stageKey !== "generating") return;
    const interval = setInterval(() => {
      setSmoothPct((prev) => {
        const ceiling = stageKey === "computing_chart" ? 70 : 88;
        return prev < ceiling ? prev + 0.25 : prev;
      });
    }, 1200);
    return () => clearInterval(interval);
  }, [stageKey]);

  useEffect(() => {
    let alive = true;

    async function triggerPipeline() {
      attempts.current += 1;
      try {
        const r = await fetch("/api/process", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ readingId: id }),
        });
        if (!r.ok) {
          const d = await r.json().catch(() => ({}));
          // If not_paid, poll a bit more — payment webhook may be delayed
          if (d?.error === "not_paid" && attempts.current < 5) {
            triggered.current = false;
            return;
          }
          throw new Error(d?.message ?? d?.error ?? `HTTP ${r.status}`);
        }
      } catch (e) {
        if (alive) setError((e as Error).message);
      }
    }

    async function poll() {
      while (alive) {
        try {
          const r = await fetch(`/api/reading/${id}`, { cache: "no-store" });
          if (!r.ok) throw new Error(`HTTP ${r.status}`);
          const d = await r.json();
          if (!alive) return;
          setStageKey(d.status);

          if (d.status === "paid" && !triggered.current) {
            triggered.current = true;
            void triggerPipeline();
          }
          if (d.status === "released") return;
          if (d.status === "failed") {
            setError("The pipeline hit an unexpected error.");
            return;
          }
        } catch (e) {
          // Silent soft-fail — just retry. Only surface after several failures.
          if (attempts.current > 10) {
            setError((e as Error).message);
          }
        }
        await new Promise((r) => setTimeout(r, 2500));
      }
    }
    poll();
    return () => {
      alive = false;
    };
  }, [id]);

  const stage = STAGES.find((s) => s.key === stageKey) ?? STAGES[0];
  const isFailed = stageKey === "failed" || error !== null;
  const isReleased = stageKey === "released";

  return (
    <main className="container max-w-xl min-h-screen flex items-center py-20">
      <Card className="w-full">
        <CardContent className="p-10">
          <div className="flex flex-col items-center text-center">
            {/* Icon */}
            {isFailed ? (
              <AlertCircle className="w-16 h-16 text-red-400 mb-4" />
            ) : isReleased ? (
              <CheckCircle2 className="w-16 h-16 text-green-400 mb-4" />
            ) : stageKey === "pending_review" ? (
              <Sparkles className="w-16 h-16 text-saffron-500 mb-4 animate-pulse-glow" />
            ) : (
              <div className="relative mb-4">
                <Loader2 className="w-16 h-16 text-saffron-500 animate-spin" />
                <Star className="w-6 h-6 text-yellow-400 absolute top-1 right-1 animate-pulse fill-yellow-400" />
              </div>
            )}

            <h1 className="font-serif text-3xl mb-3">
              {isFailed
                ? "Something went wrong"
                : isReleased
                ? "Your reading is ready!"
                : "Creating your reading"}
            </h1>

            {!isFailed && (
              <p className="text-white/80 mb-2 font-medium">{stage.label}</p>
            )}
            {!isFailed && stage.sub && (
              <p className="text-xs text-white/50 mb-8 italic">{stage.sub}</p>
            )}

            {/* Progress */}
            {!isFailed && (
              <>
                <Progress value={smoothPct} className="mb-3" />
                <p className="text-xs text-white/50 mb-2">
                  {Math.round(smoothPct)}% complete
                </p>
              </>
            )}

            {/* Pending review copy */}
            {stageKey === "pending_review" && (
              <div className="mt-6 text-sm text-white/60 space-y-2">
                <p>
                  Your reading is drafted and now being reviewed by our team of
                  astrologers.
                </p>
                <p>
                  You&apos;ll get an email the moment it&apos;s ready — usually
                  within a few hours. Feel free to close this tab.
                </p>
              </div>
            )}

            {/* Error state */}
            {isFailed && (
              <div className="mt-2 w-full">
                <p className="text-sm text-red-300 mb-4">
                  {error ??
                    "Don't worry — your order is saved and we'll sort it out."}
                </p>
                <Card className="bg-white/5 border-white/10">
                  <CardContent className="p-4 text-left text-sm text-white/70 space-y-2">
                    <p>What to do:</p>
                    <ul className="list-disc list-inside text-white/60 space-y-1">
                      <li>
                        Reload this page — the pipeline often recovers on its own.
                      </li>
                      <li>
                        If it persists, email{" "}
                        <a
                          href="mailto:support@robojyotish.com"
                          className="text-saffron-500 hover:underline"
                        >
                          support@robojyotish.com
                        </a>{" "}
                        with this reference:
                      </li>
                    </ul>
                    <p className="font-mono text-xs bg-black/20 px-3 py-2 rounded mt-2 break-all">
                      {id}
                    </p>
                  </CardContent>
                </Card>
                <div className="flex gap-2 justify-center mt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.location.reload()}
                  >
                    Reload page
                  </Button>
                  <a href="mailto:support@robojyotish.com">
                    <Button variant="cosmic" size="sm">
                      <Mail className="w-4 h-4 mr-2" />
                      Contact support
                    </Button>
                  </a>
                </div>
              </div>
            )}

            {/* Release state */}
            {isReleased && (
              <a href="/dashboard">
                <Button className="mt-6">
                  <Sparkles className="w-5 h-5 mr-2" />
                  Open my dashboard
                </Button>
              </a>
            )}
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
