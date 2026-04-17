"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { CityAutocomplete } from "./CityAutocomplete";
import { Loader2, Sparkles, X, Plus } from "lucide-react";

const LIFE_EVENT_SUGGESTIONS = [
  "Job loss",
  "Career change",
  "Divorce",
  "Separation from partner",
  "Marriage decision",
  "Accident or injury",
  "Health issue",
  "Passing of a family member",
  "Legal matter",
  "Financial difficulty",
  "Business decision",
  "Moving country",
  "Trying to conceive",
  "Education decision",
];

const BUILTIN_LANGS = [
  { code: "en", label: "English" },
  { code: "ta", label: "தமிழ் (Tamil)" },
  { code: "ms", label: "Bahasa Malaysia" },
];

interface Place {
  name: string;
  formatted: string;
  lat: number;
  lng: number;
  timezone: string;
}

export function ReadingForm({
  defaultEmail = "",
  isFree = false,
}: {
  defaultEmail?: string;
  isFree?: boolean;
}) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [email] = useState(defaultEmail);
  const [fullName, setFullName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [birthTime, setBirthTime] = useState("");
  const [birthPlace, setBirthPlace] = useState<Place | null>(null);
  const [currentLocation, setCurrentLocation] = useState("");

  const [events, setEvents] = useState<string[]>([]);
  const [customEvent, setCustomEvent] = useState("");
  const [eventsNotes, setEventsNotes] = useState("");

  const [languages, setLanguages] = useState<string[]>(["en"]);
  const [customLang, setCustomLang] = useState("");

  function toggleEvent(e: string) {
    setEvents((prev) =>
      prev.includes(e) ? prev.filter((x) => x !== e) : [...prev, e],
    );
  }
  function addCustomEvent() {
    if (customEvent.trim() && !events.includes(customEvent.trim())) {
      setEvents([...events, customEvent.trim()]);
      setCustomEvent("");
    }
  }
  function toggleLang(code: string) {
    setLanguages((prev) =>
      prev.includes(code) ? prev.filter((x) => x !== code) : [...prev, code],
    );
  }
  function addCustomLang() {
    if (customLang.trim() && !languages.includes(customLang.trim())) {
      setLanguages([...languages, customLang.trim()]);
      setCustomLang("");
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!birthPlace) {
      setError("Please select your birth city from the dropdown.");
      return;
    }
    if (languages.length === 0) {
      setError("Please select at least one language.");
      return;
    }

    setSubmitting(true);
    try {
      const createRes = await fetch("/api/reading", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          fullName,
          birthDate,
          birthTime,
          birthPlaceName: birthPlace.formatted || birthPlace.name,
          birthPlaceLat: birthPlace.lat,
          birthPlaceLng: birthPlace.lng,
          birthPlaceTimezone: birthPlace.timezone,
          currentLocation,
          lifeEvents: events,
          lifeEventsNotes: eventsNotes,
          languages,
        }),
      });
      const created = await createRes.json();
      if (!createRes.ok) throw new Error(created.message ?? "Failed to create reading.");

      const checkoutRes = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ readingId: created.id }),
      });
      const checkout = await checkoutRes.json();
      if (!checkoutRes.ok) throw new Error(checkout.message ?? "Checkout failed.");
      router.push(checkout.url);
    } catch (err) {
      setError((err as Error).message);
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardContent className="p-6 space-y-4">
          <h2 className="font-serif text-2xl mb-2">Who is the reading for?</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="fullName">Full name</Label>
              <Input
                id="fullName" required minLength={2}
                value={fullName} onChange={(e) => setFullName(e.target.value)}
                placeholder="As on birth certificate"
              />
            </div>
            <div>
              <Label htmlFor="email">Email address</Label>
              <Input
                id="email" type="email" required readOnly
                value={email}
                className="opacity-70 cursor-not-allowed"
              />
              <p className="text-xs text-white/50 mt-1">
                Verified via OTP login. PDF will be sent here.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6 space-y-4">
          <h2 className="font-serif text-2xl mb-2">Birth details</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="birthDate">Date of birth</Label>
              <Input
                id="birthDate" type="date" required
                value={birthDate} onChange={(e) => setBirthDate(e.target.value)}
                max={new Date().toISOString().split("T")[0]}
              />
            </div>
            <div>
              <Label htmlFor="birthTime">Time of birth</Label>
              <Input
                id="birthTime" type="time" required
                value={birthTime} onChange={(e) => setBirthTime(e.target.value)}
              />
              <p className="text-xs text-white/50 mt-1">
                As accurate as possible (within 10 min).
              </p>
            </div>
          </div>
          <div>
            <Label>Place of birth (city, country)</Label>
            <CityAutocomplete onSelect={setBirthPlace} />
            {birthPlace && (
              <p className="text-xs text-saffron-500 mt-1">
                ✓ {birthPlace.formatted} · {birthPlace.timezone}
              </p>
            )}
          </div>
          <div>
            <Label htmlFor="currentLocation">Current location (optional)</Label>
            <Input
              id="currentLocation"
              value={currentLocation}
              onChange={(e) => setCurrentLocation(e.target.value)}
              placeholder="e.g. Kuala Lumpur, Malaysia"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6 space-y-4">
          <h2 className="font-serif text-2xl mb-1">Current life events</h2>
          <p className="text-sm text-white/60 mb-4">
            Select all that apply — our AI will address these in your reading.
          </p>
          <div className="flex flex-wrap gap-2">
            {LIFE_EVENT_SUGGESTIONS.map((s) => (
              <button
                key={s} type="button"
                onClick={() => toggleEvent(s)}
                className={`px-3 py-1.5 rounded-full text-sm border transition ${
                  events.includes(s)
                    ? "bg-saffron-500 border-saffron-500 text-white"
                    : "border-white/20 text-white/80 hover:border-saffron-500"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
          <div className="flex gap-2 pt-2">
            <Input
              placeholder="Add your own life event..."
              value={customEvent}
              onChange={(e) => setCustomEvent(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addCustomEvent())}
            />
            <Button type="button" variant="secondary" onClick={addCustomEvent}>
              <Plus className="w-4 h-4" />
            </Button>
          </div>
          {events.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-2">
              {events.map((e) => (
                <span key={e} className="inline-flex items-center gap-1.5 bg-saffron-500/20 border border-saffron-500/40 text-saffron-500 rounded-full px-3 py-1 text-xs">
                  {e}
                  <button type="button" onClick={() => toggleEvent(e)}>
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
          <div>
            <Label htmlFor="notes">Additional notes (optional)</Label>
            <textarea
              id="notes"
              value={eventsNotes}
              onChange={(e) => setEventsNotes(e.target.value)}
              rows={3}
              placeholder="Anything else you'd like the astrologer to address..."
              className="w-full rounded-xl border border-white/20 bg-white/10 backdrop-blur px-4 py-2 text-sm text-white placeholder:text-white/50 focus:border-saffron-500 focus:outline-none focus:ring-2 focus:ring-saffron-500/40"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6 space-y-4">
          <h2 className="font-serif text-2xl mb-1">Reading language(s)</h2>
          <p className="text-sm text-white/60 mb-4">
            We generate in English by default. Select any extras you&apos;d like.
          </p>
          <div className="flex flex-wrap gap-2">
            {BUILTIN_LANGS.map((l) => (
              <button
                key={l.code} type="button"
                onClick={() => toggleLang(l.code)}
                className={`px-3 py-1.5 rounded-full text-sm border transition ${
                  languages.includes(l.code)
                    ? "bg-cosmic-700 border-cosmic-500 text-white"
                    : "border-white/20 text-white/80 hover:border-cosmic-500"
                }`}
              >
                {l.label}
              </button>
            ))}
          </div>
          <div className="flex gap-2 pt-2">
            <Input
              placeholder="Add another language (e.g. Hindi, Telugu)..."
              value={customLang}
              onChange={(e) => setCustomLang(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addCustomLang())}
            />
            <Button type="button" variant="secondary" onClick={addCustomLang}>
              <Plus className="w-4 h-4" />
            </Button>
          </div>
          {languages.filter((l) => !BUILTIN_LANGS.find((b) => b.code === l)).length > 0 && (
            <div className="flex flex-wrap gap-2">
              {languages
                .filter((l) => !BUILTIN_LANGS.find((b) => b.code === l))
                .map((l) => (
                  <span key={l} className="inline-flex items-center gap-1.5 bg-cosmic-700/30 border border-cosmic-500/40 rounded-full px-3 py-1 text-xs">
                    {l}
                    <button type="button" onClick={() => toggleLang(l)}>
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
            </div>
          )}
        </CardContent>
      </Card>

      {error && (
        <Card className="border-red-500/50 bg-red-500/10">
          <CardContent className="p-4 text-sm text-red-200">{error}</CardContent>
        </Card>
      )}

      <div className="text-center pt-4">
        <Button type="submit" size="lg" disabled={submitting}>
          {submitting ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Creating your reading...
            </>
          ) : isFree ? (
            <>
              <Sparkles className="w-5 h-5 mr-2" />
              Claim my FREE launch reading
            </>
          ) : (
            <>
              <Sparkles className="w-5 h-5 mr-2" />
              Continue to payment — RM19.90
            </>
          )}
        </Button>
        {isFree && (
          <p className="text-xs text-white/50 mt-2">
            No credit card required. One free reading per email during launch.
          </p>
        )}
      </div>
    </form>
  );
}
