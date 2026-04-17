/**
 * GET /api/places?q=kuala
 * Proxies Google Places API (NEW) autocomplete.
 * GET /api/places?place_id=XYZ returns place details with lat/lng + timezone.
 *
 * Uses Places API (New) — https://developers.google.com/maps/documentation/places/web-service/overview-new
 * Enable in Google Cloud: "Places API (New)" (places.googleapis.com) + "Time Zone API".
 */
import { NextRequest, NextResponse } from "next/server";

const KEY =
  process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY ||
  process.env.GOOGLE_PLACES_API_KEY;

export async function GET(req: NextRequest) {
  if (!KEY) {
    return NextResponse.json({ error: "missing_api_key" }, { status: 500 });
  }
  const q = req.nextUrl.searchParams.get("q");
  const placeId = req.nextUrl.searchParams.get("place_id");

  // ── Place details (after user picks a suggestion) ─────────────
  if (placeId) {
    const detailsRes = await fetch(
      `https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`,
      {
        headers: {
          "X-Goog-Api-Key": KEY,
          "X-Goog-FieldMask":
            "id,displayName,formattedAddress,location,utcOffsetMinutes",
        },
      },
    );
    const d = await detailsRes.json();
    if (!detailsRes.ok || !d.location) {
      console.error("[places] details error", d);
      return NextResponse.json(
        { error: d.error?.status ?? "details_failed", message: d.error?.message },
        { status: 400 },
      );
    }
    const lat = d.location.latitude;
    const lng = d.location.longitude;

    // Get IANA timezone name from Time Zone API
    const tzRes = await fetch(
      `https://maps.googleapis.com/maps/api/timezone/json?location=${lat},${lng}&timestamp=${Math.floor(Date.now() / 1000)}&key=${KEY}`,
    );
    const tz = await tzRes.json();

    return NextResponse.json({
      name: d.displayName?.text ?? "",
      formatted: d.formattedAddress ?? "",
      lat,
      lng,
      timezone: tz.timeZoneId ?? "UTC",
    });
  }

  // ── Autocomplete ───────────────────────────────────────────────
  if (!q || q.length < 2) return NextResponse.json({ predictions: [] });

  const autocompleteRes = await fetch(
    "https://places.googleapis.com/v1/places:autocomplete",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": KEY,
      },
      body: JSON.stringify({
        input: q,
        // Restrict to cities-ish results worldwide.
        includedPrimaryTypes: ["locality", "administrative_area_level_3"],
        languageCode: "en",
      }),
    },
  );
  const r = await autocompleteRes.json();

  if (!autocompleteRes.ok) {
    console.error("[places] autocomplete error", r);
    return NextResponse.json(
      {
        predictions: [],
        error: r.error?.status ?? "autocomplete_failed",
        message: r.error?.message,
      },
      { status: 200 },
    );
  }

  const suggestions: {
    placePrediction?: {
      placeId: string;
      text?: { text: string };
      structuredFormat?: {
        mainText?: { text: string };
        secondaryText?: { text: string };
      };
    };
  }[] = r.suggestions ?? [];

  const predictions = suggestions
    .filter((s) => s.placePrediction)
    .map((s) => {
      const pp = s.placePrediction!;
      const main = pp.structuredFormat?.mainText?.text ?? pp.text?.text ?? "";
      const sec = pp.structuredFormat?.secondaryText?.text ?? "";
      return {
        place_id: pp.placeId,
        description: sec ? `${main}, ${sec}` : main,
      };
    });

  return NextResponse.json({ predictions });
}
