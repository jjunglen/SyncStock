const crypto = require("crypto");

// Who's asking, for counting people (search monitor, mobile vs
// desktop) without storing who they are: an account id when signed in,
// otherwise a hash of IP + browser (never stored raw), salted with the
// server secret.
const visitorFor = (req) => {
  if (req.account?.id) return req.account.id;
  const ip = (req.headers["x-forwarded-for"] || "").split(",")[0].trim() || req.ip || "";
  return crypto
    .createHash("sha256")
    .update(`${process.env.JWT_SECRET}|${ip}|${req.headers["user-agent"] || ""}`)
    .digest("hex")
    .slice(0, 64);
};

// Search engines and link previews aren't shoppers
const BOT = /bot|crawl|spider|slurp|bingpreview|facebookexternalhit|headless|lighthouse|preview/i;
const isBot = (req) => BOT.test(req.headers["user-agent"] || "");

// "mobile", "tablet" or "desktop" from the browser's user agent. (iPads
// on iPadOS 13+ say they're a Mac, so they count as desktop.)
const deviceFor = (req) => {
  const ua = req.headers["user-agent"] || "";
  if (/iPad|Tablet|PlayBook|Silk|Kindle/i.test(ua) || (/Android/i.test(ua) && !/Mobi/i.test(ua))) return "tablet";
  if (/Mobi|iPhone|iPod|Android|Windows Phone/i.test(ua)) return "mobile";
  return "desktop";
};

module.exports = { visitorFor, isBot, deviceFor };
