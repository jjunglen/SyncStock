const rateLimit = require("express-rate-limit");

// Login/signup/password reset — prevents brute force & credential stuffing
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: {
    success: false,
    message: "Too many attempts, please try again later",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Public inventory browsing — prevents scraping
const publicLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: { success: false, message: "Too many requests, please slow down" },
  standardHeaders: true,
  legacyHeaders: false,
});

// Search suggestions — a request per pause in typing, so they get their
// own allowance rather than using up browsing's (publicLimiter)
const suggestLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 600,
  message: { success: false, message: "Too many requests, please slow down" },
  standardHeaders: true,
  legacyHeaders: false,
});

// Baseline for everything else
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  message: { success: false, message: "Too many requests, please slow down" },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = { authLimiter, publicLimiter, suggestLimiter, apiLimiter };
