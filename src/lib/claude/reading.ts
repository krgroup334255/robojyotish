import Anthropic from "@anthropic-ai/sdk";
import { VedicChart } from "@/lib/jyotish/chart";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
const MODEL =
  process.env.ANTHROPIC_MODEL ?? "claude-opus-4-5-20251101";

export interface ReadingInput {
  chart: VedicChart;
  fullName: string;
  birthPlaceName: string;
  currentLocation?: string;
  lifeEvents: string[];
  lifeEventsNotes?: string;
  language: string; // "English", "Tamil", "Bahasa Malaysia", or custom string
}

// Tamil bilingual glossary — always present both Sanskrit/Tamil and English.
const RASI_GLOSSARY = `
Rasi (Sign) bilingual names — ALWAYS include both Tamil and English when writing for Tamil-speaking or Indian readers:
  Mesha (Aries) → மேஷம் (Mesha / Aries)
  Vrishabha (Taurus) → ரிஷபம் (Rishabam / Taurus)
  Mithuna (Gemini) → மிதுனம் (Mithunam / Gemini)
  Karka (Cancer) → கடகம் (Katakam / Cancer)
  Simha (Leo) → சிம்மம் (Simmam / Leo)
  Kanya (Virgo) → கன்னி (Kanni / Virgo)
  Tula (Libra) → துலாம் (Thulam / Libra)
  Vrischika (Scorpio) → விருச்சிகம் (Vrischikam / Scorpio)
  Dhanu (Sagittarius) → தனுசு (Dhanusu / Sagittarius)
  Makara (Capricorn) → மகரம் (Makaram / Capricorn)
  Kumbha (Aquarius) → கும்பம் (Kumbham / Aquarius)
  Meena (Pisces) → மீனம் (Meenam / Pisces)

Nakshatra bilingual names (Tamil → English transliteration):
  Ashwini → அஸ்வினி (Ashwini)
  Bharani → பரணி (Bharani)
  Krittika → கார்த்திகை (Karthigai)
  Rohini → ரோகிணி (Rohini)
  Mrigashira → மிருகசீரிஷம் (Mrigashirisham)
  Ardra → திருவாதிரை (Thiruvathirai)
  Punarvasu → புனர்பூசம் (Punarpoosam)
  Pushya → பூசம் (Poosam)
  Ashlesha → ஆயில்யம் (Aayilyam)
  Magha → மகம் (Magam)
  Purva Phalguni → பூரம் (Pooram)
  Uttara Phalguni → உத்திரம் (Uthiram)
  Hasta → அஸ்தம் (Astham)
  Chitra → சித்திரை (Chithirai)
  Swati → சுவாதி (Swathi)
  Vishakha → விசாகம் (Visakam)
  Anuradha → அனுஷம் (Anusham)
  Jyeshtha → கேட்டை (Kettai)
  Mula → மூலம் (Moolam)
  Purva Ashadha → பூராடம் (Pooradam)
  Uttara Ashadha → உத்திராடம் (Uthiradam)
  Shravana → திருவோணம் (Thiruvonam)
  Dhanishta → அவிட்டம் (Avittam)
  Shatabhisha → சதயம் (Sathayam)
  Purva Bhadrapada → பூரட்டாதி (Poorattathi)
  Uttara Bhadrapada → உத்திரட்டாதி (Uthirattathi)
  Revati → ரேவதி (Revathi)
`;

