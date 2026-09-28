"use client";

import { useCallback, useEffect, useState } from "react";

import { fetchCandles } from "@/lib/api";
import type { Candle } from "@/types/market";

/** 4 MCX sessions of 1-minute candles (~870 per day): 3 to draw + 1 for the first day's change. */
const ONE_MINUTE_LIMIT = 4000;
const REFRESH_MS = 30_000;

/**
 * 1-minute candles for the 3-day comparison chart. History reloads every
 * 30 s; the live tick passed to the chart moves the last point every second.
 */
export function useThreeDayCandles(enabled: boolean, instrumentKey: string | null = null) {
  const [candles, setCandles] = useState<Candle[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const result = await fetchCandles("1m", ONE_MINUTE_LIMIT, instrumentKey);
      setCandles(result);
      setError(null);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to load 1-minute candles");
    } finally {
      setIsLoading(false);
    }
  }, [instrumentKey]);

  useEffect(() => {
    if (!enabled) return;
    const first = window.setTimeout(() => {
      setCandles([]); // don't show the previous contract while the new one loads
      setIsLoading(true);
      void load();
    }, 0);
    const timer = window.setInterval(() => void load(), REFRESH_MS);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(timer);
    };
  }, [enabled, load]);

  return { candles, isLoading, error };
}
