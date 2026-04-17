/**
 * Vedic (sidereal Lahiri) chart calculation using sweph.
 * Computes: Lagna, Navamsa, planetary longitudes, nakshatras, Vimshottari dasha.
 */
import * as sweph from "sweph";
import path from "path";

const EPHE_PATH = path.join(process.cwd(), "ephe");
let initialised = false;
function init() {
  if (initialised) return;
  // Swiss Ephemeris can work without .se1 files for moderate accuracy using
  // the built-in Moshier method, but SE1 files are preferred for production.
  try {
    sweph.set_ephe_path(EPHE_PATH);
  } catch {
    /* ignore; fall back to Moshier */
  }
  // Lahiri ayanamsa (standard for Indian Vedic astrology).
  sweph.set_sid_mode(sweph.constants.SE_SIDM_LAHIRI, 0, 0);
  initialised = true;
}

const SIGNS = [
  "Mesha (Aries)", "Vrishabha (Taurus)", "Mithuna (Gemini)",
  "Karka (Cancer)", "Simha (Leo)", "Kanya (Virgo)",
  "Tula (Libra)", "Vrischika (Scorpio)", "Dhanu (Sagittarius)",
  "Makara (Capricorn)", "Kumbha (Aquarius)", "Meena (Pisces)",
];

const NAKSHATRAS = [
  "Ashwini", "Bharani", "Krittika", "Rohini", "Mrigashira", "Ardra",
  "Punarvasu", "Pushya", "Ashlesha", "Magha", "Purva Phalguni",
  "Uttara Phalguni", "Hasta", "Chitra", "Swati", "Vishakha",
  "Anuradha", "Jyeshtha", "Mula", "Purva Ashadha", "Uttara Ashadha",
  "Shravana", "Dhanishta", "Shatabhisha", "Purva Bhadrapada",
  "Uttara Bhadrapada", "Revati",
];

// Vimshottari Dasha lords & years (total 120).
const DASHA_SEQ: [string, number][] = [
  ["Ketu", 7], ["Venus", 20], ["Sun", 6], ["Moon", 10],
  ["Mars", 7], ["Rahu", 18], ["Jupiter", 16], ["Saturn", 19],
  ["Mercury", 17],
];
// Nakshatra lord order (Krittika = Sun's nakshatra 3rd, canonical order starts at Ashwini=Ketu).
const NAK_LORDS = [
  "Ketu", "Venus", "Sun", "Moon", "Mars", "Rahu", "Jupiter", "Saturn", "Mercury",
  "Ketu", "Venus", "Sun", "Moon", "Mars", "Rahu", "Jupiter", "Saturn", "Mercury",
  "Ketu", "Venus", "Sun", "Moon", "Mars", "Rahu", "Jupiter", "Saturn", "Mercury",
];

const PLANETS = [
  { key: "Sun", body: sweph.constants.SE_SUN },
  { key: "Moon", body: sweph.constants.SE_MOON },
  { key: "Mars", body: sweph.constants.SE_MARS },
  { key: "Mercury", body: sweph.constants.SE_MERCURY },
  { key: "Jupiter", body: sweph.constants.SE_JUPITER },
  { key: "Venus", body: sweph.constants.SE_VENUS },
  { key: "Saturn", body: sweph.constants.SE_SATURN },
  { key: "Rahu", body: sweph.constants.SE_MEAN_NODE },
];

export interface BirthInput {
  date: string;      // YYYY-MM-DD
  time: string;      // HH:mm (24h, local)
  lat: number;
  lng: number;
  timezone: string;  // IANA tz
}

export interface PlanetPosition {
  name: string;
  longitude: number;
  sign: string;
  signIndex: number;
  degreeInSign: number;
  nakshatra: string;
  nakshatraIndex: number;
  retrograde?: boolean;
}

export interface VedicChart {
  input: BirthInput;
  jdUT: number;
  ascendant: { longitude: number; sign: string; signIndex: number };
  planets: PlanetPosition[];
  moonNakshatra: { name: string; index: number; lord: string };
  dashaBalance: { lord: string; yearsRemaining: number };
  dashaTimeline: { lord: string; startDate: string; endDate: string }[];
  currentDasha: { maha: string; antara: string };
  ayanamsa: number;
}

/**
 * Convert local birth date+time+IANA tz to Julian Day (UT).
 * We use Intl + offset math.
 */
function toJulianDayUT(input: BirthInput): number {
  const [y, m, d] = input.date.split("-").map(Number);
  const [hh, mm] = input.time.split(":").map(Number);

  // Offset lookup: build a Date at the target local wall clock,
  // measure its offset relative to UTC by using Intl.
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: input.timezone,
    hourCycle: "h23",
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  });
  // Assume the local clock is wall-time in the tz. Convert by creating
  // a UTC Date from the wall time, then adjusting by the tz offset at that instant.
  const utcGuess = Date.UTC(y, m - 1, d, hh, mm);
  const parts = dtf.formatToParts(new Date(utcGuess));
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  const tzWall = Date.UTC(get("year"), get("month") - 1, get("day"),
    get("hour"), get("minute"), get("second"));
  const offsetMs = tzWall - utcGuess;
  const utcMs = utcGuess - offsetMs;

  const dt = new Date(utcMs);
  const Y = dt.getUTCFullYear();
  const M = dt.getUTCMonth() + 1;
  const D = dt.getUTCDate();
  const H =
    dt.getUTCHours() + dt.getUTCMinutes() / 60 + dt.getUTCSeconds() / 3600;

  const jd = sweph.julday(Y, M, D, H, sweph.constants.SE_GREG_CAL);
  return jd;
}

