"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BarChart3, Expand, Maximize2, Minimize, Radio } from "lucide-react";
import {
  CandlestickSeries,
  ColorType,
  CrosshairMode,
  HistogramSeries,
  LineSeries,
  LineStyle,
  createChart,
  createSeriesMarkers,
  type IChartApi,
  type ISeriesApi,
  type ISeriesMarkersPluginApi,
  type SeriesMarker,
  type Time,
  type UTCTimestamp,
} from "lightweight-charts";

import { MaHelp } from "@/components/chart/ma-help";
import { MaToggles } from "@/components/chart/ma-toggles";
import {
  DEFAULT_MA_SELECTION,
  MA_LINES,
  crossoverPair,
  findCrossovers,
  movingAverage,
  trendAgainst,
  type MovingAverageId,
} from "@/lib/indicators";
import { quantity } from "@/lib/format";
import { getTimeframe } from "@/lib/timeframes";
import type { Candle, CandleInterval } from "@/types/market";

/**
 * Lightweight Charts renders timestamps as UTC. Shifting every bar by the
 * IST offset makes the axis and crosshair read in Indian time (no DST).
 */
const IST_OFFSET_SECONDS = 5.5 * 60 * 60;
const INITIAL_VISIBLE_BARS = 150;
const STORAGE_KEY = "aurum.chart.movingAverages";
const MAX_CROSS_MARKERS = 40;
const UP = "#26c893";
const DOWN = "#ef5b68";

interface GoldChartProps {
  candles: Candle[];
  interval: CandleInterval;
  /** Full-screen state is owned by the panel so the timeframe bar goes full screen too. */
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
}

interface Point {
  time: UTCTimestamp;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

const priceFormatter = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 });


function toPoints(candles: Candle[]): Point[] {
  return [...candles]
    .sort((a, b) => new Date(a.minute).getTime() - new Date(b.minute).getTime())
    .map((candle) => ({
      time: (Math.floor(new Date(candle.minute).getTime() / 1000) +
        IST_OFFSET_SECONDS) as UTCTimestamp,
      open: candle.open,
      high: candle.high,
      low: candle.low,
      close: candle.close,
      volume: candle.volume ?? 0,
    }));
}

function samePoint(a: Point | undefined, b: Point | undefined) {
  return (
    !!a &&
    !!b &&
    a.time === b.time &&
    a.open === b.open &&
    a.high === b.high &&
    a.low === b.low &&
    a.close === b.close &&
    a.volume === b.volume
  );
}

function volumeBar(point: Point) {
  return {
    time: point.time,
    value: point.volume,
    color: point.close >= point.open ? "rgba(38,200,147,0.35)" : "rgba(239,91,104,0.35)",
  };
}

function loadSelection(): Set<MovingAverageId> {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const ids = (JSON.parse(raw) as string[]).filter((id): id is MovingAverageId =>
        MA_LINES.some((line) => line.id === id),
      );
      return new Set(ids);
    }
  } catch {
    // Storage unavailable: fall back to defaults.
  }
  return new Set(DEFAULT_MA_SELECTION);
}

