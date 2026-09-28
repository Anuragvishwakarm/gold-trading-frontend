"use client";

import { useEffect, useRef, useState } from "react";
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  CalendarClock,
  CircleDollarSign,
  Clock3,
  Gauge,
  TrendingUp,
} from "lucide-react";

import { GoldChart } from "@/components/chart/gold-chart";
import { ThreeDayChart } from "@/components/chart/three-day-chart";
import { AnalyticsPanel } from "@/components/dashboard/analytics-panel";
import { MetricCard } from "@/components/dashboard/widgets";
import { daysToExpiry } from "@/components/layout/contract-select";
import { useMarketData } from "@/components/providers/market-data-provider";
import { useFullscreen } from "@/hooks/use-fullscreen";
import { useThreeDayCandles } from "@/hooks/use-three-day";
import { dateTime, expiry, numberFormatter, price, quantity } from "@/lib/format";
import { getTimeframe, TIMEFRAMES } from "@/lib/timeframes";

type ChartView = "candles" | "3day";
const VIEW_STORAGE_KEY = "aurum.chart.view";

/** Overview: price, key numbers, chart and the technical signal. */
export function OverviewPage() {
  const market = useMarketData();
  const chartPanelRef = useRef<HTMLElement>(null);
  const fullscreen = useFullscreen(chartPanelRef);
  const [chartView, setChartView] = useState<ChartView>("candles");
  const threeDay = useThreeDayCandles(chartView === "3day", market.instrumentKey);

  // Remember the last chart view.
  useEffect(() => {
    let saved: string | null = null;
    try {
      saved = window.localStorage.getItem(VIEW_STORAGE_KEY);
    } catch {
      // Storage unavailable.
    }
    if (saved === "3day" || saved === "candles") {
      const timer = window.setTimeout(() => setChartView(saved as ChartView), 0);
      return () => window.clearTimeout(timer);
    }
  }, []);

  const selectView = (view: ChartView) => {
    setChartView(view);
    try {
      window.localStorage.setItem(VIEW_STORAGE_KEY, view);
    } catch {
      // Ignore.
    }
  };

  const tick = market.latestTick;
  const change = tick?.close_price ? tick.ltp - tick.close_price : null;
  const changePercent = tick?.close_price && change != null ? (change / tick.close_price) * 100 : null;
  const isPositive = (change ?? 0) >= 0;

  return (
    <>
      <section className="market-hero">
        <div className="asset-identity">
          <div className="asset-icon">Au</div>
          <div>
            <div className="asset-title-row">
              <h2>MCX Gold</h2>
              <span>FUT</span>
            </div>
            <p>{market.instrument?.trading_symbol ?? "Waiting for active contract"}</p>
          </div>
        </div>
        <div className="hero-price">
          <span>Last traded price</span>
          <strong className={market.isLoading ? "skeleton-text" : ""}>{price(tick?.ltp)}</strong>
          {change != null && changePercent != null && (
            <small className={isPositive ? "positive" : "negative"}>
              {isPositive ? <ArrowUpRight size={15} /> : <ArrowDownRight size={15} />}
              {isPositive ? "+" : ""}{numberFormatter.format(change)} ({isPositive ? "+" : ""}{changePercent.toFixed(2)}%)
            </small>
          )}
        </div>
        <div className="hero-meta">
          <div>
            <CalendarClock size={16} />
            <span>
              Expiry
              <strong>
                {expiry(market.instrument?.expiry)}
                {daysToExpiry(market.instrument?.expiry ?? null) != null && (
                  <em className="days-left"> · {daysToExpiry(market.instrument?.expiry ?? null)} days left</em>
                )}
              </strong>
            </span>
          </div>
          <div><Clock3 size={16} /><span>Last update<strong>{dateTime(tick?.last_traded_at ?? tick?.received_at)}</strong></span></div>
        </div>
      </section>

      <section className="metric-grid">
        <MetricCard label="Previous close" value={price(tick?.close_price)} icon={<CircleDollarSign />} />
        <MetricCard label="Volume" value={quantity(tick?.volume_traded_today)} icon={<Activity />} />
        <MetricCard label="Open interest" value={quantity(tick?.open_interest)} icon={<TrendingUp />} />
        <MetricCard
          label="Bid / Ask"
          value={`${tick?.best_bid_price ? numberFormatter.format(tick.best_bid_price) : "—"} / ${tick?.best_ask_price ? numberFormatter.format(tick.best_ask_price) : "—"}`}
          icon={<Gauge />}
        />
      </section>

      <article
        ref={chartPanelRef}
        className={`panel chart-panel overview-chart${fullscreen.isFullscreen ? " is-fullscreen" : ""}${fullscreen.isFallback ? " is-fullscreen-fallback" : ""}`}
      >
        <div className="panel-header chart-header">
          <div>
            <p className="eyebrow">
              {chartView === "3day" ? "Price action · 3-day comparison" : "Price action · SMA / EMA"}
            </p>
            <h3>MCX Gold · {chartView === "3day" ? "Last 3 sessions" : getTimeframe(market.interval).title}</h3>
          </div>
          <div className="chart-actions">
            <div className="chart-view-switch" role="tablist" aria-label="Chart view">
              <button type="button" role="tab" aria-selected={chartView === "candles"} className={chartView === "candles" ? "active" : ""} onClick={() => selectView("candles")}>
                Candles
              </button>
              <button type="button" role="tab" aria-selected={chartView === "3day"} className={chartView === "3day" ? "active" : ""} onClick={() => selectView("3day")}>
                3 Day
              </button>
            </div>
            {chartView === "candles" && (
              <div className="chart-intervals" role="group" aria-label="Chart timeframe">
                {TIMEFRAMES.map((item) => (
                  <button
                    key={item.value}
                    className={market.interval === item.value ? "active" : ""}
                    type="button"
                    title={item.title}
                    aria-pressed={market.interval === item.value}
                    onClick={() => market.selectInterval(item.value)}
                    disabled={market.isChartLoading}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className={`chart-body${chartView === "candles" && market.isChartLoading ? " chart-loading" : ""}`}>
          {chartView === "candles" ? (
            <GoldChart
              candles={market.candles}
              interval={market.interval}
              isFullscreen={fullscreen.isFullscreen}
              onToggleFullscreen={fullscreen.toggle}
            />
          ) : (
            <ThreeDayChart
              candles={threeDay.candles}
              latestTick={market.latestTick}
              isLoading={threeDay.isLoading}
              isFullscreen={fullscreen.isFullscreen}
              onToggleFullscreen={fullscreen.toggle}
            />
          )}
        </div>
        <div className="chart-footer">
          <span>Times in IST · Charts by <a href="https://www.tradingview.com/" target="_blank" rel="noreferrer">TradingView</a></span>
        </div>
      </article>

      <AnalyticsPanel
        analytics={market.analytics}
        interval={market.interval}
        loading={market.isChartLoading || market.isLoading}
      />
    </>
  );
}
