"use client";

import { useEffect, useRef } from "react";

const HEARTBEAT_INTERVAL_MS = 30_000; // flush every 30 seconds

export function SectionTimer({ sectionId }: { sectionId: string }) {
  const accumulatedRef = useRef(0);
  const lastTickRef = useRef<number>(Date.now());
  const activeRef = useRef(!document.hidden);

  async function flush() {
    const delta = accumulatedRef.current;
    if (delta < 1) return;
    accumulatedRef.current = 0;
    try {
      await fetch("/api/section-time", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ section_id: sectionId, seconds_delta: delta }),
        keepalive: true, // ensures the request survives page unload
      });
    } catch {
      // silently ignore — timing data is best-effort
    }
  }

  useEffect(() => {
    // Accumulate active seconds every second
    const ticker = window.setInterval(() => {
      if (!activeRef.current) {
        lastTickRef.current = Date.now();
        return;
      }
      const now = Date.now();
      const elapsed = (now - lastTickRef.current) / 1000;
      lastTickRef.current = now;
      accumulatedRef.current += elapsed;
    }, 1000);

    // Flush to server every 30 seconds
    const heartbeat = window.setInterval(flush, HEARTBEAT_INTERVAL_MS);

    // Pause accumulation when tab is hidden
    function onVisibilityChange() {
      activeRef.current = !document.hidden;
      lastTickRef.current = Date.now();
    }
    document.addEventListener("visibilitychange", onVisibilityChange);

    // Flush on page leave
    function onUnload() {
      flush();
    }
    window.addEventListener("pagehide", onUnload);
    window.addEventListener("beforeunload", onUnload);

    return () => {
      clearInterval(ticker);
      clearInterval(heartbeat);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("pagehide", onUnload);
      window.removeEventListener("beforeunload", onUnload);
      flush();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sectionId]);

  // Renders nothing — purely a side-effect component
  return null;
}
