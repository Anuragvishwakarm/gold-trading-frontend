"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { Menu, RefreshCw, Server } from "lucide-react";

import { ContractSelect } from "@/components/layout/contract-select";
import { pageTitle } from "@/components/layout/nav";
import { Sidebar } from "@/components/layout/sidebar";
import { MarketDataProvider, useMarketData } from "@/components/providers/market-data-provider";
import type { LiveStatus } from "@/types/market";

export const LIVE_LABELS: Record<LiveStatus, string> = {
  connecting: "Connecting",
  live: "Live",
  reconnecting: "Reconnecting",
  offline: "Offline",
};

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <MarketDataProvider>
      <Shell>{children}</Shell>
    </MarketDataProvider>
  );
}

function Shell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const market = useMarketData();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && setMenuOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  // One status pill: live stream first, then API reachability.
  const status: LiveStatus = market.liveStatus === "live" ? "live" : market.isOnline ? market.liveStatus : "offline";

  return (
    <div className="app-shell">
      <Sidebar open={menuOpen} onClose={() => setMenuOpen(false)} />
      <main className="main-content">
        <header className="topbar">
          <button className="mobile-menu" type="button" aria-label="Open menu" onClick={() => setMenuOpen(true)}>
            <Menu />
          </button>
          <div>
            <p className="eyebrow">Markets / Gold</p>
            <h1>{pageTitle(pathname)}</h1>
          </div>
          <div className="topbar-actions">
            <ContractSelect />
            <div className={`status-pill live-pill ${status}`} title="Market data connection">
              <i />
              <span>{LIVE_LABELS[status]}</span>
            </div>
            <button className="icon-button" type="button" onClick={market.refresh} aria-label="Refresh data">
              <RefreshCw className={market.isRefreshing ? "spin" : ""} size={18} />
            </button>
          </div>
        </header>

        {market.error && (
          <div className="error-banner">
            <Server size={18} />
            <div><strong>Backend connection unavailable</strong><span>{market.error}</span></div>
          </div>
        )}

        {children}
      </main>
    </div>
  );
}
