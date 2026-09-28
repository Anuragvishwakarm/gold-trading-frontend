"use client";

import { useEffect, useRef, useState } from "react";
import { CircleHelp, X } from "lucide-react";

/** Small "How to read" popover for SMA / EMA lines. */
export function MaHelp() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent | KeyboardEvent) => {
      if (event instanceof KeyboardEvent ? event.key === "Escape" : !ref.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
    };
  }, [open]);

  return (
    <div className="ma-help" ref={ref}>
      <button
        type="button"
        className="ma-help-button"
        aria-expanded={open}
        aria-label="How to read SMA and EMA"
        onClick={() => setOpen((value) => !value)}
      >
        <CircleHelp size={13} /> How to read
      </button>
      {open && (
        <div className="ma-help-popover" role="dialog" aria-label="How to read moving averages">
          <div className="ma-help-title">
            <strong>Reading SMA &amp; EMA lines</strong>
            <button type="button" aria-label="Close" onClick={() => setOpen(false)}><X size={13} /></button>
          </div>
          <dl>
            <dt><i className="solid" /> SMA (solid line)</dt>
            <dd>Average closing price of the last N candles. SMA 50 on 15m = average of the last 50 fifteen-minute closes. Smooth and slow.</dd>
            <dt><i className="dashed" /> EMA (dashed line)</dt>
            <dd>Also an average, but recent candles count more, so it turns faster when price changes direction.</dd>
            <dt>20 · 50 · 100 · 200</dt>
            <dd>How many candles are averaged. 20 = short-term, 50 = medium, 100–200 = long-term trend.</dd>
          </dl>
          <ul>
            <li><b className="positive">Price above a line</b> → buyers in control for that period.</li>
            <li><b className="negative">Price below a line</b> → sellers in control.</li>
            <li><b className="positive">▲ Buy cross</b> → faster line crossed <em>above</em> the slower line: possible uptrend start.</li>
            <li><b className="negative">▼ Sell cross</b> → faster line crossed <em>below</em>: possible downtrend start.</li>
            <li>Lines often act as <b>support</b> (price bounces up from them) or <b>resistance</b> (price turns down at them).</li>
          </ul>
          <p>The coloured tags on the right price axis show each line&apos;s current value.</p>
        </div>
      )}
    </div>
  );
}
