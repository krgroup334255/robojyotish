"use client";

import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { MapPin, Loader2 } from "lucide-react";

interface Place {
  name: string;
  formatted: string;
  lat: number;
  lng: number;
  timezone: string;
}

interface Prediction {
  place_id: string;
  description: string;
}

export function CityAutocomplete({ onSelect }: { onSelect: (p: Place) => void }) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [preds, setPreds] = useState<Prediction[]>([]);
  const [loading, setLoading] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const debounceTimer = useRef<NodeJS.Timeout | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  // Debounced query + in-flight cancellation
  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    if (abortRef.current) abortRef.current.abort();

    if (q.trim().length < 2) {
      setPreds([]);
      setLoading(false);
      setErrorMsg(null);
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    debounceTimer.current = setTimeout(async () => {
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      try {
        const r = await fetch(`/api/places?q=${encodeURIComponent(q)}`, {
          signal: ctrl.signal,
        });
        const d = await r.json();
        if (ctrl.signal.aborted) return;
        const list: Prediction[] = d.predictions ?? [];
        setPreds(list);
        setOpen(true);
        setHighlight(0);
        if (list.length === 0) {
          setErrorMsg(
            d.error
              ? `Google: ${d.error}${d.message ? " — " + d.message : ""}`
              : "No matches. Try a nearby larger city.",
          );
        }
      } catch (e) {
        const err = e as Error;
        if (err.name !== "AbortError") setErrorMsg(err.message);
      } finally {
        if (!ctrl.signal.aborted) setLoading(false);
      }
    }, 120);

    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [q]);

  // Close dropdown on outside click
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  async function pick(p: Prediction) {
    setQ(p.description);
    setOpen(false);
    setResolving(true);
    try {
      const r = await fetch(
        `/api/places?place_id=${encodeURIComponent(p.place_id)}`,
      );
      const d = await r.json();
      if (d.lat) onSelect(d as Place);
      else setErrorMsg(d.error ?? "Could not resolve city");
    } catch (e) {
      setErrorMsg((e as Error).message);
    } finally {
      setResolving(false);
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open || preds.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((h) => (h + 1) % preds.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => (h - 1 + preds.length) % preds.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      pick(preds[highlight]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div className="relative" ref={wrapRef}>
      <div className="relative">
        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40 pointer-events-none" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onFocus={() => preds.length > 0 && setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder="Start typing: Kuala Lumpur, Chennai, Singapore..."
          className="pl-10 pr-10"
          autoComplete="off"
          spellCheck={false}
        />
        {(loading || resolving) && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-saffron-500 animate-spin" />
        )}
      </div>

      {open && preds.length > 0 && (
        <div className="absolute z-30 mt-1 w-full rounded-xl border border-white/20 bg-cosmic-950/95 backdrop-blur-xl shadow-2xl overflow-hidden max-h-80 overflow-y-auto">
          {preds.map((p, i) => (
            <button
              key={p.place_id}
              type="button"
              className={`w-full text-left px-4 py-2.5 text-sm transition flex items-start gap-2 ${
                i === highlight
                  ? "bg-saffron-500/20 text-white"
                  : "hover:bg-white/10 text-white/90"
              }`}
              onMouseEnter={() => setHighlight(i)}
              onMouseDown={(e) => {
                e.preventDefault();
                pick(p);
              }}
            >
              <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0 text-saffron-500" />
              <span>{p.description}</span>
            </button>
          ))}
        </div>
      )}

      {errorMsg && !loading && q.length >= 2 && (
        <p className="text-xs text-amber-400 mt-1">{errorMsg}</p>
      )}
    </div>
  );
}
