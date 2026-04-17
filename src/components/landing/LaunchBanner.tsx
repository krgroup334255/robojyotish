"use client";

import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";

export function LaunchBanner() {
  const [remaining, setRemaining] = useState<number | null>(null);
  const [active, setActive] = useState(false);

  useEffect(() => {
    let live = true;
    async function load() {
      try {
        const r = await fetch("/api/promo", { cache: "no-store" });
        const d = await r.json();
        if (!live) return;
        setActive(d.active);
        setRemaining(d.remaining);
      } catch {
        /* fail silently */
      }
    }
    load();
    const t = setInterval(load, 30_000);
    return () => {
      live = false;
      clearInterval(t);
    };
  }, []);

  if (!active || remaining === null) return null;

  return (
    <div className="relative z-20 bg-gradient-to-r from-saffron-600 via-saffron-500 to-cosmic-500 text-white text-center text-sm py-2 px-4">
      <div className="container flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
        <Sparkles className="w-4 h-4 inline-block" />
        <span className="font-semibold">LAUNCH SPECIAL</span>
        <span className="opacity-90">
          FREE Jyotish reading for the first 1,000 users —{" "}
          <strong>{remaining.toLocaleString()}</strong> slots remaining
        </span>
        <a
          href="/reading"
          className="underline font-semibold hover:no-underline ml-2"
        >
          Claim now →
        </a>
      </div>
    </div>
  );
}
