"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { checkAPIHealth, fetchDashboardData, fetchInstruments } from "@/lib/api";
import { DEFAULT_TIMEFRAME, getTimeframe } from "@/lib/timeframes";
import { useLiveStream } from "@/hooks/use-live-stream";
import type {
  Candle,
  CandleInterval,
  DashboardData,
  Instrument,
  MarketTick,
  StreamMessage,
} from "@/types/market";

const EMPTY_DATA: DashboardData = {
  instrument: null,
  latestTick: null,
  ticks: [],
  candles: [],
  analytics: null,
};

/** Full reload interval while the live stream is down. */
const POLL_INTERVAL = Number(process.env.NEXT_PUBLIC_REFRESH_INTERVAL_MS ?? "5000");
/** Full reload interval while live (reconciles history + analytics). */
const LIVE_RECONCILE_INTERVAL = 60_000;
const MAX_TICKS = 25;
const CONTRACT_STORAGE_KEY = "aurum.contract";
const INSTRUMENTS_REFRESH_MS = 10 * 60_000;

function time(value: string) {
  return new Date(value).getTime();
}

/** Replace the last candle, or append a new one, from a live update. */
function mergeLiveCandle(candles: Candle[], candle: Candle, limit: number): Candle[] {
  const last = candles[candles.length - 1];
  if (!last) return [candle];
  const lastTime = time(last.minute);
  const nextTime = time(candle.minute);
  if (nextTime === lastTime) return [...candles.slice(0, -1), candle];
  if (nextTime > lastTime) {
    const next = [...candles, candle];
    return next.length > limit ? next.slice(next.length - limit) : next;
  }
  return candles; // Older than what we have: ignore.
}

function mergeTick(ticks: MarketTick[], tick: MarketTick): MarketTick[] {
  if (ticks[0]?.id === tick.id) return ticks;
  return [tick, ...ticks].slice(0, MAX_TICKS);
}

export function useMarketDashboard() {
  const [data, setData] = useState<DashboardData>(EMPTY_DATA);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isChartLoading, setIsChartLoading] = useState(false);
  const [isOnline, setIsOnline] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [interval, setInterval] = useState<CandleInterval>(DEFAULT_TIMEFRAME);
  /** Chosen contract (instrument key). null = nearest expiry (server default). */
  const [instrumentKey, setInstrumentKey] = useState<string | null>(null);
  const [instruments, setInstruments] = useState<Instrument[]>([]);
  const mounted = useRef(true);
  const refreshRequest = useRef(0);

  /* ---------------- Live stream ---------------- */

  const handleStream = useCallback(
    (message: StreamMessage) => {
      if (message.type !== "snapshot" && message.type !== "update") return;
      if (message.interval !== interval) return;
      if (instrumentKey && message.tick.instrument_key !== instrumentKey) return;
      const { limit } = getTimeframe(interval);
      setData((current) => ({
        ...current,
        latestTick: message.tick,
        ticks: mergeTick(current.ticks, message.tick),
        candles:
          message.candle && current.candles.length > 0
            ? mergeLiveCandle(current.candles, message.candle, limit)
            : current.candles,
      }));
      setLastUpdated(new Date());
    },
    [interval, instrumentKey],
  );

  const liveStatus = useLiveStream(interval, instrumentKey, handleStream);

  /* ---------------- Contracts (expiries) ---------------- */

  useEffect(() => {
    let saved: string | null = null;
    try {
      saved = window.localStorage.getItem(CONTRACT_STORAGE_KEY);
    } catch {
      // Storage unavailable.
    }

    const loadInstruments = async () => {
      try {
        const list = await fetchInstruments();
        if (!mounted.current) return;
        setInstruments(list);
        // A saved contract that has since expired falls back to the nearest one.
        setInstrumentKey((current) => {
          const wanted = current ?? saved;
          return wanted && list.some((item) => item.instrument_key === wanted) ? wanted : null;
        });
      } catch {
        // Keep the current list; the dashboard still works on the default contract.
      }
    };

    const first = window.setTimeout(() => void loadInstruments(), 0);
    const timer = window.setInterval(() => void loadInstruments(), INSTRUMENTS_REFRESH_MS);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(timer);
    };
  }, []);

  const selectInstrument = useCallback(
    (key: string | null) => {
      if (key === instrumentKey) return;
      setIsChartLoading(true);
      setData((current) => ({ ...EMPTY_DATA, instrument: current.instrument }));
      setInstrumentKey(key);
      try {
        if (key) window.localStorage.setItem(CONTRACT_STORAGE_KEY, key);
        else window.localStorage.removeItem(CONTRACT_STORAGE_KEY);
      } catch {
        // Ignore storage errors.
      }
    },
    [instrumentKey],
  );

  /* ---------------- REST refresh ---------------- */

  const refresh = useCallback(
    async (showLoader = false) => {
      const requestId = ++refreshRequest.current;
      if (showLoader) setIsRefreshing(true);
      try {
        const [healthy, marketData] = await Promise.all([
          checkAPIHealth(),
          fetchDashboardData(interval, instrumentKey),
        ]);
        if (!mounted.current || requestId !== refreshRequest.current) return;
        setData(marketData);
        setIsOnline(healthy);
        setError(null);
        setLastUpdated(new Date());
      } catch (reason) {
        if (!mounted.current || requestId !== refreshRequest.current) return;
        setIsOnline(false);
        setError(reason instanceof Error ? reason.message : "Unable to connect to API");
      } finally {
        if (mounted.current && requestId === refreshRequest.current) {
          setIsLoading(false);
          setIsRefreshing(false);
          setIsChartLoading(false);
        }
      }
    },
    [interval, instrumentKey],
  );

  const selectInterval = useCallback(
    (value: CandleInterval) => {
      if (value === interval) return;
      setIsChartLoading(true);
      setData((current) => ({ ...current, candles: [], analytics: null }));
      setInterval(value);
    },
    [interval],
  );

  const isLive = liveStatus === "live";

  useEffect(() => {
    mounted.current = true;
    const initialRefresh = window.setTimeout(() => void refresh(), 0);
    const refreshTimer = window.setInterval(
      () => void refresh(),
      isLive ? LIVE_RECONCILE_INTERVAL : POLL_INTERVAL,
    );
    return () => {
      mounted.current = false;
      window.clearTimeout(initialRefresh);
      window.clearInterval(refreshTimer);
    };
  }, [refresh, isLive]);

  return {
    ...data,
    isLoading,
    isRefreshing,
    isChartLoading,
    isOnline,
    liveStatus,
    error,
    lastUpdated,
    interval,
    selectInterval,
    instruments,
    /** Contract being shown (explicit choice, else the nearest expiry). */
    instrumentKey: instrumentKey ?? data.instrument?.instrument_key ?? null,
    selectInstrument,
    refresh: () => refresh(true),
  };
}
