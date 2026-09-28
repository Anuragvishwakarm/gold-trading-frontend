# Gold Trading — Frontend (Next.js)

Dashboard for the Gold Trading API: live MCX Gold chart with SMA/EMA
20·50·100·200, timeframes 15m · 30m · 1H · 4H · 1D · 1W · 1M, analytics,
backtest and recent ticks.

## Run

```powershell
npm install
Copy-Item .env.example .env.local
npm run dev        # http://localhost:3000
npm run lint
npm run build
```

`.env.local`:

```env
NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8000/api/v1
NEXT_PUBLIC_REFRESH_INTERVAL_MS=5000   # polling used only when the live stream is down
```

## Where things live

| Path | Purpose |
| --- | --- |
| `components/chart/gold-chart.tsx` | Candles, volume, MA lines, legend, live bar updates |
| `components/chart/ma-toggles.tsx` | SMA / EMA 20·50·100·200 toggle chips |
| `lib/indicators.ts` | SMA and EMA maths + line colours |
| `lib/timeframes.ts` | Timeframe list, candle limits, backtest horizons |
| `hooks/use-live-stream.ts` | WebSocket with auto-reconnect |
| `hooks/use-market-dashboard.ts` | REST loading + merging live updates |

Chart times are shown in IST. Timeframe `1M` is sent to the API as `1mo`.
