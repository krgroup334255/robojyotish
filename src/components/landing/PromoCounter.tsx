"use client";

import { useEffect, useState } from "react";
import { Flame } from "lucide-react";

export function PromoCounter() {
  const [remaining, setRemaining] = useState<number | null>(null);
  const [cap, setCap] = useState<number>(1000);
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
        setCap(d.cap);
      } catch {
        /* ignore */
      }
    }
    load();
    const t = setInterval(load, 15_000);
    return () => {
      live = false;
      clearInterval(t);
    };
  }, []);

  if (!active || remaining === null) return null;

  const claimed = cap - remaining;
  const pct = Math.min(100, Math.round((claimed / cap) * 100));

  return (
    <div className="inline-flex flex-col items-center gap-2 rounded-2xl border border-saffron-500/40 bg-saffron-500/10 px-6 py-3">
      <div className="flex items-center gap-2 text-saffron-500 font-semibold text-sm">
        <Flame className="w-4 h-4" />
        <span>
          {claimed.toLocaleString()} of {cap.toLocaleString()} free readings
          claimed
        </span>
      </div>
      <div className="w-56 h-2 rounded-full bg-white/10 overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-saffron-500 via-saffron-600 to-cosmic-500 transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="text-xs text-white/60">
        <strong className="text-saffron-500">
          {remaining.toLocaleString()}
        </strong>{" "}
        free slots remaining · Claim yours before they&apos;re gone
      </div>
    </div>
  );
}
