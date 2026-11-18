import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";

// A tab opened before a deploy keeps running the old version until it's
// refreshed. Each build writes its id to /version.json (vite.config.js);
// this checks it every few minutes and when the person comes back to the
// tab. When it has changed, the next move to another page loads it fresh
// (the new page is already in the address bar, so nothing is lost; a form
// being filled in is never reloaded out from under them).
const BUILD_ID = import.meta.env.VITE_BUILD_ID;
const CHECK_MS = 5 * 60 * 1000;
// The version this tab last reloaded for, so a CDN still serving the old
// page for a moment can't cause a reload loop
const RELOADED_KEY = "syncstock_reloaded_for_version";

let latest = null;

const check = async () => {
  try {
    const res = await fetch(`/version.json?t=${Date.now()}`, { cache: "no-store" });
    if (!res.ok) return;
    const { version } = await res.json();
    if (typeof version === "string" && version) latest = version;
  } catch {
    // Offline or a deploy in progress: try again next time
  }
};

const updateWaiting = () => {
  if (!latest || latest === BUILD_ID) return false;
  try {
    return sessionStorage.getItem(RELOADED_KEY) !== latest;
  } catch {
    return true;
  }
};

export function useAppUpdate() {
  const { pathname } = useLocation();
  const firstPath = useRef(pathname);

  useEffect(() => {
    if (!import.meta.env.PROD || !BUILD_ID) return;
    const onVisible = () => {
      if (document.visibilityState === "visible") check();
    };
    const timer = setInterval(onVisible, CHECK_MS);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  // Moved to another page: load it as the new version if one is out
  useEffect(() => {
    if (pathname === firstPath.current) return;
    firstPath.current = pathname;
    if (!updateWaiting()) return;
    try {
      sessionStorage.setItem(RELOADED_KEY, latest);
    } catch {
      // Storage blocked: the check above still stops after the reload
    }
    window.location.reload();
  }, [pathname]);
}
