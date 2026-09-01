require("dotenv").config();
const fetch = require("node-fetch");
const { StockxImageCache } = require("../models/index.js");

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

const urlKeyToImageName = (urlKey) => {
  return urlKey
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join("-");
};

const searchStockX = async (query, pageSize = 10) => {
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

  const products = data.products || [];

  const urlKeys = products.map((product) => product.urlKey);
  const cached = await StockxImageCache.findAll({
    where: { url_key: urlKeys },
  });

  const cacheMap = {};
  cached.forEach((c) => {
    cacheMap[c.url_key] = c.image_url;
  });

  return products.map((product) => ({
    ...product,
    image_url:
      cacheMap[product.urlKey] ||
      `https://images.stockx.com/images/${urlKeyToImageName(product.urlKey)}-Product.jpg?fit=fill&bg=FFFFFF&w=400&h=300&fm=webp&auto=compress&q=90`,
    image_cached: !!cacheMap[product.urlKey],
  }));
};

module.exports = { searchStockX };
