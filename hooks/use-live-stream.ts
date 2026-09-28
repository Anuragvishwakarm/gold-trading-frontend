"use client";

import { useEffect, useRef, useState } from "react";

import { streamUrl } from "@/lib/api";
import type { CandleInterval, LiveStatus, StreamMessage } from "@/types/market";

const RETRY_DELAYS_MS = [1000, 2000, 5000, 10000];
/** No message (update or heartbeat) for this long means the socket is stale. */
const STALE_AFTER_MS = 40000;

/**
 * Opens `WS /market/stream?interval=…&instrument_key=…` and calls `onMessage`
 * for each update. Reconnects with backoff and reopens when the interval or
 * contract changes.
 */
export function useLiveStream(
  interval: CandleInterval,
  instrumentKey: string | null,
  onMessage: (message: StreamMessage) => void,
): LiveStatus {
  const [status, setStatus] = useState<LiveStatus>("connecting");
  const handler = useRef(onMessage);

  useEffect(() => {
    handler.current = onMessage;
  }, [onMessage]);

  useEffect(() => {
    let socket: WebSocket | null = null;
    let retryTimer: number | undefined;
    let staleTimer: number | undefined;
    let attempt = 0;
    let closedByUs = false;

    const armStaleTimer = () => {
      window.clearTimeout(staleTimer);
      staleTimer = window.setTimeout(() => socket?.close(), STALE_AFTER_MS);
    };

    const connect = () => {
      setStatus(attempt === 0 ? "connecting" : "reconnecting");
      try {
        socket = new WebSocket(streamUrl(interval, instrumentKey));
      } catch {
        scheduleRetry();
        return;
      }

      socket.onopen = () => {
        attempt = 0;
        setStatus("live");
        armStaleTimer();
      };

      socket.onmessage = (event) => {
        armStaleTimer();
        try {
          handler.current(JSON.parse(event.data as string) as StreamMessage);
        } catch {
          // Ignore malformed frames.
        }
      };

      socket.onclose = () => {
        window.clearTimeout(staleTimer);
        if (!closedByUs) scheduleRetry();
      };

      socket.onerror = () => socket?.close();
    };

    const scheduleRetry = () => {
      const delay = RETRY_DELAYS_MS[Math.min(attempt, RETRY_DELAYS_MS.length - 1)];
      attempt += 1;
      setStatus(attempt > RETRY_DELAYS_MS.length ? "offline" : "reconnecting");
      retryTimer = window.setTimeout(connect, delay);
    };

    connect();

    return () => {
      closedByUs = true;
      window.clearTimeout(retryTimer);
      window.clearTimeout(staleTimer);
      socket?.close();
    };
  }, [interval, instrumentKey]);

  return status;
}
