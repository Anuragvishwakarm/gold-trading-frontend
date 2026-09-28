"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Expand, Minimize } from "lucide-react";

import {
  formatMinutes,
  goldSessions,
  istDateKey,
  istMinuteOfDay,
  istToGmtLabel,
} from "@/lib/sessions";
import type { Candle, MarketTick } from "@/types/market";

/**
 * Kitco-style "3 Day" chart: each of the last three MCX sessions is drawn as
 * its own line on a shared 09:00–24:00 IST time-of-day axis, so you can see
 * how today is trading against the two previous days at the same hour.
 */

/** Oldest → newest. Validated for colour-blind separation on the dark surface. */
const DAY_COLORS = ["#3987e5", "#e0647c", "#c98500"];
const X_START = 9 * 60; // 09:00 IST, MCX open
const X_END = 24 * 60;
const MARGIN = { top: 14, right: 78, bottom: 106, left: 70 };
const LANE_HEIGHT = 19;

interface ThreeDayChartProps {
  candles: Candle[];
  latestTick: MarketTick | null;
  isLoading?: boolean;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
}

interface DayPoint {
  minute: number;
  price: number;
}

interface DaySeries {
  key: string;
  label: string;
  color: string;
  points: DayPoint[];
  last: number;
  change: number | null;
  changePercent: number | null;
  isToday: boolean;
}

const priceFormat = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 });
const priceFormat2 = new Intl.NumberFormat("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function dayLabel(key: string) {
  return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", timeZone: "UTC" }).format(
    new Date(`${key}T00:00:00Z`),
  );
}

function niceTicks(min: number, max: number, target = 6) {
  const span = max - min || 1;
  const raw = span / target;
  const power = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * power).find((s) => span / s <= target) ?? power * 10;
  const ticks: number[] = [];
  for (let value = Math.ceil(min / step) * step; value <= max; value += step) ticks.push(value);
  return ticks;
}

/** Index of the last point at or before `minute`. */
function pointAt(points: DayPoint[], minute: number): DayPoint | null {
  let low = 0;
  let high = points.length - 1;
  let found = -1;
  while (low <= high) {
    const mid = (low + high) >> 1;
    if (points[mid].minute <= minute) {
      found = mid;
      low = mid + 1;
    } else high = mid - 1;
  }
  if (found < 0) return null;
  // Don't invent a value across a long gap (e.g. before today's first trade).
  return minute - points[found].minute <= 10 ? points[found] : null;
}

function buildSeries(candles: Candle[], tick: MarketTick | null): DaySeries[] {
  const byDay = new Map<string, DayPoint[]>();
  for (const candle of candles) {
    const at = new Date(candle.minute);
    const key = istDateKey(at);
    const list = byDay.get(key) ?? [];
    list.push({ minute: istMinuteOfDay(at), price: candle.close });
    byDay.set(key, list);
  }

  // Live tick moves the newest point every second.
  if (tick) {
    const at = new Date(tick.last_traded_at ?? tick.received_at);
    const key = istDateKey(at);
    const list = byDay.get(key) ?? [];
    const minute = istMinuteOfDay(at);
    const last = list[list.length - 1];
    if (!last || minute >= last.minute) {
      if (last && Math.floor(last.minute) === Math.floor(minute)) list[list.length - 1] = { minute, price: tick.ltp };
      else list.push({ minute, price: tick.ltp });
      byDay.set(key, list);
    }
  }

  const keys = [...byDay.keys()].sort();
  const shown = keys.slice(-3);
  const today = istDateKey(new Date());
  return shown.map((key, index) => {
    const points = (byDay.get(key) ?? []).sort((a, b) => a.minute - b.minute);
    const last = points[points.length - 1]?.price ?? 0;
    const previousKey = keys[keys.indexOf(key) - 1];
    const previousPoints = previousKey ? byDay.get(previousKey) : undefined;
    const previousClose = previousPoints?.[previousPoints.length - 1]?.price;
    const change = previousClose != null ? last - previousClose : null;
    return {
      key,
      label: dayLabel(key),
      color: DAY_COLORS[DAY_COLORS.length - shown.length + index],
      points,
      last,
      change,
      changePercent: change != null && previousClose ? (change / previousClose) * 100 : null,
      isToday: key === today,
    };
  });
}

