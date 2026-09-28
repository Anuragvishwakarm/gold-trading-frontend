"use client";

import { createContext, useContext, type ReactNode } from "react";

import { useMarketDashboard } from "@/hooks/use-market-dashboard";

type MarketData = ReturnType<typeof useMarketDashboard>;

const MarketDataContext = createContext<MarketData | null>(null);

/**
 * One shared market feed (REST + live WebSocket) for every page, so moving
 * between Overview and Market does not reconnect or reload anything.
 */
export function MarketDataProvider({ children }: { children: ReactNode }) {
  const value = useMarketDashboard();
  return <MarketDataContext.Provider value={value}>{children}</MarketDataContext.Provider>;
}

export function useMarketData(): MarketData {
  const value = useContext(MarketDataContext);
  if (!value) throw new Error("useMarketData must be used inside <MarketDataProvider>");
  return value;
}
