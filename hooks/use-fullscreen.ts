"use client";

import { useCallback, useEffect, useState, type RefObject } from "react";

/**
 * Full screen for one element.
 *
 * Uses the browser Fullscreen API when available (true full screen, Esc to
 * exit). Where it is blocked (some iPhones, embedded frames) it falls back to
 * a CSS overlay that fills the window; Esc exits that too.
 */
export function useFullscreen<T extends HTMLElement>(ref: RefObject<T | null>) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isFallback, setIsFallback] = useState(false);

  useEffect(() => {
    const onChange = () => {
      setIsFullscreen(document.fullscreenElement === ref.current && ref.current !== null);
    };
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, [ref]);

  // Esc closes the CSS fallback (the native mode handles Esc itself).
  useEffect(() => {
    if (!isFallback) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsFallback(false);
        setIsFullscreen(false);
      }
    };
    document.body.classList.add("chart-fullscreen-lock");
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.classList.remove("chart-fullscreen-lock");
      window.removeEventListener("keydown", onKey);
    };
  }, [isFallback]);

  const enter = useCallback(async () => {
    const element = ref.current;
    if (!element) return;
    if (document.fullscreenEnabled && element.requestFullscreen) {
      try {
        await element.requestFullscreen({ navigationUI: "hide" });
        return;
      } catch {
        // Fall through to the CSS overlay.
      }
    }
    setIsFallback(true);
    setIsFullscreen(true);
  }, [ref]);

  const exit = useCallback(async () => {
    if (isFallback) {
      setIsFallback(false);
      setIsFullscreen(false);
      return;
    }
    if (document.fullscreenElement) {
      try {
        await document.exitFullscreen();
      } catch {
        setIsFullscreen(false);
      }
    }
  }, [isFallback]);

  const toggle = useCallback(() => {
    void (isFullscreen ? exit() : enter());
  }, [isFullscreen, enter, exit]);

  return { isFullscreen, isFallback, toggle, exit };
}