export function GoldChart({
  candles,
  interval,
  isFullscreen = false,
  onToggleFullscreen,
}: GoldChartProps) {
  const timeframe = getTimeframe(interval);
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<"Histogram"> | null>(null);
  const maSeriesRef = useRef(new Map<MovingAverageId, ISeriesApi<"Line">>());
  const markersRef = useRef<ISeriesMarkersPluginApi<Time> | null>(null);
  const timeIndexRef = useRef(new Map<number, number>());
  const previousRef = useRef<{ interval: CandleInterval; points: Point[] } | null>(null);

  const [selected, setSelected] = useState<Set<MovingAverageId>>(
    () => new Set(DEFAULT_MA_SELECTION),
  );
  const [showVolume, setShowVolume] = useState(true);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  // Restore the saved moving-average selection after mount (avoids SSR mismatch).
  useEffect(() => {
    const saved = loadSelection();
    const timer = window.setTimeout(() => setSelected(saved), 0);
    return () => window.clearTimeout(timer);
  }, []);

  const toggleMa = useCallback((id: MovingAverageId) => {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify([...next]));
      } catch {
        // Ignore storage errors.
      }
      return next;
    });
  }, []);

  const points = useMemo(() => toPoints(candles), [candles]);

  const maValues = useMemo(() => {
    const closes = points.map((point) => point.close);
    return new Map(
      MA_LINES.map((line) => [line.id, movingAverage(line.kind, closes, line.period)]),
    );
  }, [points]);

  const activeLines = useMemo(
    () => MA_LINES.filter((line) => selected.has(line.id)),
    [selected],
  );

  // Buy / sell crosses between the fastest and slowest selected lines.
  const cross = useMemo(() => {
    const pair = crossoverPair(activeLines);
    if (!pair) return null;
    const events = findCrossovers(
      maValues.get(pair.fast.id) ?? [],
      maValues.get(pair.slow.id) ?? [],
    ).slice(-MAX_CROSS_MARKERS);
    return { ...pair, events };
  }, [activeLines, maValues]);

  /* ---------------- Create chart once ---------------- */

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const chart = createChart(container, {
      autoSize: true,
      // Fixed locale: Indian digit grouping, and avoids odd browser locales.
      localization: { locale: "en-IN" },
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: "#8791a8",
        fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
        attributionLogo: false,
      },
      grid: {
        vertLines: { color: "rgba(107,119,148,0.08)" },
        horzLines: { color: "rgba(107,119,148,0.08)" },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: { color: "rgba(245,185,66,0.45)", labelBackgroundColor: "#8a6518" },
        horzLine: { color: "rgba(245,185,66,0.45)", labelBackgroundColor: "#8a6518" },
      },
      rightPriceScale: {
        borderColor: "rgba(107,119,148,0.16)",
        scaleMargins: { top: 0.08, bottom: 0.22 },
      },
      timeScale: {
        borderColor: "rgba(107,119,148,0.16)",
        rightOffset: 8,
        barSpacing: 8,
        minBarSpacing: 1,
        shiftVisibleRangeOnNewBar: true,
      },
    });

    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: UP,
      downColor: DOWN,
      borderUpColor: UP,
      borderDownColor: DOWN,
      wickUpColor: UP,
      wickDownColor: DOWN,
      priceFormat: { type: "price", precision: 0, minMove: 1 },
    });

    const volumeSeries = chart.addSeries(HistogramSeries, {
      priceScaleId: "volume",
      priceFormat: { type: "volume" },
      lastValueVisible: false,
      priceLineVisible: false,
    });
    chart.priceScale("volume").applyOptions({ scaleMargins: { top: 0.82, bottom: 0 } });

    chart.subscribeCrosshairMove((param) => {
      if (!param.time || !param.point || param.point.x < 0) {
        setHoverIndex(null);
        return;
      }
      setHoverIndex(timeIndexRef.current.get(Number(param.time)) ?? null);
    });

    markersRef.current = createSeriesMarkers(candleSeries, []);
    chartRef.current = chart;
    candleSeriesRef.current = candleSeries;
    volumeSeriesRef.current = volumeSeries;
    const maSeries = maSeriesRef.current;

    return () => {
      chart.remove();
      chartRef.current = null;
      candleSeriesRef.current = null;
      volumeSeriesRef.current = null;
      markersRef.current = null;
      maSeries.clear();
      previousRef.current = null;
    };
  }, []);

  /* ---------------- Axis format per timeframe ---------------- */

  useEffect(() => {
    chartRef.current?.applyOptions({
      timeScale: { timeVisible: timeframe.intraday, secondsVisible: false },
    });
  }, [timeframe.intraday]);

  useEffect(() => {
    volumeSeriesRef.current?.applyOptions({ visible: showVolume });
  }, [showVolume]);

  /* ---------------- Push data (full load or live update) ---------------- */

  useEffect(() => {
    const chart = chartRef.current;
    const candleSeries = candleSeriesRef.current;
    const volumeSeries = volumeSeriesRef.current;
    if (!chart || !candleSeries || !volumeSeries) return;

    timeIndexRef.current = new Map(points.map((point, index) => [Number(point.time), index]));

    const previous = previousRef.current;
    const last = points[points.length - 1];
    // Live tick: same history, only the last bar changed or one bar was added.
    const incremental =
      !!previous &&
      !!last &&
      previous.interval === interval &&
      previous.points.length > 1 &&
      (points.length === previous.points.length ||
        points.length === previous.points.length + 1) &&
      samePoint(points[0], previous.points[0]) &&
      samePoint(
        points[previous.points.length - 2],
        previous.points[previous.points.length - 2],
      );

    if (incremental) {
      candleSeries.update(last);
      volumeSeries.update(volumeBar(last));
    } else {
      candleSeries.setData(points);
      volumeSeries.setData(points.map(volumeBar));
    }

    const maSeries = maSeriesRef.current;
    for (const [id, series] of maSeries) {
      if (!selected.has(id)) {
        chart.removeSeries(series);
        maSeries.delete(id);
      }
    }
    for (const line of MA_LINES) {
      if (!selected.has(line.id)) continue;
      const values = maValues.get(line.id) ?? [];
      let series = maSeries.get(line.id);
      const isNew = !series;
      if (!series) {
        series = chart.addSeries(LineSeries, {
          color: line.color,
          lineWidth: 2,
          lineStyle: line.kind === "ema" ? LineStyle.Dashed : LineStyle.Solid,
          priceLineVisible: false,
          // Coloured tag on the price axis, e.g. "SMA 50  1,50,746".
          lastValueVisible: true,
          title: line.label,
          crosshairMarkerVisible: true,
          crosshairMarkerRadius: 3,
        });
        maSeries.set(line.id, series);
      }
      const lastValue = values[values.length - 1];
      if (incremental && !isNew) {
        if (last && lastValue != null) series.update({ time: last.time, value: lastValue });
      } else {
        series.setData(
          points.flatMap((point, index) =>
            values[index] == null ? [] : [{ time: point.time, value: values[index] as number }],
          ),
        );
      }
    }

    if ((!previous || previous.interval !== interval) && points.length > 0) {
      chart.timeScale().setVisibleLogicalRange({
        from: Math.max(0, points.length - INITIAL_VISIBLE_BARS),
        to: points.length + 6,
      });
    }

    previousRef.current = points.length > 0 ? { interval, points } : previous;
  }, [points, maValues, selected, interval]);

  useEffect(() => {
    const markers: SeriesMarker<Time>[] = (cross?.events ?? []).flatMap((event) => {
      const point = points[event.index];
      if (!point) return [];
      return [
        event.direction === "up"
          ? { time: point.time, position: "belowBar", shape: "arrowUp", color: UP, text: "Buy cross" }
          : { time: point.time, position: "aboveBar", shape: "arrowDown", color: DOWN, text: "Sell cross" },
      ];
    });
    markersRef.current?.setMarkers(markers);
  }, [cross, points]);

  /* ---------------- Legend ---------------- */

  const legendIndex = hoverIndex ?? points.length - 1;
  const legendPoint = points[legendIndex];
  const previousClose = points[legendIndex - 1]?.close;
  const change = legendPoint && previousClose ? legendPoint.close - previousClose : null;
  const changePercent = change != null && previousClose ? (change / previousClose) * 100 : null;
  const legendPrice = legendPoint?.close;
  const trend =
    legendPrice != null
      ? trendAgainst(
          legendPrice,
          activeLines.map((line) => maValues.get(line.id)?.[legendIndex]),
        )
      : null;
  const lastCross = cross?.events[cross.events.length - 1];
  const barsSinceCross = lastCross ? points.length - 1 - lastCross.index : null;

  return (
    <div className={`gold-chart${isFullscreen ? " is-fullscreen" : ""}`}>
      <div className="chart-toolbar">
        <div className="ma-toolbar-left">
          <MaToggles selected={selected} candleCount={points.length} onToggle={toggleMa} />
          <MaHelp />
        </div>
        <div className="chart-tools">
          <button
            type="button"
            className={showVolume ? "active" : ""}
            onClick={() => setShowVolume((value) => !value)}
            aria-pressed={showVolume}
          >
            <BarChart3 size={12} /> Volume
          </button>
          <button type="button" onClick={() => chartRef.current?.timeScale().fitContent()}>
            <Maximize2 size={12} /> Fit
          </button>
          <button type="button" onClick={() => chartRef.current?.timeScale().scrollToRealTime()}>
            <Radio size={12} /> Latest
          </button>
          {onToggleFullscreen && (
            <button
              type="button"
              className={isFullscreen ? "active" : ""}
              onClick={onToggleFullscreen}
              aria-pressed={isFullscreen}
              title={isFullscreen ? "Exit full screen (Esc)" : "Full screen chart"}
            >
              {isFullscreen ? <Minimize size={12} /> : <Expand size={12} />}
              {isFullscreen ? "Exit" : "Full screen"}
            </button>
          )}
        </div>
      </div>

      <div className="chart-stage">
        <div className="chart-legend-overlay" aria-live="off">
          <div className="legend-ohlc">
            <strong>GOLD · {timeframe.label}</strong>
            {legendPoint ? (
              <>
                <span>O <b>{priceFormatter.format(legendPoint.open)}</b></span>
                <span>H <b>{priceFormatter.format(legendPoint.high)}</b></span>
                <span>L <b>{priceFormatter.format(legendPoint.low)}</b></span>
                <span>C <b>{priceFormatter.format(legendPoint.close)}</b></span>
                {change != null && changePercent != null && (
                  <span className={change >= 0 ? "positive" : "negative"}>
                    {change >= 0 ? "+" : ""}
                    {priceFormatter.format(change)} ({change >= 0 ? "+" : ""}
                    {changePercent.toFixed(2)}%)
                  </span>
                )}
                {showVolume && <span>Vol <b>{quantity(legendPoint.volume)}</b></span>}
              </>
            ) : null}
          </div>
          {activeLines.length > 0 && legendPrice != null && (
            <div className="legend-ma">
              {trend && trend.total > 0 && (
                <span className={`trend-badge ${trend.state}`}>
                  {trend.state === "bullish"
                    ? `▲ Uptrend · price above ${trend.total === 1 ? "the line" : `all ${trend.total} lines`}`
                    : trend.state === "bearish"
                      ? `▼ Downtrend · price below ${trend.total === 1 ? "the line" : `all ${trend.total} lines`}`
                      : `◆ Mixed · price above ${trend.above} of ${trend.total} lines`}
                </span>
              )}
              {activeLines.map((line) => {
                const value = maValues.get(line.id)?.[legendIndex];
                const gap = value == null ? null : legendPrice - value;
                const gapPercent = gap == null || !value ? null : (gap / value) * 100;
                return (
                  <span key={line.id} className="ma-reading">
                    <i
                      className={line.kind === "ema" ? "dashed" : ""}
                      style={{ borderColor: line.color }}
                    />
                    <span style={{ color: line.color }}>{line.label}</span>
                    <b>{value == null ? "not enough candles" : priceFormatter.format(value)}</b>
                    {gap != null && gapPercent != null && (
                      <em className={gap >= 0 ? "positive" : "negative"}>
                        {gap >= 0 ? "▲ price " : "▼ price "}
                        {priceFormatter.format(Math.abs(gap))} ({Math.abs(gapPercent).toFixed(2)}%)
                        {gap >= 0 ? " above" : " below"}
                      </em>
                    )}
                  </span>
                );
              })}
            </div>
          )}
          {cross && (
            <div className="legend-cross">
              Arrows: {cross.fast.label} crossing {cross.slow.label}
              {lastCross && barsSinceCross != null && (
                <>
                  {" · last: "}
                  <b className={lastCross.direction === "up" ? "positive" : "negative"}>
                    {lastCross.direction === "up" ? "▲ Buy cross" : "▼ Sell cross"}
                  </b>
                  {` ${barsSinceCross} candle${barsSinceCross === 1 ? "" : "s"} ago`}
                </>
              )}
            </div>
          )}
        </div>

        <div ref={containerRef} className="chart-canvas" />

        {points.length === 0 && (
          <div className="chart-empty chart-empty-overlay">
            <div className="chart-empty-bars">
              {Array.from({ length: 8 }, (_, index) => <span key={index} />)}
            </div>
            <p>No {timeframe.title.toLowerCase()} candles yet</p>
            <small>Start the collector, or wait for the automatic backfill to finish.</small>
          </div>
        )}
      </div>
    </div>
  );
}
