import type { CandleInterval } from "@/types/market";

interface TimeframeOption {
  value: CandleInterval;
  /** Short label for the selector button. */
  label: string;
  /** Long label for headings. */
  title: string;
  /** Candles requested from the API (enough history for SMA/EMA 200). */
  limit: number;
  /** Whether the axis should show the time of day. */
  intraday: boolean;
  /** Backtest horizon for signals on this timeframe, in minutes. */
  backtestHorizon: number;
}

/** Timeframes shown on the chart, in selector order. */
export const TIMEFRAMES: TimeframeOption[] = [
  { value: "15m", label: "15m", title: "15 Minutes", limit: 1000, intraday: true, backtestHorizon: 60 },
  { value: "30m", label: "30m", title: "30 Minutes", limit: 1000, intraday: true, backtestHorizon: 120 },
  { value: "1h", label: "1H", title: "1 Hour", limit: 1000, intraday: true, backtestHorizon: 240 },
  { value: "4h", label: "4H", title: "4 Hours", limit: 1000, intraday: true, backtestHorizon: 960 },
  { value: "1d", label: "1D", title: "1 Day", limit: 1000, intraday: false, backtestHorizon: 1440 * 5 },
  { value: "1w", label: "1W", title: "1 Week", limit: 520, intraday: false, backtestHorizon: 10080 * 4 },
  { value: "1mo", label: "1M", title: "1 Month", limit: 240, intraday: false, backtestHorizon: 43200 * 3 },
];

export const DEFAULT_TIMEFRAME: CandleInterval = "15m";

export function getTimeframe(value: CandleInterval): TimeframeOption {
  return TIMEFRAMES.find((item) => item.value === value) ?? TIMEFRAMES[0];
}
