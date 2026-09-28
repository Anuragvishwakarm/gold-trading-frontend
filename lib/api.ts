import type {
  Candle,
  CandleInterval,
  DashboardData,
  Instrument,
  MarketTick,
} from "@/types/market";
import type { TechnicalAnalytics } from "@/types/analytics";
import type { BacktestSummary } from "@/types/backtest";
import { getTimeframe } from "@/lib/timeframes";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8000/api/v1";

class APIError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
  }
}

interface RequestOptions {
  allowNotFound?: boolean;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T | null> {
  const { allowNotFound = false } = options;
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 10000);

  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      cache: "no-store",
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });

    if (allowNotFound && response.status === 404) return null;
    if (!response.ok) {
      let message = `API request failed (${response.status})`;
      try {
        const body = (await response.json()) as { detail?: unknown };
        if (typeof body.detail === "string") message = body.detail;
      } catch {
        // Keep the HTTP fallback message.
      }
      throw new APIError(message, response.status);
    }
    return (await response.json()) as T;
  } finally {
    window.clearTimeout(timeout);
  }
}

/** Adds `instrument_key` (URL-encoded, it contains "|") when a contract is chosen. */
function withContract(path: string, instrumentKey?: string | null): string {
  if (!instrumentKey) return path;
  const separator = path.includes("?") ? "&" : "?";
  return `${path}${separator}instrument_key=${encodeURIComponent(instrumentKey)}`;
}

/** Collected GOLD futures that have not expired, nearest expiry first. */
export async function fetchInstruments(): Promise<Instrument[]> {
  return (await request<Instrument[]>("/market/instruments")) ?? [];
}

/** Analytics are optional: long timeframes may not have 50 candles yet. */
async function optional<T>(promise: Promise<T | null>): Promise<T | null> {
  try {
    return await promise;
  } catch {
    return null;
  }
}

export async function fetchDashboardData(
  interval: CandleInterval,
  instrumentKey?: string | null,
): Promise<DashboardData> {
  const { limit } = getTimeframe(interval);
  const c = (path: string) => withContract(path, instrumentKey);
  const [instrument, latestTick, ticks, candles, analytics] = await Promise.all([
    request<Instrument>(c("/market/instrument"), { allowNotFound: true }),
    request<MarketTick>(c("/market/ticks/latest"), { allowNotFound: true }),
    request<MarketTick[]>(c("/market/ticks?limit=25")),
    request<Candle[]>(c(`/market/candles?interval=${interval}&limit=${limit}`)),
    optional(
      request<TechnicalAnalytics>(c(`/analytics/indicators?interval=${interval}&limit=500`), {
        allowNotFound: true,
      }),
    ),
  ]);

  return {
    instrument,
    latestTick,
    ticks: ticks ?? [],
    candles: candles ?? [],
    analytics,
  };
}

/** Plain candle list, oldest first. */
export async function fetchCandles(
  interval: CandleInterval,
  limit: number,
  instrumentKey?: string | null,
): Promise<Candle[]> {
  const path = withContract(`/market/candles?interval=${interval}&limit=${limit}`, instrumentKey);
  return (await request<Candle[]>(path)) ?? [];
}

export async function checkAPIHealth(): Promise<boolean> {
  try {
    const response = await request<{ status: string }>("/health/live");
    return response?.status === "ok";
  } catch {
    return false;
  }
}

export async function fetchBacktestSummary(
  interval: CandleInterval,
  instrumentKey?: string | null,
): Promise<BacktestSummary | null> {
  const { backtestHorizon } = getTimeframe(interval);
  return request<BacktestSummary>(
    withContract(
      `/backtest/summary?interval=${interval}&horizon=${backtestHorizon}&limit=1000&recent_limit=20`,
      instrumentKey,
    ),
    { allowNotFound: true },
  );
}

/** WebSocket URL for live ticks + the current candle of `interval`. */
export function streamUrl(interval: CandleInterval, instrumentKey?: string | null): string {
  const url = new URL(`${API_BASE_URL}/market/stream`, window.location.href);
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  url.searchParams.set("interval", interval);
  if (instrumentKey) url.searchParams.set("instrument_key", instrumentKey);
  return url.toString();
}
