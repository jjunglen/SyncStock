require("dotenv").config();
const express = require("express");
const cors = require("cors");
const cron = require("node-cron");
const cookieParser = require("cookie-parser");
const passport = require("./src/config/passport.js");
const { sequelize, connectDB } = require("./src/config/database.js");
const {
  flushPendingNotifications,
} = require("./src/services/digest.service.js");
require("./src/models/index.js");
const authRoutes = require("./src/routes/auth.routes.js");
const googleAuthRoutes = require("./src/routes/google.auth.routes.js");
const storeRoutes = require("./src/routes/store.routes.js");
const inventoryRoutes = require("./src/routes/inventory.routes.js");
const alertRoutes = require("./src/routes/alert.routes.js");
const notificationRoutes = require("./src/routes/notification.routes.js");
const pushRoutes = require("./src/routes/push.routes.js");
const userRoutes = require("./src/routes/user.routes.js");
const webhookRoutes = require("./src/routes/webhook.routes.js");
const redirectRoutes = require("./src/routes/redirect.routes.js");
const twilioRoutes = require("./src/routes/twilio.routes.js");
const { apiLimiter } = require("./src/middleware/rateLimit.middleware.js");

const app = express();
const PORT = process.env.PORT || 5000;

app.set("trust proxy", 1);

// Matches any *.syncstock.io subdomain, plus localhost in dev — can't
// use a fixed origin list like a single-tenant app since merchant
// subdomains are created dynamically at signup
const allowedOriginPattern = /^https:\/\/([a-z0-9-]+\.)?syncstock\.io$/;

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true); // server-to-server, curl, etc.
      if (
        process.env.NODE_ENV !== "production" &&
        origin.startsWith("http://localhost")
      ) {
        return callback(null, true);
      }
      if (allowedOriginPattern.test(origin)) {
        return callback(null, true);
      }
      // 403, not a server error — the site asking just isn't allowed
      return callback(Object.assign(new Error("Not allowed by CORS"), { status: 403 }));
    },
    credentials: true,
  }),
);

// After CORS on purpose: rate-limited (429) responses still get CORS
// headers, so the browser can read "Too many requests" instead of a
// generic network error — and preflight OPTIONS requests, which CORS
// answers itself, no longer count against the limit
app.use("/api", apiLimiter);

app.use(cookieParser());
app.use(passport.initialize());

// Every minute: sends each shopper's digest once their batch has
// settled (see QUIET_MS in digest.service.js)
cron.schedule("* * * * *", () => {
  flushPendingNotifications().catch((err) =>
    console.error("Digest flush error:", err.message),
  );
});

// Webhook routes need the RAW body for HMAC signature verification —
// everything else gets normal JSON parsing
app.use((req, res, next) => {
  if (req.originalUrl.startsWith("/api/webhooks")) {
    next();
  } else {
    express.json()(req, res, next);
  }
});
app.use("/api/webhooks", express.raw({ type: "application/json" }));

app.use("/api/auth", authRoutes);
app.use("/api/auth", googleAuthRoutes);
app.use("/api/store", storeRoutes);
app.use("/api/inventory", inventoryRoutes);
app.use("/api/alerts", alertRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/push", pushRoutes);
app.use("/api/users", userRoutes);
app.use("/api/webhooks/shopify", webhookRoutes);
app.use("/api/redirect", redirectRoutes);
app.use("/api/phone", twilioRoutes);
app.use("/api/analytics", require("./src/routes/analytics.routes.js"));
// app.use("/api/stockx", require("./src/routes/stockx.routes.js")); // pending StockX API approval

app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok", message: "Syncstock API is running" });
});

app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});

app.use((err, req, res, next) => {
  const status = err.status || 500;
  // Only real failures are logged; refused requests (e.g. CORS) are expected
  if (status >= 500) console.error("Server error:", err.message);
  res
    .status(status)
    .json({ error: err.message || "Internal server error" });
});

const startServer = async () => {
  try {
    await connectDB();
    await sequelize.sync({ force: false });
    console.log("Models synced");
    app.listen(PORT, () => {
      console.log(`Syncstock server running on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error("Failed to start server:", err.message);
    process.exit(1);
  }
};

startServer();
