"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { fetchBacktestSummary } from "@/lib/api";
import type { BacktestSummary } from "@/types/backtest";
import type { CandleInterval } from "@/types/market";

const REFRESH_MS = 120_000;

/** Signal backtest for one timeframe (used on the Market page only). */
export function useBacktest(interval: CandleInterval, instrumentKey: string | null = null) {
  const [summary, setSummary] = useState<BacktestSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const requestRef = useRef(0);

  const refresh = useCallback(async () => {
    const requestId = ++requestRef.current;
    setIsLoading(true);
    setError(null);
    try {
      const result = await fetchBacktestSummary(interval, instrumentKey);
      if (requestId !== requestRef.current) return;
      setSummary(result);
    } catch (reason) {
      if (requestId !== requestRef.current) return;
      setSummary(null);
      setError(reason instanceof Error ? reason.message : "Unable to run backtest");
    } finally {
      if (requestId === requestRef.current) setIsLoading(false);
    }
  }, [interval, instrumentKey]);

  useEffect(() => {
    const first = window.setTimeout(() => void refresh(), 0);
    const timer = window.setInterval(() => void refresh(), REFRESH_MS);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(timer);
    };
  }, [refresh]);

  return { summary, isLoading, error, refresh };
}
