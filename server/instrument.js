// Error alerts (Sentry). Loaded first in server.js so it can watch
// everything after it. Off unless SENTRY_DSN is set — set it on Railway
// only, so local testing doesn't send alerts.
require("dotenv").config();
const Sentry = require("@sentry/node");

if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || "development",
    // The code reports failures with console.error (webhooks, emails,
    // the digest) — send each one to Sentry too
    integrations: [Sentry.captureConsoleIntegration({ levels: ["error"] })],
    // Errors only, no performance tracing
    tracesSampleRate: 0,
    // No IP addresses, cookies or request bodies
    sendDefaultPii: false,
  });
}

module.exports = Sentry;
