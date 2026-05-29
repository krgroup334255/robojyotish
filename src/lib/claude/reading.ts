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
  ageYears?: number; // native's age in years (affects whether Section 12 is full)
}

/** Derive the native's age at 'now' from a YYYY-MM-DD birth date. */
export function ageFromBirthDate(birthDate: string): number {
  const [y, m, d] = birthDate.split("-").map(Number);
  const birth = new Date(Date.UTC(y, (m ?? 1) - 1, d ?? 1));
  const now = new Date();
  let age = now.getUTCFullYear() - birth.getUTCFullYear();
  const mo = now.getUTCMonth() - birth.getUTCMonth();
  if (mo < 0 || (mo === 0 && now.getUTCDate() < birth.getUTCDate())) age--;
  return Math.max(age, 0);
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

// ── Shared system preamble (language + personalisation rules) ──
const SYSTEM_PREAMBLE = `You are an expert Jyotishi (Vedic astrologer / ஜோதிடர்) trained in the Parashari system.
You produce personalised, respectful, and accurate life readings based on exact planetary positions
computed via Swiss Ephemeris using Lahiri ayanamsa.

════════════════════════════════════════════════════════════════
LAGNA-SPECIFIC PERSONALISATION — CRITICAL
════════════════════════════════════════════════════════════════
Every section MUST be uniquely tailored to THIS NATIVE'S specific Lagna (ascendant),
Moon Rasi, and Nakshatra. Do NOT produce generic Rasi-palan text.
  • Name the native's exact Lagna at the start of relevant sections.
  • Reference specific Bhava lords as they appear in THIS chart.
  • Use concrete planetary placements with degree + sign from the chart JSON.
  • Connect dasha periods to the native's actual life timeline.

If the requested language is English but the native's background is Indian/Tamil,
present BOTH Tamil and English Rasi/Nakshatra names throughout.
If the requested language is Tamil, write entirely in Tamil script (English terms in
parentheses first time each section).

${RASI_GLOSSARY}

════════════════════════════════════════════════════════════════
STYLE & SAFETY
════════════════════════════════════════════════════════════════
  • Respectful, warm tone. Culturally aware.
  • Avoid absolute predictions about death, disease, pregnancy — use guidance framing.
  • Use classical term + translation: "Shukra (Venus / சுக்கிரன்)".
  • Bilingual names format: use slashes, e.g. "Mithunam / மிதுனம் / Gemini".
  • Every section has a strict paragraph limit — honour it.

If the requested language is NOT English, output the ENTIRE response in that language
(headers included). For Tamil use proper Tamil script. For Bahasa Malaysia use formal Malay.
NEVER mix languages within a section, EXCEPT for bilingual astrological term references.`;

// ── Batch prompts — run concurrently, stitched in document order ──
// Sections 2 and 7 (the two tables) each get their own dedicated call
// whose prefill ends on the separator row, forcing Claude to write data rows.

// Batch A1: prose sections 1, 3, 4
const BATCH_A1_PROMPT = `Generate ONLY the following sections of the reading (nothing else):

# {NAME}'s Vedic Jyotish Reading

## 1. Natal Chart
2 paragraphs. Birth date/time/place, Lagna at exact degree, Ayanamsa (Lahiri), overview of
the chart's character — notable yogas, benefic/malefic concentration drawn from THIS chart.

## 3. Lagna — Foundation
2 paragraphs only. Core identity, temperament, constitution, Lagna lord's sign/house/nakshatra,
aspects on the Lagna.

## 4. Moon
2 paragraphs only. Moon sign (Janma Rasi), Moon nakshatra, emotional nature, mother, inner peace,
interactions with other planets in THIS chart.`;

// Batch A2: Section 2 table only.
// The prefill (TABLE_A2_HEADER) seeds the assistant turn through the separator row
// so Claude's very first generated token must be a pipe character — a data row.
const BATCH_A2_PROMPT = `Generate ONLY Section 2 — Planetary Positions — as a pipe-delimited markdown table.
Output exactly 9 data rows (one per planet) continuing directly from the table already started.
Each row MUST start and end with a pipe | character.
Planets in order: Sun, Moon, Mars, Mercury, Jupiter, Venus, Saturn, Rahu, Ketu.
Each cell: bilingual name | bilingual Rasi | degree to 2dp | bilingual Nakshatra | house # | R or —
NO prose. NO bullet points. NO section header. NO preamble. ONLY the 9 pipe-delimited rows.`;

// Section 2 table header+separator — this IS the prefill for Batch A2.
// Claude must continue from the last character (the newline after the separator row).
const TABLE_A2_HEADER =
  `## 2. Planetary Positions\n\n` +
  `| Planet | Rasi (Sign) | Degree | Nakshatra | House | Retro |\n` +
  `|--------|-------------|--------|-----------|-------|-------|\n`;

// Batch B1: prose sections 5, 6, 8 (section 7 table is in its own call)
const BATCH_B1_PROMPT = `Generate ONLY the following sections of the reading (nothing else):

## 5. Exaltations & Debilitations
CONDITIONAL — include ONLY if at least one planet in this chart is exalted (uchcha), debilitated
(neecha), in own sign (swakshetra), or vargottama. If none apply, write exactly:
"No classical exaltations, debilitations or own-sign placements are present in this chart."
Otherwise: 2-3 sentences per qualifying planet (max 4 planets). State: planet, status, one concrete
life implication.

## 6. Current Dasha
2 paragraphs only. Name the running Mahadasha lord AND active Antardasha. Describe what this
combination means given THIS native's chart — house ownerships, placement, aspects thrown.

## 8. Jupiter Transition (Guru Peyarchi / குரு பெயர்ச்சி)
2 paragraphs only. Natal Jupiter house + aspects. Then 3 key upcoming transit milestones
(marriage, career, spiritual) most relevant for this Lagna.`;

// Batch B2: Section 7 table only.
// Prefill (TABLE_B2_HEADER) ends on the separator row — Claude writes dasha rows next.
const BATCH_B2_PROMPT = `Generate ONLY Section 7 — Dasha Completion Timeline — as a pipe-delimited markdown table.
Output one data row per dasha period from the dashaTimeline in the chart JSON.
Each row MUST start and end with a pipe | character.
Do NOT invent dates — use ONLY the dates from the chart JSON.
"Character for This Native" = ONE clause ≤12 words describing what this dasha means for this chart.
NO prose. NO bullet points. NO section header. NO preamble. ONLY the pipe-delimited rows.`;

// Section 7 table header+separator — prefill for Batch B2.
const TABLE_B2_HEADER =
  `## 7. Dasha Completion Timeline\n\n` +
  `| Mahadasha Lord | Start Date | End Date | Character for This Native |\n` +
  `|----------------|------------|----------|--------------------------|\n`;

// Batch C: sections 9-13
const BATCH_C_PROMPT = `Generate ONLY the following sections of the reading (nothing else):

## 9. Professional Life, Career & Business
2 paragraphs only. 10th house lord + occupants, suitable career domains with planetary logic.
One sentence on business potential if indicated.

## 10. Relationships & Love Life
2 paragraphs only. 7th house lord, Venus placement, marriage timing from current dasha,
one dosha check (Kuja/Mangal) if present.

## 11. Children
1-2 paragraphs only. 5th house lord, Jupiter's karaka role, one timing note, one remedy
if the 5th is afflicted.

## 12. Education
CONDITIONAL — include IN FULL ONLY IF the native is under 21.
If under 21: 2 paragraphs on suitable study fields and dasha timing, plus one study remedy.
If 21 or older: write exactly one line:
"Education phase has concluded — see Section 9 (Career) for vocational guidance based on
continued learning."

## 13. Additional Concerns Raised by the Client
Address EACH life-event concern in 2-3 sentences with specific chart context.
Then ONE paragraph of remedies (upayas / பரிகாரம்): one mantra (Sanskrit + transliteration),
one gemstone note (caution: consult a Jyotishi before wearing), one fasting/charity day,
one temple suggestion.

Close with a single blessing sentence signed "ॐ" or "ஓம்".`;

export async function generateReading(input: ReadingInput): Promise<string> {
  const { chart, fullName, birthPlaceName, currentLocation, lifeEvents, lifeEventsNotes, language } = input;
  const ageYears = input.ageYears ?? ageFromBirthDate(chart.input.date);

  const chartJson = JSON.stringify(
    {
      ascendant: chart.ascendant,
      planets: chart.planets.map((p) => ({
        name: p.name,
        sign: p.sign,
        signIndex: p.signIndex,
        degree: p.degreeInSign.toFixed(2),
        nakshatra: p.nakshatra,
        retrograde: p.retrograde ?? false,
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

  const underAge = ageYears < 21;

  // ── Shared context block sent with every batch ────────────────
  const contextBlock = `Generate the reading in **${language}**.
Tailor every section to THIS native's specific Lagna, Rasi, and Nakshatra.
Do NOT produce generic Rasi-palan. Use the actual planetary positions and dashas below.

- Full name: ${fullName}
- Birth place: ${birthPlaceName}
- Current location: ${currentLocation ?? "not specified"}
- Birth date & time: ${chart.input.date} at ${chart.input.time} (${chart.input.timezone})
- Current age: ${ageYears} years ${underAge ? "(UNDER 21 — include FULL Section 12 Education)" : "(21 or older — Section 12 is ONE LINE only)"}

**Additional concerns / life events raised by the client** (address EACH in Section 13):
${lifeEvents.length ? lifeEvents.map((e) => `- ${e}`).join("\n") : "- None explicitly mentioned."}
${lifeEventsNotes ? `\nAdditional notes from client:\n${lifeEventsNotes}\n` : ""}

**Computed chart (sidereal, Lahiri ayanamsa):**
\`\`\`json
${chartJson}
\`\`\`

Output ONLY the sections listed in the instruction above — no preamble, no summary.
Every section header and body MUST be in ${language}.`;

  // ── Helper: call Claude for one batch ─────────────────────────
  const BATCH_TOKENS = 20000; // generous budget per batch

  /**
   * `prefill` seeds the assistant turn before Claude responds.
   * Claude must continue from the exact last character of the prefill.
   * For table batches, prefill ends on the separator row so Claude's
   * next token must be a pipe character — bullet points are impossible.
   * The prefill is prepended to the returned text so the stitched
   * document is complete.
   */
  async function callBatch(batchPrompt: string, prefill?: string): Promise<string> {
    const userMsg = batchPrompt.replace("{NAME}", fullName) + "\n\n" + contextBlock;
    const messages: { role: "user" | "assistant"; content: string }[] = [
      { role: "user", content: userMsg },
    ];
    if (prefill) messages.push({ role: "assistant", content: prefill });

    const response = await client.messages.create({
      model: MODEL,
      max_tokens: BATCH_TOKENS,
      system: SYSTEM_PREAMBLE,
      messages,
    });
    const responseText = response.content
      .filter((b) => b.type === "text")
      .map((b) => (b as { type: "text"; text: string }).text)
      .join("\n");

    // Prepend prefill so the stitched document is complete
    const text = prefill ? prefill + responseText : responseText;

    // Safety net: if this batch was cut off, do one continuation pass
    if (response.stop_reason === "max_tokens") {
      console.warn(`[generateReading] Batch hit max_tokens — running one continuation pass.`);
      const cont = await client.messages.create({
        model: MODEL,
        max_tokens: 20000,
        system: SYSTEM_PREAMBLE,
        messages: [
          { role: "user", content: userMsg },
          { role: "assistant", content: text },
          {
            role: "user",
            content:
              "Your response was cut off. Continue from exactly where you stopped. Complete all remaining sections in this batch only.",
          },
        ],
      });
      const contText = cont.content
        .filter((b) => b.type === "text")
        .map((b) => (b as { type: "text"; text: string }).text)
        .join("\n");
      return text + "\n" + contText;
    }

    return text;
  }

  // ── Fire all 5 batches concurrently ───────────────────────────
  // A1 = sections 1, 3, 4 (prose)
  // A2 = section 2 (planetary table — dedicated prefilled call)
  // B1 = sections 5, 6, 8 (prose)
  // B2 = section 7 (dasha table — dedicated prefilled call)
  // C  = sections 9-13
  console.info(`[generateReading] Starting 5 concurrent batches for ${fullName} (${language})`);
  const [batchA1, batchA2, batchB1, batchB2, batchC] = await Promise.all([
    callBatch(BATCH_A1_PROMPT),
    callBatch(BATCH_A2_PROMPT, TABLE_A2_HEADER),
    callBatch(BATCH_B1_PROMPT),
    callBatch(BATCH_B2_PROMPT, TABLE_B2_HEADER),
    callBatch(BATCH_C_PROMPT),
  ]);
  console.info(`[generateReading] All 5 batches complete.`);

  // ── Stitch in correct document order: 1, 2, 3, 4, 5, 6, 7, 8, 9-13 ──
  // Remove stray horizontal-rule lines (---) Claude sometimes appends at
  // the end of a batch — they corrupt table detection in the PDF renderer.
  const stripHr = (s: string) => s.replace(/\n[-*]{3,}\s*$/gm, "").trim();

  // Split A1 (sections 1, 3, 4) at the "## 3." heading boundary so the
  // dedicated section 2 table can be inserted between them.
  const a1 = stripHr(batchA1);
  const sec3Match = a1.match(/^## 3\. /m);
  const sec3Idx = sec3Match?.index ?? -1;
  const sec1Part = sec3Idx > 0 ? a1.slice(0, sec3Idx).trimEnd() : a1;
  const sec34Part = sec3Idx > 0 ? a1.slice(sec3Idx) : "";

  // Split B1 (sections 5, 6, 8) at the "## 8." heading boundary so the
  // dedicated section 7 table can be inserted between sections 6 and 8.
  const b1 = stripHr(batchB1);
  const sec8Match = b1.match(/^## 8\. /m);
  const sec8Idx = sec8Match?.index ?? -1;
  const sec56Part = sec8Idx > 0 ? b1.slice(0, sec8Idx).trimEnd() : b1;
  const sec8Part = sec8Idx > 0 ? b1.slice(sec8Idx) : "";

  return [
    sec1Part,           // section 1
    stripHr(batchA2),   // section 2 — planetary table (prefill-locked)
    sec34Part,          // sections 3, 4
    sec56Part,          // sections 5, 6
    stripHr(batchB2),   // section 7 — dasha table (prefill-locked)
    sec8Part,           // section 8
    stripHr(batchC),    // sections 9-13
  ].filter(Boolean).join("\n\n");
}
