"use client";

import { CalendarRange, ChevronDown } from "lucide-react";

import { useMarketData } from "@/components/providers/market-data-provider";
import type { Instrument } from "@/types/market";

const expiryFormat = new Intl.DateTimeFormat("en-IN", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  timeZone: "Asia/Kolkata",
});

export function daysToExpiry(expiry: Instrument["expiry"]): number | null {
  if (!expiry) return null;
  const ms = new Date(expiry).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / 86_400_000));
}

function contractLabel(item: Instrument): string {
  const date = item.expiry ? expiryFormat.format(new Date(item.expiry)) : "—";
  const days = daysToExpiry(item.expiry);
  return `${date}${days != null ? ` · ${days}d left` : ""}`;
}

/**
 * Expiry picker: every GOLD future the collector is following. Choosing one
 * reloads the chart, SMA/EMA, analytics, ticks and live stream for it.
 */
export function ContractSelect() {
  const market = useMarketData();
  const { instruments, instrumentKey } = market;

  if (instruments.length === 0) return null;

  return (
    <label className="contract-select" title="Choose contract expiry">
      <CalendarRange size={15} aria-hidden="true" />
      <span className="contract-select-caption">Expiry</span>
      <select
        value={instrumentKey ?? instruments[0].instrument_key}
        onChange={(event) => {
          const key = event.target.value;
          // The nearest contract is the server default; store it as "no choice".
          market.selectInstrument(key === instruments[0].instrument_key ? null : key);
        }}
        aria-label="Contract expiry"
      >
        {instruments.map((item, index) => (
          <option key={item.instrument_key} value={item.instrument_key}>
            {contractLabel(item)}
            {index === 0 ? " (near)" : ""}
          </option>
        ))}
      </select>
      <ChevronDown size={14} aria-hidden="true" className="contract-select-chevron" />
    </label>
  );
}
