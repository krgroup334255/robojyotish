"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  RotateCw,
  Loader2,
  FileText,
  AlertTriangle,
  Play,
} from "lucide-react";

const LANG_LABEL: Record<string, string> = {
  en: "English", ta: "Tamil", ms: "Bahasa Malaysia",
};

type ReadingRow = {
  id: string;
  full_name: string;
  email: string;
  birth_date: string;
  birth_time: string;
  birth_place_name: string;
  birth_place_timezone: string;
  current_location: string | null;
  status: string;
  languages: string[];
  readings: Record<string, string> | null;
  life_events: string[] | null;
  life_events_notes: string | null;
  chart_data: {
    ascendant?: { sign?: string };
    moonNakshatra?: { name?: string };
    currentDasha?: { maha?: string; antara?: string };
  } | null;
};

export function BackofficeReviewEditor({ reading }: { reading: ReadingRow }) {
  const router = useRouter();
  const [readings, setReadings] = useState<Record<string, string>>(reading.readings ?? {});
  const [activeLang, setActiveLang] = useState<string>(reading.languages?.[0] ?? "en");
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  async function call(path: string, body: object): Promise<{ text?: string } | undefined> {
    setBusy(path);
    setMsg(null);
    try {
      const r = await fetch(path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      // Parse the body safely — some errors (504 timeout, 502, 500 with no body)
      // return non-JSON or empty strings. Always handle gracefully.
      const raw = await r.text();
      let d: Record<string, unknown> = {};
      try {
        if (raw) d = JSON.parse(raw);
      } catch {
        // server returned HTML or empty — fall through with status-based error
      }
      if (!r.ok) {
        const status = r.status;
        const errCode = (d.error as string) ?? "";
        const errMsg = (d.message as string) ?? "";
        const combined = [errCode, errMsg].filter(Boolean).join(" — ");
        if (status === 504) {
          throw new Error(
            "The request took longer than expected. Please try again — subsequent attempts are often faster.",
          );
        }
        if (status >= 500) {
          throw new Error(
            combined ||
              `Server error (${status}). Contact support@robojyotish.com with the reading ID.`,
          );
        }
        throw new Error(combined || `Failed (${status})`);
      }
      return d as { text?: string };
    } catch (e) {
      setMsg(`Error: ${(e as Error).message}`);
      throw e;
    } finally {
      setBusy(null);
    }
  }

  async function regen(code: string) {
    const d = await call("/api/backoffice/regenerate", { readingId: reading.id, language: code });
    if (d?.text) {
      const text = d.text;
      setReadings((prev) => ({ ...prev, [code]: text }));
      setMsg(`Regenerated ${LANG_LABEL[code] ?? code}.`);
    }
  }

  async function release() {
    await call("/api/backoffice/release", { readingId: reading.id, readings });
    setMsg("Released to customer. Redirecting...");
    setTimeout(() => router.push("/backoffice"), 1500);
  }

  async function reject() {
    const notes = prompt("Reason for rejection?");
    if (!notes) return;
    await call("/api/backoffice/reject", { readingId: reading.id, notes });
    router.push("/backoffice");
  }

  async function previewPdf() {
    setBusy("/api/backoffice/preview");
    setMsg(null);
    try {
      const res = await fetch("/api/backoffice/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          readingId: reading.id,
          language: activeLang,
          markdown: readings[activeLang] ?? "",
        }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error ?? `HTTP ${res.status}`);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");
      setMsg("PDF preview opened in a new tab.");
    } catch (e) {
      setMsg(`Error: ${(e as Error).message}`);
    } finally {
      setBusy(null);
    }
  }

  async function retryPipeline() {
    setBusy("/api/process");
    setMsg("Kicking off the pipeline...");
    try {
      const res = await fetch("/api/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ readingId: reading.id }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error ?? d.message ?? `HTTP ${res.status}`);
      setMsg("Pipeline started. Refreshing in a few seconds...");
      setTimeout(() => router.refresh(), 3000);
    } catch (e) {
      setMsg(`Error: ${(e as Error).message}`);
    } finally {
      setBusy(null);
    }
  }

  const activeMarkdown = readings[activeLang] ?? "";
  const hasChart = !!reading.chart_data;
  const hasContent = activeMarkdown.trim().length > 50;

  return (
    <div className="space-y-6">
      <Link href="/backoffice" className="inline-flex items-center text-sm text-white/60 hover:text-saffron-500">
        <ArrowLeft className="w-4 h-4 mr-1" /> back to queue
      </Link>

      <Card>
        <CardContent className="p-6">
          <h1 className="font-serif text-3xl mb-1">{reading.full_name}</h1>
          <p className="text-white/60 text-sm">{reading.email}</p>
          <div className="grid md:grid-cols-3 gap-4 mt-4 text-sm">
            <Meta k="Birth" v={`${reading.birth_date} ${reading.birth_time}`} />
            <Meta k="Place" v={reading.birth_place_name} />
            <Meta k="Timezone" v={reading.birth_place_timezone} />
            <Meta k="Current" v={reading.current_location ?? "—"} />
            <Meta k="Languages" v={(reading.languages ?? []).join(", ")} />
            <Meta k="Status" v={<span className="inline-block px-2 py-0.5 rounded-full bg-saffron-500/20 text-saffron-500">{reading.status}</span>} />
          </div>
          {(reading.life_events?.length ?? 0) > 0 && (
            <div className="mt-4">
              <div className="text-xs text-white/50 mb-1">Life events</div>
              <div className="flex flex-wrap gap-2">
                {(reading.life_events ?? []).map((e: string) => (
                  <span key={e} className="px-3 py-1 text-xs rounded-full bg-cosmic-700/30 border border-cosmic-500/30">
                    {e}
                  </span>
                ))}
              </div>
              {reading.life_events_notes && (
                <p className="text-sm text-white/70 mt-2 italic">“{reading.life_events_notes}”</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {!hasChart && (
        <Card className="border-amber-500/40 bg-amber-500/5">
          <CardContent className="p-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-6 h-6 text-amber-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h2 className="font-serif text-xl mb-1 text-amber-400">
                  Pipeline not complete
                </h2>
                <p className="text-sm text-white/70 mb-4">
                  This reading has no chart or AI-generated text yet. The
                  pipeline either never ran or errored out. Click below to
                  re-run it — this will compute the Vedic chart and ask
                  Claude to write the reading.
                </p>
                <Button
                  onClick={retryPipeline}
                  disabled={busy !== null}
                  variant="cosmic"
                >
                  {busy === "/api/process" ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Play className="w-4 h-4 mr-2" />
                  )}
                  Run pipeline now
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {hasChart && (
        <Card>
          <CardContent className="p-6">
            <h2 className="font-serif text-xl mb-3">Computed chart</h2>
            <div className="grid md:grid-cols-2 gap-3 text-sm">
              <div>Ascendant: <b>{reading.chart_data?.ascendant?.sign}</b></div>
              <div>Moon Nakshatra: <b>{reading.chart_data?.moonNakshatra?.name}</b></div>
              <div>Current Mahadasha: <b>{reading.chart_data?.currentDasha?.maha}</b></div>
              <div>Antardasha: <b>{reading.chart_data?.currentDasha?.antara}</b></div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
            <div className="flex gap-2 flex-wrap">
              {(reading.languages ?? []).map((code: string) => (
                <button
                  key={code}
                  onClick={() => setActiveLang(code)}
                  className={`px-3 py-1.5 rounded-full text-sm border ${
                    activeLang === code
                      ? "bg-saffron-500 border-saffron-500 text-white"
                      : "border-white/20 hover:border-saffron-500"
                  }`}
                >
                  {LANG_LABEL[code] ?? code}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <Button
                type="button" size="sm" variant="outline"
                onClick={() => regen(activeLang)}
                disabled={busy !== null || !hasChart}
                title={!hasChart ? "Need a chart first — run pipeline above" : ""}
              >
                {busy === "/api/backoffice/regenerate" ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCw className="w-4 h-4" />}
                <span className="ml-2">Regenerate</span>
              </Button>
              <Button
                type="button" size="sm" variant="outline"
                onClick={previewPdf}
                disabled={busy !== null || !hasContent}
                title={!hasContent ? "No content to preview yet" : ""}
              >
                {busy === "/api/backoffice/preview" ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
                <span className="ml-2">Preview PDF</span>
              </Button>
            </div>
          </div>

          {!hasContent ? (
            <div className="rounded-xl border border-white/10 bg-black/20 p-6 text-center">
              <FileText className="w-10 h-10 text-white/30 mx-auto mb-3" />
              <p className="text-sm text-white/60 mb-1">
                No reading text yet for <b>{LANG_LABEL[activeLang] ?? activeLang}</b>
              </p>
              <p className="text-xs text-white/40">
                {hasChart
                  ? "Click Regenerate to have Claude write a fresh draft, or paste your own markdown below."
                  : "Run the pipeline first (orange button at the top), then come back here."}
              </p>
            </div>
          ) : null}

          <textarea
            value={readings[activeLang] ?? ""}
            onChange={(e) => setReadings((prev) => ({ ...prev, [activeLang]: e.target.value }))}
            rows={24}
            className={`w-full font-mono text-xs rounded-xl border border-white/20 bg-black/30 p-4 text-white mt-4 ${!hasContent ? "opacity-60" : ""}`}
            placeholder={`Markdown reading for ${LANG_LABEL[activeLang] ?? activeLang}...`}
          />
          <p className="text-xs text-white/50 mt-2">
            Edit freely. Markdown (# ## ###, **bold**, - lists) will render in the PDF.
            Click <b>Preview PDF</b> to see exactly what the customer will receive.
          </p>
        </CardContent>
      </Card>

      {msg && (
        <div className="text-sm text-saffron-500 bg-saffron-500/10 border border-saffron-500/30 rounded-xl p-3">
          {msg}
        </div>
      )}

      <div className="flex gap-3 justify-end sticky bottom-4">
        <Button variant="outline" onClick={reject} disabled={!!busy}>
          <XCircle className="w-4 h-4 mr-2" /> Reject
        </Button>
        <Button
          onClick={release}
          disabled={!!busy || !hasContent}
          title={!hasContent ? "No content to release — generate or paste a reading first" : ""}
        >
          {busy === "/api/backoffice/release" ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
          Approve & release
        </Button>
      </div>
    </div>
  );
}

function Meta({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs text-white/40">{k}</div>
      <div>{v}</div>
    </div>
  );
}
