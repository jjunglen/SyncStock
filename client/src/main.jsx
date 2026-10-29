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
