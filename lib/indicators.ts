/**
 * Moving averages drawn on the chart.
 *
 * Both are computed on candle closes, the same way TradingView does:
 * - SMA: simple average of the last N closes.
 * - EMA: seeded with the SMA of the first N closes, then
 *   EMA = close * k + previousEMA * (1 - k), where k = 2 / (N + 1).
 */

export type MovingAverageKind = "sma" | "ema";
type MovingAveragePeriod = 20 | 50 | 100 | 200;

export interface MovingAverageLine {
  id: `${MovingAverageKind}-${MovingAveragePeriod}`;
  kind: MovingAverageKind;
  period: MovingAveragePeriod;
  label: string;
  color: string;
}

export const MA_PERIODS: MovingAveragePeriod[] = [20, 50, 100, 200];

/** One color per period; SMA is drawn solid and EMA dashed. */
const MA_PERIOD_COLORS: Record<MovingAveragePeriod, string> = {
  20: "#ffd166",
  50: "#4cc9f0",
  100: "#b388ff",
  200: "#ff7a59",
};

export const MA_LINES: MovingAverageLine[] = (["sma", "ema"] as const).flatMap((kind) =>
  MA_PERIODS.map((period) => ({
    id: `${kind}-${period}` as const,
    kind,
    period,
    label: `${kind.toUpperCase()} ${period}`,
    color: MA_PERIOD_COLORS[period],
  })),
);

export type MovingAverageId = MovingAverageLine["id"];

export const DEFAULT_MA_SELECTION: MovingAverageId[] = ["ema-20", "ema-50", "sma-200"];

function sma(values: number[], period: number): (number | null)[] {
  const result: (number | null)[] = new Array(values.length).fill(null);
  if (period <= 0) return result;
  let sum = 0;
  for (let index = 0; index < values.length; index += 1) {
    sum += values[index];
    if (index >= period) sum -= values[index - period];
    if (index >= period - 1) result[index] = sum / period;
  }
  return result;
}

function ema(values: number[], period: number): (number | null)[] {
  const result: (number | null)[] = new Array(values.length).fill(null);
  if (period <= 0 || values.length < period) return result;
  const k = 2 / (period + 1);
  let previous = values.slice(0, period).reduce((total, value) => total + value, 0) / period;
  result[period - 1] = previous;
  for (let index = period; index < values.length; index += 1) {
    previous = values[index] * k + previous * (1 - k);
    result[index] = previous;
  }
  return result;
}

export function movingAverage(kind: MovingAverageKind, values: number[], period: number) {
  return kind === "sma" ? sma(values, period) : ema(values, period);
}

/* ------------------------------------------------------------------ */
/* Helpers that turn MA numbers into something a trader can read       */
/* ------------------------------------------------------------------ */

interface Crossover {
  index: number;
  direction: "up" | "down";
}

/**
 * Bars where the faster line crosses the slower one.
 * "up"  = fast moves above slow (bullish), "down" = fast drops below (bearish).
 */
export function findCrossovers(fast: (number | null)[], slow: (number | null)[]): Crossover[] {
  const result: Crossover[] = [];
  let previousDiff: number | null = null;
  for (let index = 0; index < fast.length; index += 1) {
    const f = fast[index];
    const s = slow[index];
    if (f == null || s == null) continue;
    const diff = f - s;
    if (previousDiff != null) {
      if (previousDiff <= 0 && diff > 0) result.push({ index, direction: "up" });
      else if (previousDiff >= 0 && diff < 0) result.push({ index, direction: "down" });
    }
    previousDiff = diff;
  }
  return result;
}

/** Fastest and slowest of the selected lines (EMA counts as faster at equal period). */
export function crossoverPair(lines: MovingAverageLine[]) {
  if (lines.length < 2) return null;
  const speed = (line: MovingAverageLine) => line.period * 2 + (line.kind === "ema" ? 0 : 1);
  const sorted = [...lines].sort((a, b) => speed(a) - speed(b));
  return { fast: sorted[0], slow: sorted[sorted.length - 1] };
}

type TrendState = "bullish" | "bearish" | "mixed";

/** Price position against every MA that has a value. */
export function trendAgainst(price: number, values: (number | null | undefined)[]) {
  const known = values.filter((value): value is number => value != null);
  const above = known.filter((value) => price > value).length;
  const state: TrendState =
    known.length === 0 ? "mixed" : above === known.length ? "bullish" : above === 0 ? "bearish" : "mixed";
  return { state, above, total: known.length };
}
