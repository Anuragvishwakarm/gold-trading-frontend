"use client";

import {
  CheckCircle2,
  Clock3,
  FlaskConical,
  RefreshCw,
  Target,
  TrendingDown,
  TrendingUp,
  XCircle,
} from "lucide-react";

import type { BacktestSummary } from "@/types/backtest";
import type { CandleInterval } from "@/types/market";


const numberFormatter = new Intl.NumberFormat("en-IN", {
  maximumFractionDigits: 2,
});

function percent(value: number | null | undefined) {
  return value == null ? "—" : `${numberFormatter.format(value)}%`;
}

function signedPercent(value: number | null | undefined) {
  if (value == null) return "—";
  return `${value > 0 ? "+" : ""}${numberFormatter.format(value)}%`;
}

function price(value: number | null | undefined) {
  return value == null ? "—" : `₹${numberFormatter.format(value)}`;
}

function dateTime(value: string | null | undefined) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

interface BacktestPanelProps {
  summary: BacktestSummary | null;
  interval: CandleInterval;
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
}

export function BacktestPanel({
  summary,
  interval,
  loading,
  error,
  onRefresh,
}: BacktestPanelProps) {
  return (
    <section className={`panel backtest-panel${loading ? " panel-loading" : ""}`}>
      <div className="panel-header backtest-header">
        <div>
          <p className="eyebrow">Signal validation · {interval}</p>
          <h3>Historical backtest</h3>
        </div>
        <div className="backtest-actions">
          <span className="backtest-horizon">
            <Clock3 size={13} />
            {summary ? `${summary.horizon_minutes} min outcome` : "Historical outcome"}
          </span>
          <button
            className="backtest-refresh"
            type="button"
            onClick={onRefresh}
            disabled={loading}
            aria-label="Refresh backtest"
          >
            <RefreshCw className={loading ? "spin" : ""} size={15} />
          </button>
        </div>
      </div>

      {error ? (
        <div className="backtest-empty error">Backtest unavailable: {error}</div>
      ) : !summary ? (
        <div className="backtest-empty">
          {loading ? "Analysing historical Gold signals…" : "No backtest data available."}
        </div>
      ) : (
        <>
          <div className="backtest-metrics">
            <BacktestMetric icon={<Target />} label="Overall accuracy" value={percent(summary.win_rate)} detail={`${summary.evaluated_signals} evaluated`} tone="gold" />
            <BacktestMetric icon={<CheckCircle2 />} label="Wins" value={numberFormatter.format(summary.winning_signals)} detail={`${summary.losing_signals} losses`} tone="positive" />
            <BacktestMetric icon={<TrendingUp />} label="BUY accuracy" value={percent(summary.buy.win_rate)} detail={`${summary.buy.evaluated} evaluated`} tone="positive" />
            <BacktestMetric icon={<TrendingDown />} label="SELL accuracy" value={percent(summary.sell.win_rate)} detail={`${summary.sell.evaluated} evaluated`} tone="negative" />
            <BacktestMetric icon={<Clock3 />} label="Pending" value={numberFormatter.format(summary.pending_signals)} detail={`${summary.neutral_snapshots} neutral`} />
          </div>

          <div className="backtest-table-wrap">
            <div className="backtest-subheader">
              <div><FlaskConical size={14} /><strong>Recent evaluated signals</strong></div>
              <span>{summary.candles_analyzed} candles analysed</span>
            </div>
            <div className="table-scroll">
              <table className="backtest-table">
                <thead>
                  <tr><th>Signal time</th><th>Signal</th><th>Entry</th><th>Exit</th><th>Directional move</th><th>Result</th></tr>
                </thead>
                <tbody>
                  {summary.recent_results.length === 0 ? (
                    <tr><td colSpan={6} className="empty-row">No BUY or SELL signals found in this candle range.</td></tr>
                  ) : summary.recent_results.slice(0, 10).map((result) => (
                    <tr key={`${result.signal_time}-${result.signal}`}>
                      <td>{dateTime(result.signal_time)}</td>
                      <td><span className={`backtest-signal ${result.signal}`}>{result.signal.toUpperCase()}</span></td>
                      <td>{price(result.entry_price)}</td>
                      <td>{price(result.exit_price)}</td>
                      <td className={(result.directional_return_percent ?? 0) > 0 ? "positive" : result.directional_return_percent == null ? "" : "negative"}>{signedPercent(result.directional_return_percent)}</td>
                      <td><span className={`backtest-result ${result.result}`}>{result.result === "win" ? <CheckCircle2 size={12} /> : result.result === "loss" ? <XCircle size={12} /> : <Clock3 size={12} />}{result.result.toUpperCase()}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="backtest-footer">
            <span>Average directional return · {signedPercent(summary.average_directional_return_percent)}</span>
            <strong>Historical performance does not guarantee future results</strong>
          </div>
        </>
      )}
    </section>
  );
}

function BacktestMetric({
  icon,
  label,
  value,
  detail,
  tone = "neutral",
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  detail: string;
  tone?: "neutral" | "gold" | "positive" | "negative";
}) {
  return (
    <article className="backtest-metric">
      <span className={`backtest-metric-icon ${tone}`}>{icon}</span>
      <div><small>{label}</small><strong className={tone}>{value}</strong><span>{detail}</span></div>
    </article>
  );
}
