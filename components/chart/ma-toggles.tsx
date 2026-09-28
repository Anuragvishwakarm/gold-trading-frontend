"use client";

import { MA_LINES, MA_PERIODS, type MovingAverageId, type MovingAverageKind } from "@/lib/indicators";

interface MaTogglesProps {
  selected: Set<MovingAverageId>;
  candleCount: number;
  onToggle: (id: MovingAverageId) => void;
}

const KINDS: { kind: MovingAverageKind; label: string }[] = [
  { kind: "sma", label: "SMA" },
  { kind: "ema", label: "EMA" },
];

export function MaToggles({ selected, candleCount, onToggle }: MaTogglesProps) {
  return (
    <div className="ma-toggles" role="group" aria-label="Moving averages">
      {KINDS.map(({ kind, label }) => (
        <div className="ma-group" key={kind}>
          <span className="ma-group-label">{label}</span>
          {MA_PERIODS.map((period) => {
            const line = MA_LINES.find((item) => item.kind === kind && item.period === period)!;
            const active = selected.has(line.id);
            const short = candleCount > 0 && candleCount < period;
            return (
              <button
                key={line.id}
                type="button"
                className={`ma-chip${active ? " active" : ""}${short ? " short" : ""}`}
                style={{ "--ma-color": line.color } as React.CSSProperties}
                aria-pressed={active}
                title={
                  short
                    ? `${line.label} needs ${period} candles; ${candleCount} loaded on this timeframe`
                    : `${active ? "Hide" : "Show"} ${line.label}`
                }
                onClick={() => onToggle(line.id)}
              >
                <i className={kind === "ema" ? "dashed" : ""} />
                {period}
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}
