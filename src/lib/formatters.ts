// formatters.ts — the timezone engine.
// Every visible and spoken time derives from ONE absolute instant (ISO UTC),
// formatted through Intl.DateTimeFormat per IANA zone. No stored offsets, so
// DST and half-hour zones (e.g. Asia/Kolkata +5:30) are always correct.

export type HourCycle = "h12" | "h23";

export interface Slot {
  /** Absolute instant, ISO UTC, e.g. "2026-03-03T13:00:00.000Z" */
  instant: string;
  available: boolean;
}

export type DayRelation = "same" | "next" | "previous";

/** A time-of-day formatter for one zone + hour cycle. */
export function buildFormatter(tz: string, hourCycle: HourCycle): Intl.DateTimeFormat {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hour: "numeric",
    minute: "2-digit",
    hourCycle,
  });
}

export function formatTime(instant: string, fmt: Intl.DateTimeFormat): string {
  return fmt.format(new Date(instant));
}

/** Short zone abbreviation for an instant, e.g. "EST", "CET", "IST". */
export function zoneAbbrev(instant: string, tz: string): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    timeZoneName: "short",
  }).formatToParts(new Date(instant));
  return parts.find((p) => p.type === "timeZoneName")?.value ?? "";
}

/**
 * Signed offset from UTC in minutes for an instant, parsed from the
 * "shortOffset" part ("GMT-5", "GMT+5:30", "GMT"). DST- and half-hour-correct.
 */
export function offsetMinutes(instant: string, tz: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    timeZoneName: "shortOffset",
  }).formatToParts(new Date(instant));
  const raw = parts.find((p) => p.type === "timeZoneName")?.value ?? "GMT";
  const m = raw.match(/GMT([+-])(\d{1,2})(?::(\d{2}))?/);
  if (!m) return 0; // bare "GMT" === UTC
  const sign = m[1] === "-" ? -1 : 1;
  const hours = parseInt(m[2], 10);
  const mins = m[3] ? parseInt(m[3], 10) : 0;
  return sign * (hours * 60 + mins);
}

/** City label from an IANA id: "America/Toronto" -> "Toronto". */
export function cityOf(tz: string): string {
  const seg = tz.split("/").pop() ?? tz;
  return seg.replace(/_/g, " ");
}

export interface RelativeInfo {
  minutes: number; // host offset - booker offset, at this instant
  zonesDiffer: boolean;
  /** e.g. "Berlin is 6 hours ahead" | "Kolkata is 9 hours 30 minutes ahead" */
  phrase: string;
}

export function relativeInfo(
  instant: string,
  bookerTz: string,
  hostTz: string,
): RelativeInfo {
  const minutes = offsetMinutes(instant, hostTz) - offsetMinutes(instant, bookerTz);
  if (minutes === 0) {
    return { minutes: 0, zonesDiffer: false, phrase: "" };
  }
  const dir = minutes > 0 ? "ahead" : "behind";
  const abs = Math.abs(minutes);
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  const hPart = h > 0 ? `${h} hour${h === 1 ? "" : "s"}` : "";
  const mPart = m > 0 ? `${m} minute${m === 1 ? "" : "s"}` : "";
  const amount = [hPart, mPart].filter(Boolean).join(" ");
  return {
    minutes,
    zonesDiffer: true,
    phrase: `${cityOf(hostTz)} is ${amount} ${dir}`,
  };
}

interface DayParts {
  y: number;
  m: number;
  d: number;
}

export function dayParts(instant: string, tz: string): DayParts {
  const p = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    year: "numeric",
    month: "numeric",
    day: "numeric",
  }).formatToParts(new Date(instant));
  const get = (t: string) => parseInt(p.find((x) => x.type === t)?.value ?? "0", 10);
  return { y: get("year"), m: get("month"), d: get("day") };
}

/** -1 | 0 | +1 : host calendar day relative to booker calendar day. */
export function dayDelta(instant: string, bookerTz: string, hostTz: string): number {
  const b = dayParts(instant, bookerTz);
  const h = dayParts(instant, hostTz);
  const bn = b.y * 10000 + b.m * 100 + b.d;
  const hn = h.y * 10000 + h.m * 100 + h.d;
  return Math.sign(hn - bn);
}

export function dayRelation(delta: number): DayRelation {
  return delta > 0 ? "next" : delta < 0 ? "previous" : "same";
}

const RELATION_WORD: Record<DayRelation, string> = {
  same: "same day",
  next: "next day",
  previous: "previous day",
};

/** Full weekday + month + day for an instant in a zone, e.g. "Tuesday, March 3". */
export function longDate(instant: string, tz: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(new Date(instant));
}

/** Short host date for the day-divider, e.g. "Wed, Mar 4". */
export function shortDate(instant: string, tz: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(new Date(instant));
}

/**
 * The authoritative accessible name for a slot. The visual UI only abbreviates
 * this; a screen reader hears one unambiguous string with no double-read.
 */
export function composeLabel(
  slot: Slot,
  opts: {
    bookerTz: string;
    hostTz: string;
    bookerFmt: Intl.DateTimeFormat;
    hostFmt: Intl.DateTimeFormat;
    effectiveDual: boolean;
  },
): string {
  const { bookerTz, hostTz, bookerFmt, hostFmt, effectiveDual } = opts;
  const bookerTime = formatTime(slot.instant, bookerFmt);
  const bookerDate = longDate(slot.instant, bookerTz);
  let label = `${bookerTime} ${bookerDate} your time`;
  if (effectiveDual) {
    const hostTime = formatTime(slot.instant, hostFmt);
    const rel = RELATION_WORD[dayRelation(dayDelta(slot.instant, bookerTz, hostTz))];
    label += `, ${hostTime} host time in ${cityOf(hostTz)}, ${rel}`;
  }
  if (!slot.available) label += ", unavailable";
  return label;
}

export type Period = "Morning" | "Afternoon" | "Evening";

/** Period bucket from the booker-local hour (0-23). */
export function periodOf(instant: string, bookerTz: string): Period {
  const h = parseInt(
    new Intl.DateTimeFormat("en-US", {
      timeZone: bookerTz,
      hour: "numeric",
      hourCycle: "h23",
    })
      .formatToParts(new Date(instant))
      .find((p) => p.type === "hour")?.value ?? "0",
    10,
  );
  if (h < 12) return "Morning";
  if (h < 17) return "Afternoon";
  return "Evening";
}
