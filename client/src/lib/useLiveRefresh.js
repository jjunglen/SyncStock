import { useEffect, useRef } from "react";

// Runs load() now, then again every 30 seconds while the page is on
// screen and right away when the person comes back to the tab — so
// stock changes in Shopify show up without reloading.
export default function useLiveRefresh(load, intervalMs = 30 * 1000) {
  const latest = useRef(load);
  useEffect(() => {
    latest.current = load;
  });

  useEffect(() => {
    latest.current();
    const refresh = () => {
      if (document.visibilityState === "visible") latest.current();
    };
    const timer = setInterval(refresh, intervalMs);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [intervalMs]);
}
