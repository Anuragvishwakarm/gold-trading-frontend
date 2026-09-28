/**
 * Time helpers for the 3-day (Kitco-style) chart.
 *
 * Everything is expressed as "minutes since 00:00 IST" on a given IST date,
 * so three different days can be drawn on one shared time-of-day axis.
 * Session times are converted from each market's own time zone with Intl,
 * so daylight-saving changes in London / New York / Sydney are handled.
 */

const IST_OFFSET_MINUTES = 330;
const DAY_MINUTES = 24 * 60;

/** IST calendar date (YYYY-MM-DD) of an instant. */
export function istDateKey(date: Date): string {
  const shifted = new Date(date.getTime() + IST_OFFSET_MINUTES * 60_000);
  return shifted.toISOString().slice(0, 10);
}

/** Minutes since 00:00 IST for an instant (0–1439). */
export function istMinuteOfDay(date: Date): number {
  const shifted = new Date(date.getTime() + IST_OFFSET_MINUTES * 60_000);
  return shifted.getUTCHours() * 60 + shifted.getUTCMinutes() + shifted.getUTCSeconds() / 60;
}

/** UTC offset of `timeZone` at `instant`, in minutes. */
function zoneOffsetMinutes(timeZone: string, instant: number): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).formatToParts(new Date(instant));
  const get = (type: string) => Number(parts.find((part) => part.type === type)?.value);
  const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"));
  return Math.round((asUtc - instant) / 60_000);
}

/** Instant of a local wall-clock time in `timeZone` on `dateKey`. */
function zonedTimeToInstant(dateKey: string, hour: number, minute: number, timeZone: string): number {
  const [year, month, day] = dateKey.split("-").map(Number);
  const guess = Date.UTC(year, month - 1, day, hour, minute);
  const offset = zoneOffsetMinutes(timeZone, guess);
  const first = guess - offset * 60_000;
  // Second pass fixes the rare case where the guess sits across a DST switch.
  const corrected = zoneOffsetMinutes(timeZone, first);
  return guess - corrected * 60_000;
}

/** IST minute-of-day for a wall-clock time in another zone (can be <0 or >1440). */
function toIstMinutes(dateKey: string, hour: number, minute: number, timeZone: string): number {
  const instant = zonedTimeToInstant(dateKey, hour, minute, timeZone);
  const istMidnight = Date.parse(`${dateKey}T00:00:00+05:30`);
  return (instant - istMidnight) / 60_000;
}

interface MarketSession {
  name: string;
  /** Minutes since 00:00 IST on the chart day. */
  start: number;
  end: number;
  /** Lane (row) under the chart so overlapping sessions don't collide. */
  lane: 0 | 1 | 2;
}

/**
 * Main gold trading sessions for one IST date, in IST minutes.
 * Shanghai = SGE day + night session, London = LBMA/OTC day,
 * New York = COMEX pit hours, Sydney = local day.
 */
export function goldSessions(dateKey: string): MarketSession[] {
  // Lane 0: Sydney → London, lane 1: Shanghai day + night, lane 2: New York.
  const sessions: MarketSession[] = [
    { name: "Sydney", start: toIstMinutes(dateKey, 10, 0, "Australia/Sydney"), end: toIstMinutes(dateKey, 16, 0, "Australia/Sydney"), lane: 0 },
    { name: "London", start: toIstMinutes(dateKey, 8, 0, "Europe/London"), end: toIstMinutes(dateKey, 17, 0, "Europe/London"), lane: 0 },
    { name: "Shanghai", start: toIstMinutes(dateKey, 9, 0, "Asia/Shanghai"), end: toIstMinutes(dateKey, 15, 30, "Asia/Shanghai"), lane: 1 },
    { name: "Shanghai night", start: toIstMinutes(dateKey, 20, 0, "Asia/Shanghai"), end: toIstMinutes(dateKey, 20, 0, "Asia/Shanghai") + 390, lane: 1 },
    { name: "New York", start: toIstMinutes(dateKey, 8, 20, "America/New_York"), end: toIstMinutes(dateKey, 13, 30, "America/New_York"), lane: 2 },
  ];
  return sessions.map((session) => ({
    ...session,
    start: Math.max(0, Math.min(DAY_MINUTES, session.start)),
    end: Math.max(0, Math.min(DAY_MINUTES, session.end)),
  }));
}

/** "14:30" for a minute-of-day. */
export function formatMinutes(minutes: number): string {
  const wrapped = ((Math.round(minutes) % DAY_MINUTES) + DAY_MINUTES) % DAY_MINUTES;
  const hours = Math.floor(wrapped / 60);
  const mins = wrapped % 60;
  return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
}

/** GMT clock time for an IST minute-of-day. */
export function istToGmtLabel(minutes: number): string {
  return formatMinutes(minutes - IST_OFFSET_MINUTES);
}