export function computeChart(input: BirthInput): VedicChart {
  init();
  const jdUT = toJulianDayUT(input);
  const ayanamsa = sweph.get_ayanamsa_ut(jdUT);

  // Ascendant (Lagna) via houses
  const houses = sweph.houses_ex2(
    jdUT,
    sweph.constants.SEFLG_SIDEREAL,
    input.lat,
    input.lng,
    "P", // Placidus; Rasi lagna uses ascendant regardless
  ) as unknown as { data: { points: number[] } };
  const ascLon = houses.data.points[0]; // ascendant degree

  const ascSignIdx = Math.floor(ascLon / 30);
  const flag = sweph.constants.SEFLG_SIDEREAL | sweph.constants.SEFLG_SPEED;

  const planets: PlanetPosition[] = PLANETS.map(({ key, body }) => {
    const res = sweph.calc_ut(jdUT, body, flag) as unknown as { data: number[] };
    const lon = res.data[0];
    const speed = res.data[3];
    return buildPlanet(key, lon, speed);
  });

  // Ketu = Rahu + 180
  const rahu = planets.find((p) => p.name === "Rahu")!;
  const ketuLon = (rahu.longitude + 180) % 360;
  planets.push(buildPlanet("Ketu", ketuLon, 0));

  const moon = planets.find((p) => p.name === "Moon")!;
  const moonNakIdx = moon.nakshatraIndex;
  const moonNakLord = NAK_LORDS[moonNakIdx];

  // Vimshottari dasha balance: how much of the moon's nakshatra remains.
  const nakSpan = 360 / 27; // 13°20'
  const moonInNak = moon.longitude % nakSpan;
  const fractionRemaining = 1 - moonInNak / nakSpan;
  const lordYears = DASHA_SEQ.find(([l]) => l === moonNakLord)![1];
  const yearsRemaining = fractionRemaining * lordYears;

  // Build dasha timeline starting from birth minus elapsed.
  const birthMs = Date.UTC(
    Number(input.date.slice(0, 4)),
    Number(input.date.slice(5, 7)) - 1,
    Number(input.date.slice(8, 10)),
  );
  const elapsedYears = (1 - fractionRemaining) * lordYears;
  const startLordIdx = DASHA_SEQ.findIndex(([l]) => l === moonNakLord);

  const timeline: { lord: string; startDate: string; endDate: string }[] = [];
  let cursor = birthMs - elapsedYears * 365.2425 * 86_400_000;
  for (let i = 0; i < 9; i++) {
    const [lord, years] = DASHA_SEQ[(startLordIdx + i) % DASHA_SEQ.length];
    const end = cursor + years * 365.2425 * 86_400_000;
    timeline.push({
      lord,
      startDate: new Date(cursor).toISOString().slice(0, 10),
      endDate: new Date(end).toISOString().slice(0, 10),
    });
    cursor = end;
  }

  const now = Date.now();
  const currentMaha =
    timeline.find(
      (t) =>
        now >= Date.parse(t.startDate) && now < Date.parse(t.endDate),
    ) || timeline[0];
  const currentAntara = computeAntardasha(currentMaha, now);

  return {
    input,
    jdUT,
    ascendant: {
      longitude: ascLon,
      sign: SIGNS[ascSignIdx],
      signIndex: ascSignIdx,
    },
    planets,
    moonNakshatra: {
      name: NAKSHATRAS[moonNakIdx],
      index: moonNakIdx,
      lord: moonNakLord,
    },
    dashaBalance: { lord: moonNakLord, yearsRemaining },
    dashaTimeline: timeline,
    currentDasha: { maha: currentMaha.lord, antara: currentAntara },
    ayanamsa,
  };
}

function buildPlanet(name: string, lon: number, speed: number): PlanetPosition {
  const L = ((lon % 360) + 360) % 360;
  const signIndex = Math.floor(L / 30);
  const degreeInSign = L - signIndex * 30;
  const nakspan = 360 / 27;
  const nakIndex = Math.floor(L / nakspan);
  return {
    name,
    longitude: L,
    sign: SIGNS[signIndex],
    signIndex,
    degreeInSign,
    nakshatra: NAKSHATRAS[nakIndex],
    nakshatraIndex: nakIndex,
    retrograde: speed < 0,
  };
}

/** Sub-period (antardasha) inside the current mahadasha. */
function computeAntardasha(
  maha: { lord: string; startDate: string; endDate: string },
  nowMs: number,
): string {
  const startIdx = DASHA_SEQ.findIndex(([l]) => l === maha.lord);
  const mahaYears = DASHA_SEQ[startIdx][1];
  const mahaStart = Date.parse(maha.startDate);
  let cursor = mahaStart;
  for (let i = 0; i < DASHA_SEQ.length; i++) {
    const [lord, years] = DASHA_SEQ[(startIdx + i) % DASHA_SEQ.length];
    const subYears = (years * mahaYears) / 120;
    const end = cursor + subYears * 365.2425 * 86_400_000;
    if (nowMs >= cursor && nowMs < end) return lord;
    cursor = end;
  }
  return maha.lord;
}
