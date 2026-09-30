require("dotenv").config();
const fetch = require("node-fetch");
const { withStockxImages } = require("./stockxImages.service.js");

const STOCKX_BASE_URL = "https://api.stockx.com/v2";

let cachedToken = null;
let tokenExpiresAt = null;

const getAccessToken = async () => {
  if (cachedToken && tokenExpiresAt && Date.now() < tokenExpiresAt) {
    return cachedToken;
  }

  const response = await fetch("https://accounts.stockx.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      grant_type: "refresh_token",
      client_id: process.env.STOCKX_CLIENT_ID,
      client_secret: process.env.STOCKX_CLIENT_SECRET,
      refresh_token: process.env.STOCKX_REFRESH_TOKEN,
      audience: "gateway.stockx.com",
    }),
  });

  const data = await response.json();

  if (!data.access_token) {
    throw new Error("Failed to get Stockx access token");
  }

  cachedToken = data.access_token;
  tokenExpiresAt = Date.now() + 55 * 60 * 1000;

  return cachedToken;
};

// Recent searches are reused for 10 minutes — every store's shoppers share
// one StockX key, and popular searches ("jordan 4") repeat a lot
const SEARCH_CACHE_MS = 10 * 60 * 1000;
const SEARCH_CACHE_MAX = 500;
const searchCache = new Map();

const searchStockX = async (query, pageSize = 10) => {
  const key = `${query.trim().toLowerCase().replace(/\s+/g, " ")}|${pageSize}`;
  const hit = searchCache.get(key);
  if (hit && Date.now() - hit.at < SEARCH_CACHE_MS) return hit.results;

  const results = await fetchStockXSearch(query, pageSize);
  if (searchCache.size >= SEARCH_CACHE_MAX) {
    searchCache.delete(searchCache.keys().next().value); // drop the oldest
  }
  searchCache.set(key, { at: Date.now(), results });
  return results;
};

const fetchStockXSearch = async (query, pageSize) => {
  const token = await getAccessToken();

  const response = await fetch(
    `${STOCKX_BASE_URL}/catalog/search?query=${encodeURIComponent(query)}&pageNumber=1&pageSize=${pageSize}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "x-api-key": process.env.STOCKX_API_KEY,
        "Content-Type": "application/json",
      },
    },
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Stockx search failed");
  }

  // Photos are checked and remembered in stockxImages.service.js
  return withStockxImages(data.products || []);
};

module.exports = { searchStockX };
