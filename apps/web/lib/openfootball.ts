const SOURCE_URL =
  "https://raw.githubusercontent.com/openfootball/worldcup.json/master/2026/worldcup.json";

export type OfMatch = {
  round: string;
  date: string;       // YYYY-MM-DD
  time: string;       // "13:00 UTC-6"
  team1: string;
  team2: string;
  group?: string;
  ground?: string;
  score?: {
    ht?: [number, number];
    ft?: [number, number];
    et?: [number, number];
    p?: [number, number];
  };
};

export type OfData = { name: string; matches: OfMatch[] };

export async function fetchWorldCupData(): Promise<OfData> {
  const res = await fetch(SOURCE_URL, { cache: "no-store" });
  if (!res.ok) throw new Error(`openfootball ${res.status}`);
  return res.json();
}

/** Parse "13:00 UTC-6" + "2026-06-11" → Date in UTC. */
export function parseKickoff(date: string, time: string): Date {
  const tzMatch = time.match(/UTC([+-]\d+(?::\d+)?)/i);
  const offset: string = tzMatch?.[1] ?? "+00";
  const timePart: string = time.split(/\s+/)[0] ?? "00:00";
  const parts = timePart.split(":");
  const h: string = parts[0] ?? "00";
  const m: string = parts[1] ?? "00";
  // Normalise sign/hours/mins from e.g. "-6", "+5:30", "+00"
  const sign: string = offset[0] ?? "+";
  const absPart: string = offset.slice(1); // "6", "5:30", "00"
  const absParts = absPart.split(":");
  const hours: string = (absParts[0] ?? "00").padStart(2, "0");
  const mins: string = absParts[1] ?? "00";
  const isoOffset = `${sign}${hours}:${mins}`;
  // Build ISO: "2026-06-11T13:00:00-06:00"
  return new Date(`${date}T${h.padStart(2, "0")}:${m.padStart(2, "0")}:00${isoOffset}`);
}
