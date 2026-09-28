"use client";

import { Activity, CalendarClock, Database, Server, Wifi } from "lucide-react";

import { LIVE_LABELS } from "@/components/layout/app-shell";
import { BacktestPanel } from "@/components/dashboard/backtest-panel";
import { StatusRow } from "@/components/dashboard/widgets";
import { useMarketData } from "@/components/providers/market-data-provider";
import { useBacktest } from "@/hooks/use-backtest";
import { dateTime, numberFormatter, price, quantity } from "@/lib/format";
import { TIMEFRAMES } from "@/lib/timeframes";

/** Market: order book top, buy/sell pressure, recent trades, signal backtest and feed health. */
export function MarketPage() {
  const market = useMarketData();
  const backtest = useBacktest(market.interval, market.instrumentKey);
  const tick = market.latestTick;

  const buyQty = tick?.total_buy_quantity ?? null;
  const sellQty = tick?.total_sell_quantity ?? null;
  const totalQty = (buyQty ?? 0) + (sellQty ?? 0);
  const buyShare = totalQty > 0 && buyQty != null ? (buyQty / totalQty) * 100 : null;
  const spread =
    tick?.best_ask_price && tick?.best_bid_price ? tick.best_ask_price - tick.best_bid_price : null;

  return (
    <>
      <section className="market-grid">
        <article className="panel order-panel">
          <div className="panel-header"><div><p className="eyebrow">Market depth</p><h3>Best quote</h3></div></div>
          <div className="quote-row bid"><span>Best bid</span><strong>{price(tick?.best_bid_price)}</strong><small>{quantity(tick?.best_bid_quantity)} qty</small></div>
          <div className="quote-divider"><span>Spread</span><strong>{spread == null ? "—" : numberFormatter.format(spread)}</strong></div>
          <div className="quote-row ask"><span>Best ask</span><strong>{price(tick?.best_ask_price)}</strong><small>{quantity(tick?.best_ask_quantity)} qty</small></div>
        </article>

        <article className="panel pressure-panel">
          <div className="panel-header"><div><p className="eyebrow">Order book</p><h3>Buy vs sell pressure</h3></div></div>
          <div className="pressure-body">
            <div className={`pressure-bar${buyShare == null ? " empty" : ""}`} role="img" aria-label={buyShare == null ? "No order book data" : `Buyers ${buyShare.toFixed(0)} percent, sellers ${(100 - buyShare).toFixed(0)} percent`}>
              <span className="buy" style={{ width: `${buyShare ?? 50}%` }} />
              <span className="sell" />
            </div>
            <div className="pressure-legend">
              <div><small>Total buy qty</small><strong className="positive">{quantity(buyQty)}</strong><em>{buyShare == null ? "—" : `${buyShare.toFixed(1)}%`}</em></div>
              <div><small>Total sell qty</small><strong className="negative">{quantity(sellQty)}</strong><em>{buyShare == null ? "—" : `${(100 - buyShare).toFixed(1)}%`}</em></div>
            </div>
            <div className="pressure-stats">
              <div><small>Avg traded price</small><strong>{price(tick?.average_traded_price)}</strong></div>
              <div><small>Last trade qty</small><strong>{quantity(tick?.last_traded_quantity)}</strong></div>
            </div>
          </div>
        </article>
      </section>

      <div className="backtest-section">
        <div className="section-toolbar">
          <span>Backtest timeframe</span>
          <div className="chart-intervals" role="group" aria-label="Backtest timeframe">
            {TIMEFRAMES.map((item) => (
              <button
                key={item.value}
                type="button"
                className={market.interval === item.value ? "active" : ""}
                aria-pressed={market.interval === item.value}
                onClick={() => market.selectInterval(item.value)}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
        <BacktestPanel
          summary={backtest.summary}
          interval={market.interval}
          loading={backtest.isLoading}
          error={backtest.error}
          onRefresh={backtest.refresh}
        />
      </div>

      <section className="panel ticks-panel">
        <div className="panel-header">
          <div><p className="eyebrow">Live feed</p><h3>Recent Gold ticks</h3></div>
          <span className="recording"><i />{market.liveStatus === "live" ? "Streaming" : "Auto-refreshing"}</span>
        </div>
        <div className="table-scroll">
          <table>
            <thead><tr><th>Time</th><th>LTP</th><th>Trade Qty</th><th>Volume</th><th>OI</th><th>Bid</th><th>Ask</th></tr></thead>
            <tbody>
              {market.ticks.length === 0 ? (
                <tr><td colSpan={7} className="empty-row">No ticks stored yet. Start the collector during market hours.</td></tr>
              ) : market.ticks.map((row) => (
                <tr key={row.id}>
                  <td>{dateTime(row.last_traded_at ?? row.received_at)}</td>
                  <td className="price-cell">{price(row.ltp)}</td>
                  <td>{quantity(row.last_traded_quantity)}</td>
                  <td>{quantity(row.volume_traded_today)}</td>
                  <td>{quantity(row.open_interest)}</td>
                  <td className="positive">{row.best_bid_price ? numberFormatter.format(row.best_bid_price) : "—"}</td>
                  <td className="negative">{row.best_ask_price ? numberFormatter.format(row.best_ask_price) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <article className="panel system-panel system-wide">
        <div className="panel-header"><div><p className="eyebrow">Pipeline</p><h3>Data feed status</h3></div></div>
        <div className="system-rows">
          <StatusRow icon={<Server />} label="API" value={market.isOnline ? "Healthy" : "Offline"} active={market.isOnline} />
          <StatusRow icon={<Wifi />} label="Live stream" value={LIVE_LABELS[market.liveStatus]} active={market.liveStatus === "live"} />
          <StatusRow icon={<Database />} label="Market data" value={tick ? "Receiving" : "Waiting"} active={Boolean(tick)} />
          <StatusRow icon={<Activity />} label="Collector" value={tick ? "Active" : "Check worker"} active={Boolean(tick)} />
          <StatusRow icon={<CalendarClock />} label="Backfill" value="Automatic" active />
        </div>
        <p className="updated-at">Last refreshed {market.lastUpdated ? dateTime(market.lastUpdated.toISOString()) : "—"}</p>
      </article>
    </>
  );
}
