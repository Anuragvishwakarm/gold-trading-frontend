"use client";

import {
  Activity,
  BarChart3,
  Gauge,
  MoveUpRight,
  ShieldAlert,
  TrendingUp,
} from "lucide-react";

import type { TechnicalAnalytics } from "@/types/analytics";
import type { CandleInterval } from "@/types/market";


const numberFormatter = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 });

function value(number: number | null | undefined) {
  return number == null ? "—" : numberFormatter.format(number);
}

function price(number: number | null | undefined) {
  return number == null ? "—" : `₹${numberFormatter.format(number)}`;
}

function percent(number: number | null | undefined) {
  if (number == null) return "—";
  return `${number > 0 ? "+" : ""}${numberFormatter.format(number)}%`;
}

interface AnalyticsPanelProps {
  analytics: TechnicalAnalytics | null;
  interval: CandleInterval;
  loading: boolean;
}

export function AnalyticsPanel({ analytics, interval, loading }: AnalyticsPanelProps) {
  const signal = analytics?.signal ?? "neutral";
  const trend = analytics?.trend ?? "sideways";

  return (
    <section className={`panel analytics-panel${loading ? " panel-loading" : ""}`}>
      <div className="panel-header analytics-header">
        <div>
          <p className="eyebrow">Technical analytics · {interval}</p>
          <h3>Indicator snapshot</h3>
        </div>
        <div className={`signal-badge ${signal}`}>
          <MoveUpRight size={15} />
          {signal.toUpperCase()}
        </div>
      </div>

      {!analytics ? (
        <div className="analytics-empty">Waiting for enough Gold candle data.</div>
      ) : (
        <>
          {!analytics.sufficient_data && (
            <div className="analytics-warning">
              <ShieldAlert size={15} />
              {analytics.candles_used}/{analytics.minimum_candles} candles available. Signal remains neutral until enough data is collected.
            </div>
          )}

          <div className="analytics-grid">
            <AnalyticsCard icon={<TrendingUp />} label="Market trend" value={trend.toUpperCase()} tone={trend} detail={`Close ${price(analytics.close)}`} />
            <AnalyticsCard icon={<Gauge />} label="RSI 14" value={value(analytics.rsi_14)} tone={analytics.rsi_14 != null && analytics.rsi_14 >= 70 ? "negative" : analytics.rsi_14 != null && analytics.rsi_14 <= 30 ? "positive" : "neutral"} detail="30 oversold · 70 overbought" />
            <AnalyticsCard icon={<Activity />} label="EMA 9 / 21 / 50" value={`${value(analytics.ema_9)} / ${value(analytics.ema_21)}`} detail={`EMA 50 · ${value(analytics.ema_50)}`} />
            <AnalyticsCard icon={<BarChart3 />} label="MACD / Signal" value={`${value(analytics.macd)} / ${value(analytics.macd_signal)}`} tone={analytics.macd_histogram >= 0 ? "positive" : "negative"} detail={`Histogram · ${value(analytics.macd_histogram)}`} />
            <AnalyticsCard icon={<MoveUpRight />} label="ATR 14" value={price(analytics.atr_14)} detail={`Bands ${price(analytics.bollinger_lower)} – ${price(analytics.bollinger_upper)}`} />
            <AnalyticsCard icon={<Activity />} label="Volume / OI change" value={`${percent(analytics.volume_change_percent)} / ${percent(analytics.open_interest_change_percent)}`} detail={`${analytics.candles_used} candles analysed`} />
          </div>

          <div className="analytics-footer">
            <span>{analytics.reasons.slice(0, 3).join(" · ") || "No strong technical confirmation"}</span>
            <strong>Technical indicator only — not trading advice</strong>
          </div>
        </>
      )}
    </section>
  );
}

function AnalyticsCard({
  icon,
  label,
  value: cardValue,
  detail,
  tone = "neutral",
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  detail: string;
  tone?: string;
}) {
  return (
    <article className="analytics-card">
      <div className="analytics-icon">{icon}</div>
      <div>
        <span>{label}</span>
        <strong className={`analytics-${tone}`}>{cardValue}</strong>
        <small>{detail}</small>
      </div>
    </article>
  );
}
