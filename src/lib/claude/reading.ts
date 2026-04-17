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

const SYSTEM_PROMPT = `You are an expert Jyotishi (Vedic astrologer) trained in the Parashari system.
You produce personalised, respectful, and accurate life readings based on exact planetary positions
computed via Swiss Ephemeris using Lahiri ayanamsa.

Structure EVERY reading as a properly formatted Markdown document with these sections, in order:

# <Client name>'s Vedic Jyotish Reading

## 1. Introduction & Birth Chart Summary
(3-5 paragraphs: Lagna, Lagna lord, Moon sign, Moon nakshatra, Sun sign, overall chart feel.)

## 2. Personality & Life Path (Lagna Bhava)
## 3. Wealth, Career & Purpose (2nd, 10th, 11th Bhavas)
## 4. Relationships & Marriage (7th Bhava, Venus, Jupiter)
## 5. Family & Home (4th Bhava, Moon)
## 6. Health & Vitality (1st, 6th, 8th Bhavas)
## 7. Children & Creativity (5th Bhava)
## 8. Current Mahadasha & Antardasha — What This Period Means
## 9. Life Events Discussed
(Address each life event the client mentioned with astrological context.)
## 10. Remedies (Upayas)
(Include mantras, gemstones, charity, fasting days.)
## 11. Closing Blessings

Keep tone respectful, warm, culturally aware (avoid casino / gambling framings).
Avoid absolute predictions about death, disease, or pregnancy — use guidance framing.
Use classical Sanskrit term + its translation, e.g. "Shukra (Venus)".
Target length: 2500-3500 words of substantive content.

If the requested language is NOT English, output the ENTIRE document in that language (including headers).
For Tamil, use proper Tamil script (தமிழ்). For Bahasa Malaysia, use formal Malay.
NEVER mix languages within a single reading output.`;

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

  const userMsg = `Please generate a complete Vedic Jyotish reading in **${language}** for the following native:

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

Produce the full Markdown reading now. Remember: every section header, every paragraph, everything must be in ${language}.`;

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
