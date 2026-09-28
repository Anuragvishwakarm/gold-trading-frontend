import type { CandleInterval } from "@/types/market";

type BacktestSignal = "buy" | "sell";
type BacktestResult = "win" | "loss" | "pending";

export interface DirectionSummary {
  signal: BacktestSignal;
  total: number;
  evaluated: number;
  wins: number;
  losses: number;
  pending: number;
  win_rate: number | null;
}

export interface BacktestSignalResult {
  signal_time: string;
  evaluation_time: string | null;
  signal: BacktestSignal;
  result: BacktestResult;
  entry_price: number;
  exit_price: number | null;
  price_change: number | null;
  price_change_percent: number | null;
  directional_return_percent: number | null;
  reasons: string[];
}

export interface BacktestSummary {
  instrument_key: string;
  trading_symbol: string | null;
  interval: CandleInterval;
  horizon_minutes: number;
  horizon_candles: number;
  minimum_move_percent: number;
  analysis_start: string;
  analysis_end: string;
  candles_analyzed: number;
  signal_snapshots: number;
  neutral_snapshots: number;
  total_signals: number;
  evaluated_signals: number;
  winning_signals: number;
  losing_signals: number;
  pending_signals: number;
  win_rate: number | null;
  average_directional_return_percent: number | null;
  buy: DirectionSummary;
  sell: DirectionSummary;
  recent_results: BacktestSignalResult[];
}
