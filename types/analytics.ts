import type { CandleInterval } from "@/types/market";

export type MarketTrend = "bullish" | "bearish" | "sideways";
export type TechnicalSignal = "buy" | "sell" | "neutral";

export interface TechnicalAnalytics {
  instrument_key: string;
  trading_symbol: string | null;
  interval: CandleInterval;
  candle_time: string;
  candles_used: number;
  minimum_candles: number;
  sufficient_data: boolean;
  close: number;
  ema_9: number;
  ema_21: number;
  ema_50: number;
  rsi_14: number | null;
  macd: number;
  macd_signal: number;
  macd_histogram: number;
  bollinger_upper: number | null;
  bollinger_middle: number | null;
  bollinger_lower: number | null;
  atr_14: number | null;
  volume_change_percent: number | null;
  open_interest_change_percent: number | null;
  trend: MarketTrend;
  signal: TechnicalSignal;
  reasons: string[];
}