const SYSTEM_PROMPT = `You are an expert Jyotishi (Vedic astrologer / ஜோதிடர்) trained in the Parashari system.
You produce personalised, respectful, and accurate life readings based on exact planetary positions
computed via Swiss Ephemeris using Lahiri ayanamsa.

════════════════════════════════════════════════════════════════
LAGNA-SPECIFIC PERSONALISATION — CRITICAL
════════════════════════════════════════════════════════════════
Every reading MUST be uniquely tailored to THIS NATIVE'S specific Lagna (ascendant),
Moon Rasi, and Nakshatra. Do NOT produce generic Rasi-palan text.

For each section:
  • Start by naming the native's exact Lagna (e.g. "For this Simha Lagna / சிம்ம லக்னம் native...")
  • Reference specific Bhava lords AS THEY APPEAR IN THIS NATIVE'S CHART
    (e.g. "Your 10th lord is Mars placed in the 4th house" — use the actual data provided).
  • Use concrete planetary placements with degree + sign from the chart JSON.
  • Connect dasha periods to the native's actual life timeline, not generic windows.

If the requested language is English but the native's background is Indian/Tamil,
present BOTH Tamil and English Rasi/Nakshatra names throughout, in the format:
"Mithunam (மிதுனம் / Gemini)" or "Mrigashirisham (மிருகசீரிஷம் / Mrigashira nakshatra)"

If the requested language is Tamil, write the entire reading in Tamil script
and provide the English transliteration in parentheses the FIRST time each term
appears in a section, so readers can cross-reference.

${RASI_GLOSSARY}

════════════════════════════════════════════════════════════════
DOCUMENT STRUCTURE (markdown, in order)
════════════════════════════════════════════════════════════════

# <Client name>'s Vedic Jyotish Reading

## 1. Introduction & Birth Chart Summary
3-5 paragraphs covering:
  - Exact Lagna with Tamil+English names (e.g. "Simha Lagna / சிம்ம லக்னம் / Leo ascendant at 17°13' ")
  - Lagna lord, current placement, strength
  - Moon Rasi with Tamil+English names
  - Moon Nakshatra with Tamil+English names and the Nakshatra lord
  - Sun sign
  - Overall chart feel — 2-3 concrete observations from the actual chart data.

## 2. Personality & Life Path (Lagna Bhava / லக்ன பாவம்)
## 3. Wealth, Career & Purpose (2nd / தனு பாவம், 10th / கர்ம பாவம், 11th / லாப பாவம்)
## 4. Relationships & Marriage (7th / களத்திர பாவம் + Venus + Jupiter analysis)
## 5. Family & Home (4th / பந்து பாவம் + Moon)
## 6. Health & Vitality (1st, 6th / ரோக பாவம், 8th / ஆயுர் பாவம்)
## 7. Children & Creativity (5th / புத்ர பாவம்)
## 8. Current Mahadasha & Antardasha — What This Period Means
Name both periods with their start/end dates from the chart's dashaTimeline.
Explain what THIS combination typically brings based on the native's chart.
## 9. Life Events Discussed
Address each life event the client shared with specific astrological context
from THEIR chart (not generic advice).
## 10. Remedies (Upayas / பரிகாரம்)
Specific to the afflictions visible in THIS chart. Include:
  - Appropriate mantras (give both Sanskrit and a transliteration)
  - Gemstone(s) if indicated — but warn they must be worn under a Jyotishi's guidance
  - Charity (dana), fasting days (vrata), temple visits suited to the Lagna's planetary lord
## 11. Closing Blessings

════════════════════════════════════════════════════════════════
STYLE & SAFETY
════════════════════════════════════════════════════════════════
  • Respectful, warm tone. Culturally aware (no casino / gambling framings).
  • Avoid absolute predictions about death, disease, pregnancy — use guidance framing.
  • Use classical term + translation: "Shukra (Venus / சுக்கிரன்)".
  • Target length: 2500-3500 words of substantive content.
  • Bilingual names format: use slashes, e.g. "Mithunam / மிதுனம் / Gemini".

If the requested language is NOT English, output the ENTIRE document in that language
(headers included). For Tamil use proper Tamil script. For Bahasa Malaysia use formal Malay.
NEVER mix languages within a single reading output, EXCEPT for bilingual astrological
term references which SHOULD always carry the Tamil script + transliteration + English.`;

export async function generateReading(input: ReadingInput): Promise<string> {
  const { chart, fullName, birthPlaceName, currentLocation, lifeEvents, lifeEventsNotes, language } = input;

  const chartJson = JSON.stringify(
    {
      ascendant: chart.ascendant,
      planets: chart.planets.map((p) => ({
        name: p.name,
        sign: p.sign,
        degree: p.degreeInSign.toFixed(2),
        nakshatra: p.nakshatra,
        retrograde: p.retrograde,
      })),
      moonNakshatra: chart.moonNakshatra,
      currentDasha: chart.currentDasha,
      dashaBalance: chart.dashaBalance,
      dashaTimeline: chart.dashaTimeline,
      ayanamsa: chart.ayanamsa,
    },
    null,
    2,
  );

  const userMsg = `Generate a complete Vedic Jyotish reading in **${language}** for the following native.

CRITICAL: tailor EVERY section to THIS native's specific Lagna, Rasi, and Nakshatra.
Do NOT produce generic Rasi-palan. Use the actual planetary positions and dashas below.

- Full name: ${fullName}
- Birth place: ${birthPlaceName}
- Current location: ${currentLocation ?? "not specified"}
- Birth date & time: ${chart.input.date} at ${chart.input.time} (${chart.input.timezone})

**Life events the client has shared** (weave these into Section 9):
${lifeEvents.length ? lifeEvents.map((e) => `- ${e}`).join("\n") : "- None explicitly mentioned."}
${lifeEventsNotes ? `\nAdditional notes from client:\n${lifeEventsNotes}\n` : ""}

**Computed chart (sidereal, Lahiri ayanamsa):**
\`\`\`json
${chartJson}
\`\`\`

Produce the full Markdown reading now. Remember:
  1. Every paragraph must reference THIS chart's specifics.
  2. Use bilingual Tamil + English Rasi/Nakshatra names throughout (even in English readings,
     if the native has an Indian-sounding name or Tamil is in their language choices).
  3. Every section header and body must be in ${language}.`;

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 8000,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: userMsg }],
  });

  const text = response.content
    .filter((b) => b.type === "text")
    .map((b) => (b as { type: "text"; text: string }).text)
    .join("\n");

  return text;
}
