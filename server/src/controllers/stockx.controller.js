const { searchStockX } = require("../services/stockx.service.js");
const fetch = require("node-fetch");

const getAuthUrl = (req, res) => {
  const params = new URLSearchParams({
    client_id: process.env.STOCKX_CLIENT_ID,
    redirect_uri: `${process.env.BACKEND_URL}/api/stockx/callback`,
    response_type: "code",
    scope: "offline_access",
    audience: "gateway.stockx.com",
  });

  res.redirect(`https://accounts.stockx.com/authorize?${params.toString()}`);
};

const handleOAuthCallback = async (req, res) => {
  const { code } = req.query;

  if (!code) {
    return res.status(400).send("<h2>Error - missing code from StockX</h2>");
  }

  try {
    const response = await fetch("https://accounts.stockx.com/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        grant_type: "authorization_code",
        client_id: process.env.STOCKX_CLIENT_ID,
        client_secret: process.env.STOCKX_CLIENT_SECRET,
        code,
        redirect_uri: `${process.env.BACKEND_URL}/api/stockx/callback`,
      }),
    });

    const data = await response.json();

    if (data.refresh_token) {
      res.send(`
        <html>
        <body style="font-family: monospace; padding: 40px; background: #0a0a0a; color: white;">
          <h2 style="color: #2dd4bf;">StockX OAuth Success</h2>
          <p>Copy this refresh token and add it to your env vars as <strong>STOCKX_REFRESH_TOKEN</strong>:</p>
          <div style="background: #111; border: 1px solid #27272a; padding: 16px; border-radius: 8px; margin: 16px 0; word-break: break-all;">
            ${data.refresh_token}
          </div>
        </body>
        </html>
      `);
    } else {
      res.send(`
        <html>
        <body style="font-family: monospace; padding: 40px; background: #0a0a0a; color: white;">
          <h2 style="color: #ef4444;">StockX OAuth Failed</h2>
          <pre style="background: #111; padding: 16px; border-radius: 8px;">${JSON.stringify(data, null, 2)}</pre>
        </body>
        </html>
      `);
    }
  } catch (error) {
    console.error("StockX OAuth callback error:", error.message);
    res.status(500).send(`<h2>Server error: ${error.message}</h2>`);
  }
};

const searchCatalog = async (req, res) => {
  try {
    const { q } = req.query;

    if (!q) {
      return res
        .status(400)
        .json({ success: false, message: "Missing search query" });
    }

    const results = await searchStockX(q);

    return res.status(200).json({ success: true, data: results });
  } catch (error) {
    console.error("Stockx search error:", error.message);
    return res.status(500).json({ success: false, message: "Search failed" });
  }
};

const cacheImage = async (req, res) => {
  try {
    const { url_key, image_url } = req.body;
    if (!url_key || !image_url) {
      return res
        .status(400)
        .json({ success: false, message: "Missing url_key or image_url" });
    }

    const { StockxImageCache } = require("../models/index.js");
    await StockxImageCache.upsert({ url_key, image_url });

    return res.status(200).json({ success: true, message: "Image cached" });
  } catch (error) {
    console.error("Cache image error:", error.message);
    return res
      .status(500)
      .json({ success: false, message: "Failed to cache image" });
  }
};

module.exports = { searchCatalog, handleOAuthCallback, getAuthUrl, cacheImage };
