// mockSlots.ts — deterministic slot generation. No backend, no Math.random at
// render: a seeded PRNG keeps the demo stable across reloads and screenshots.
// Slots are real UTC instants; the booker-local working window is carved out of
// a 48h sweep so host-local times roll across midnight naturally.

import type { Slot } from "./formatters";

function hashSeed(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number): () => number {
  let a = seed;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function bookerHour(instant: string, tz: string): number {
  return parseInt(
    new Intl.DateTimeFormat("en-US", { timeZone: tz, hour: "numeric", hourCycle: "h23" })
      .formatToParts(new Date(instant))
      .find((p) => p.type === "hour")?.value ?? "0",
    10,
  );
}

function bookerYMD(instant: string, tz: string): string {
  const p = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(instant));
  const g = (t: string) => p.find((x) => x.type === t)?.value ?? "";
  return `${g("year")}-${g("month")}-${g("day")}`;
}

export interface GenerateOpts {
  bookerTz: string;
  hostTz: string;
  startHour?: number; // booker-local inclusive
  endHour?: number; // booker-local exclusive
  stepMin?: number;
}

/** Slots whose BOOKER-local time falls in [startHour,endHour) on dayISO (YYYY-MM-DD). */
export function generateSlots(dayISO: string, opts: GenerateOpts): Slot[] {
  const { bookerTz, startHour = 8, endHour = 22, stepMin = 30 } = opts;
  const base = new Date(`${dayISO}T00:00:00Z`).getTime();
  const rand = mulberry32(hashSeed(dayISO + bookerTz));
  const out: Slot[] = [];
  // Sweep minute offsets from 12h before to 36h after UTC midnight to capture
  // the whole booker-local day regardless of the booker's UTC offset.
  for (let min = -12 * 60; min <= 36 * 60; min += stepMin) {
    const instant = new Date(base + min * 60 * 1000).toISOString();
    if (bookerYMD(instant, bookerTz) !== dayISO) continue;
    const h = bookerHour(instant, bookerTz);
    if (h < startHour || h >= endHour) continue;
    // ~22% of slots are taken, deterministically, to exercise the disabled state.
    out.push({ instant, available: rand() > 0.22 });
  }
  // De-dupe + sort by instant (the sweep can revisit a wall-clock minute near DST).
  const seen = new Set<string>();
  return out
    .filter((s) => (seen.has(s.instant) ? false : (seen.add(s.instant), true)))
    .sort((a, b) => a.instant.localeCompare(b.instant));
}

// ── Demo fixtures ──────────────────────────────────────────────────────────
// Anchored to fixed dates so the prototype is deterministic. March 3 2026 is
// before both EU and US DST changes: Toronto EST (UTC-5), Berlin CET (UTC+1),
// a clean 6h gap that produces an evening -> next-morning host rollover.

export const DEMO_DAYS = [
  { iso: "2026-03-02", label: "Mon 2" },
  { iso: "2026-03-03", label: "Tue 3" },
  { iso: "2026-03-04", label: "Wed 4" },
  { iso: "2026-03-05", label: "Thu 5", empty: true }, // no availability
  { iso: "2026-03-06", label: "Fri 6" },
];

export const EMPTY_DAYS = new Set(DEMO_DAYS.filter((d) => d.empty).map((d) => d.iso));

export const NEXT_AVAILABLE_AFTER: Record<string, string> = {
  "2026-03-05": "2026-03-06",
};

export interface ZoneFixture {
  key: string;
  label: string;
  bookerTz: string;
  hostTz: string;
  note: string;
}

export const ZONE_FIXTURES: ZoneFixture[] = [
  {
    key: "berlin",
    label: "Toronto → Berlin",
    bookerTz: "America/Toronto",
    hostTz: "Europe/Berlin",
    note: "6h gap — evening slots roll into the host's next day",
  },
  {
    key: "kolkata",
    label: "Toronto → Kolkata",
    bookerTz: "America/Toronto",
    hostTz: "Asia/Kolkata",
    note: "+5:30 — proves half-hour offsets are handled, not rounded",
  },
  {
    key: "same",
    label: "Toronto → Toronto",
    bookerTz: "America/Toronto",
    hostTz: "America/Toronto",
    note: "equal offset — collapses to a clean single-timezone list",
  },
];