function ChangeText({ change, percent }: { change: number | null; percent: number | null }) {
  if (change == null || percent == null) return <span className="muted">—</span>;
  const up = change >= 0;
  return (
    <span className={up ? "positive" : "negative"}>
      {up ? "▲ +" : "▼ "}
      {priceFormat2.format(change)} ({up ? "+" : ""}
      {percent.toFixed(2)}%)
    </span>
  );
}

export function ThreeDayChart({
  candles,
  latestTick,
  isLoading = false,
  isFullscreen = false,
  onToggleFullscreen,
}: ThreeDayChartProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 900, height: 460 });
  const [hoverMinute, setHoverMinute] = useState<number | null>(null);

  useEffect(() => {
    const element = wrapRef.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setSize({ width: Math.max(320, width), height: Math.max(300, height) });
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const series = useMemo(() => buildSeries(candles, latestTick), [candles, latestTick]);
  const today = series[series.length - 1];
  const sessions = useMemo(() => (today ? goldSessions(today.key) : []), [today]);

  const allPrices = series.flatMap((day) => day.points.map((point) => point.price));
  const high = allPrices.length ? Math.max(...allPrices) : 0;
  const low = allPrices.length ? Math.min(...allPrices) : 0;
  const pad = Math.max((high - low) * 0.08, 1);
  const yMin = low - pad;
  const yMax = high + pad;

  const { width, height } = size;
  const plotW = width - MARGIN.left - MARGIN.right;
  const plotH = height - MARGIN.top - MARGIN.bottom;
  const x = (minute: number) => MARGIN.left + ((minute - X_START) / (X_END - X_START)) * plotW;
  const y = (price: number) => MARGIN.top + (1 - (price - yMin) / (yMax - yMin || 1)) * plotH;
  const plotBottom = MARGIN.top + plotH;

  const yTicks = allPrices.length ? niceTicks(yMin, yMax) : [];
  const narrow = plotW < 520;
  // Every 2 hours (10:00 … 24:00), or every 4 hours on small screens.
  const tickStep = narrow ? 240 : 120;
  const xTicks = Array.from({ length: 8 }, (_, index) => X_START + 60 + index * tickStep).filter(
    (minute) => minute <= X_END,
  );
  const hiloText = narrow
    ? `H ${priceFormat.format(high)} · L ${priceFormat.format(low)}`
    : `3 Day · High ${priceFormat.format(high)} · Low ${priceFormat.format(low)}`;
  const hiloWidth = narrow ? 150 : 256;

  const paths = series.map((day) => {
    let d = "";
    let previous: DayPoint | null = null;
    for (const point of day.points) {
      if (point.minute < X_START || point.minute > X_END) continue;
      // Break the line across gaps longer than 10 minutes.
      const move = !previous || point.minute - previous.minute > 10;
      d += `${move ? "M" : "L"}${x(point.minute).toFixed(1)},${y(point.price).toFixed(1)}`;
      previous = point;
    }
    return d;
  });

  // End-of-line labels, pushed apart so they never overlap.
  const endLabels = series
    .map((day) => {
      const last = day.points[day.points.length - 1];
      return last ? { day, x: x(Math.min(last.minute, X_END)), y: y(last.price) } : null;
    })
    .filter((item): item is NonNullable<typeof item> => item !== null)
    .sort((a, b) => a.y - b.y);
  for (let index = 1; index < endLabels.length; index += 1) {
    endLabels[index].y = Math.max(endLabels[index].y, endLabels[index - 1].y + 15);
  }

  const todayLast = today?.points[today.points.length - 1];
  const hover =
    hoverMinute != null
      ? series.map((day) => ({ day, point: pointAt(day.points, hoverMinute) }))
      : null;

  const onMove = (event: React.PointerEvent<SVGRectElement>) => {
    const box = event.currentTarget.getBoundingClientRect();
    const ratio = (event.clientX - box.left) / box.width;
    setHoverMinute(X_START + Math.min(1, Math.max(0, ratio)) * (X_END - X_START));
  };

  const updatedAt = latestTick
    ? new Intl.DateTimeFormat("en-IN", {
        day: "numeric",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23",
        timeZone: "Asia/Kolkata",
      }).format(new Date(latestTick.last_traded_at ?? latestTick.received_at))
    : null;

  return (
    <div className={`three-day${isFullscreen ? " is-fullscreen" : ""}`}>
      <div className="three-day-head">
        <div className="three-day-title">
          <h4>MCX Gold 3 Day</h4>
          <span>{updatedAt ? `${updatedAt} IST` : "Waiting for data"} · ₹ per 10 g</span>
        </div>
        <table className="three-day-legend" aria-label="Daily close and change">
          <tbody>
            {series.map((day) => (
              <tr key={day.key}>
                <td><i style={{ background: day.color }} /></td>
                <td>{day.label} {day.isToday ? "Last" : "Close"}</td>
                <td className="num">{priceFormat2.format(day.last)}</td>
                <td className="num"><ChangeText change={day.change} percent={day.changePercent} /></td>
              </tr>
            ))}
          </tbody>
        </table>
        {onToggleFullscreen && (
          <button
            type="button"
            className="three-day-fs"
            onClick={onToggleFullscreen}
            aria-pressed={isFullscreen}
            title={isFullscreen ? "Exit full screen (Esc)" : "Full screen chart"}
          >
            {isFullscreen ? <Minimize size={13} /> : <Expand size={13} />}
            {isFullscreen ? "Exit" : "Full screen"}
          </button>
        )}
      </div>

      <div className="three-day-plot" ref={wrapRef}>
        <svg width={width} height={height} role="img" aria-label="Gold price for the last three sessions by time of day">
          {/* Session tints */}
          {sessions.map((session) =>
            session.end > X_START && session.start < X_END ? (
              <rect
                key={`tint-${session.name}`}
                x={x(Math.max(session.start, X_START))}
                y={MARGIN.top}
                width={Math.max(0, x(Math.min(session.end, X_END)) - x(Math.max(session.start, X_START)))}
                height={plotH}
                className={`session-tint lane-${session.lane}`}
              />
            ) : null,
          )}

          {/* Grid + y axis */}
          {yTicks.map((tick) => (
            <g key={`y-${tick}`}>
              <line x1={MARGIN.left} x2={MARGIN.left + plotW} y1={y(tick)} y2={y(tick)} className="grid" />
              <text x={MARGIN.left - 10} y={y(tick)} className="axis-label" textAnchor="end" dominantBaseline="middle">
                {priceFormat.format(tick)}
              </text>
            </g>
          ))}
          {xTicks.map((tick) => (
            <line key={`x-${tick}`} x1={x(tick)} x2={x(tick)} y1={MARGIN.top} y2={plotBottom} className="grid" />
          ))}
          <rect x={MARGIN.left} y={MARGIN.top} width={plotW} height={plotH} className="plot-frame" />
          {!narrow && <text x={MARGIN.left + 10} y={MARGIN.top + 16} className="unit-label">₹/10g</text>}

          {allPrices.length > 0 && (
            <g>
              <rect x={MARGIN.left + plotW - hiloWidth - 6} y={MARGIN.top + 5} width={hiloWidth} height={22} rx={4} className="hilo-box" />
              <text x={MARGIN.left + plotW - 12} y={MARGIN.top + 20} textAnchor="end" className="hilo-text">
                {hiloText}
              </text>
            </g>
          )}

          {/* Lines: oldest first so today is drawn on top */}
          {series.map((day, index) => (
            <path
              key={day.key}
              d={paths[index]}
              fill="none"
              stroke={day.color}
              strokeWidth={day.isToday ? 2.25 : 1.75}
              strokeLinejoin="round"
              strokeLinecap="round"
              opacity={day.isToday ? 1 : 0.9}
            />
          ))}

          {/* Direct labels at line ends */}
          {endLabels.map(({ day, y: labelY }) => (
            <g key={`end-${day.key}`}>
              <circle cx={MARGIN.left + plotW + 10} cy={labelY} r={4} fill={day.color} />
              <text x={MARGIN.left + plotW + 18} y={labelY} className="end-label" dominantBaseline="middle">
                {day.label}
              </text>
            </g>
          ))}

          {/* Latest price marker */}
          {today && todayLast && todayLast.minute >= X_START && (
            <g>
              <circle cx={x(todayLast.minute)} cy={y(todayLast.price)} r={9} className="last-pulse" fill={today.color} />
              <circle cx={x(todayLast.minute)} cy={y(todayLast.price)} r={5} fill={today.color} stroke="#0f1522" strokeWidth={2} />
              {(() => {
                const onRight = x(todayLast.minute) < MARGIN.left + plotW - 170;
                const tx = x(todayLast.minute) + (onRight ? 12 : -12);
                const ty = Math.max(MARGIN.top + 40, y(todayLast.price) - 10);
                return (
                  <g textAnchor={onRight ? "start" : "end"}>
                    <text x={tx} y={ty} className="last-price">{priceFormat2.format(todayLast.price)}</text>
                    {today.change != null && today.changePercent != null && (
                      <text x={tx} y={ty + 15} className={`last-change ${today.change >= 0 ? "positive" : "negative"}`}>
                        {today.change >= 0 ? "+" : ""}
                        {priceFormat2.format(today.change)} ({today.change >= 0 ? "+" : ""}
                        {today.changePercent.toFixed(2)}%)
                      </text>
                    )}
                  </g>
                );
              })()}
            </g>
          )}

          {/* Session lanes */}
          {sessions.map((session) =>
            session.end > X_START && session.start < X_END ? (
              <g key={`lane-${session.name}`}>
                <rect
                  x={x(Math.max(session.start, X_START))}
                  y={plotBottom + 4 + session.lane * LANE_HEIGHT}
                  width={Math.max(0, x(Math.min(session.end, X_END)) - x(Math.max(session.start, X_START)))}
                  height={LANE_HEIGHT - 3}
                  className="session-lane"
                />
                <text
                  x={(x(Math.max(session.start, X_START)) + x(Math.min(session.end, X_END))) / 2}
                  y={plotBottom + 4 + session.lane * LANE_HEIGHT + 12}
                  textAnchor="middle"
                  className="session-label"
                >
                  {session.name.replace(" night", "").toUpperCase()}
                </text>
              </g>
            ) : null,
          )}

          {/* Time axis: IST and GMT */}
          <text x={MARGIN.left - 10} y={height - 30} textAnchor="end" className="axis-caption">IST</text>
          <text x={MARGIN.left - 10} y={height - 12} textAnchor="end" className="axis-caption">GMT</text>
          {xTicks.map((tick) => (
            <g key={`xl-${tick}`}>
              <text x={x(tick)} y={height - 30} textAnchor="middle" className="axis-time">{formatMinutes(tick)}</text>
              <text x={x(tick)} y={height - 12} textAnchor="middle" className="axis-time gmt">{istToGmtLabel(tick)}</text>
            </g>
          ))}

          {/* Hover crosshair */}
          {hover && hoverMinute != null && (
            <g pointerEvents="none">
              <line x1={x(hoverMinute)} x2={x(hoverMinute)} y1={MARGIN.top} y2={plotBottom} className="crosshair" />
              {hover.map(({ day, point }) =>
                point ? (
                  <circle key={`h-${day.key}`} cx={x(hoverMinute)} cy={y(point.price)} r={4.5} fill={day.color} stroke="#0f1522" strokeWidth={2} />
                ) : null,
              )}
            </g>
          )}

          <rect
            x={MARGIN.left}
            y={MARGIN.top}
            width={plotW}
            height={plotH}
            fill="transparent"
            onPointerMove={onMove}
            onPointerLeave={() => setHoverMinute(null)}
          />
        </svg>

        {hover && hoverMinute != null && (
          <div
            className="three-day-tooltip"
            style={{
              left: Math.min(x(hoverMinute) + 14, width - 210),
              top: MARGIN.top + 34,
            }}
          >
            <strong>{formatMinutes(hoverMinute)} IST</strong>
            {hover.map(({ day, point }) => (
              <div key={`t-${day.key}`}>
                <i style={{ background: day.color }} />
                <span>{day.label}</span>
                <b>{point ? priceFormat2.format(point.price) : "—"}</b>
              </div>
            ))}
          </div>
        )}

        {series.length === 0 && (
          <div className="chart-empty chart-empty-overlay three-day-empty">
            <p>{isLoading ? "Loading 1-minute history…" : "No 1-minute candles yet"}</p>
            <small>The 3-day view needs the collector or the automatic backfill.</small>
          </div>
        )}
      </div>
    </div>
  );
}
