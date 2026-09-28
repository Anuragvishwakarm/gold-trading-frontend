import type { TechnicalAnalytics } from "@/types/analytics";

export interface Instrument {
  id: string;
  instrument_key: string;
  trading_symbol: string | null;
  underlying_symbol: string | null;
  name: string | null;
  segment: string;
  instrument_type: string;
  expiry: string | number | null;
  lot_size: number | null;
  tick_size: number | null;
}

export interface MarketTick {
  id: string;
  instrument_key: string;
  trading_symbol: string | null;
  underlying_symbol: string | null;
  received_at: string;
  feed_timestamp: string | null;
  last_traded_at: string | null;
  ltp: number;
  close_price: number | null;
  last_traded_quantity: number | null;
  average_traded_price: number | null;
  volume_traded_today: number | null;
  open_interest: number | null;
  total_buy_quantity: number | null;
  total_sell_quantity: number | null;
  best_bid_price: number | null;
  best_bid_quantity: number | null;
  best_ask_price: number | null;
  best_ask_quantity: number | null;
}

export interface Candle {
  id: string;
  instrument_key: string;
  trading_symbol: string | null;
  underlying_symbol: string;
  interval: string;
  minute: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number | null;
  cumulative_volume: number | null;
  open_interest: number | null;
  tick_count: number;
  updated_at: string;
}

/**
 * Chart timeframes served by the backend.
 * `1mo` is one month (kept distinct from `1m`, one minute).
 */
export type CandleInterval =
  | "1m"
  | "5m"
  | "15m"
  | "30m"
  | "1h"
  | "4h"
  | "1d"
  | "1w"
  | "1mo";

/** Messages pushed by `WS /api/v1/market/stream`. */
export type StreamMessage =
  | {
      type: "snapshot" | "update";
      interval: CandleInterval;
      tick: MarketTick;
      candle: Candle | null;
    }
  | { type: "heartbeat"; server_time: string }
  | { type: "error"; detail: string };

export type LiveStatus = "connecting" | "live" | "reconnecting" | "offline";

export interface DashboardData {
  instrument: Instrument | null;
  latestTick: MarketTick | null;
  ticks: MarketTick[];
  candles: Candle[];
  analytics: TechnicalAnalytics | null;
}
