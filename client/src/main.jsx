import React from "react";
import ReachDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import * as Sentry from "@sentry/react";
import "./App.css"
import App from './App.jsx'
import { IN_SHOPIFY_ADMIN, SHOPIFY_ADMIN_BASE, leaveIfOutsideAdmin } from "./lib/shopifyAdmin.js";

// Error alerts for the browser side. Off unless VITE_SENTRY_DSN is set
// (set it on Vercel only). No performance tracing or session replays.
if (import.meta.env.VITE_SENTRY_DSN) {
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    environment: import.meta.env.MODE,
    sendDefaultPii: false,
  });
}

// After a deploy, a page opened before it asks for script files that no
// longer exist (each build renames them). Reload once to pick up the new
// version instead of breaking. Once per minute at most, so a real outage
// can't cause a reload loop.
const RELOAD_KEY = "syncstock_reloaded_for_update";
window.addEventListener("vite:preloadError", (event) => {
  let last = 0;
  try {
    last = Number(sessionStorage.getItem(RELOAD_KEY)) || 0;
  } catch {
    // Storage blocked — still reload once
  }
  if (Date.now() - last < 60_000) return;
  event.preventDefault();
  try {
    sessionStorage.setItem(RELOAD_KEY, String(Date.now()));
  } catch {
    // Storage blocked
  }
  window.location.reload();
});

// The admin page opened outside the Shopify admin hands over instead
if (!leaveIfOutsideAdmin()) ReachDOM.createRoot(document.getElementById('root'), {
  // React 19 hands crashes here instead of the console
  onUncaughtError: Sentry.reactErrorHandler(),
  onRecoverableError: Sentry.reactErrorHandler(),
}).render(
  <React.StrictMode>
    {/* Inside the Shopify admin, every page lives under /shopify */}
    <BrowserRouter basename={IN_SHOPIFY_ADMIN ? SHOPIFY_ADMIN_BASE : undefined}>
      <App />
    </BrowserRouter>
  </React.StrictMode>
)
