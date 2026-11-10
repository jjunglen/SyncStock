const express = require("express");
const { fn, col } = require("sequelize");
const { Store, Inventory } = require("../models/index.js");
const { listable } = require("../controllers/inventory.controller.js");
const { productPath } = require("../utils/productPath.js");

const router = express.Router();

// Each store's robots.txt and product sitemap. The store sites
// (<store>.syncstock.io) are served by Vercel, which forwards
// /robots.txt and /sitemap-products.xml here with ?store=<subdomain>
// (client/vercel.json). www.syncstock.io keeps its own static files.

const MAX_URLS = 45000; // a sitemap holds at most 50,000

const findStore = async (subdomain) => {
  const sub = String(subdomain || "").toLowerCase();
  if (!/^[a-z0-9-]{1,63}$/.test(sub)) return null;
  const store = await Store.findOne({ where: { subdomain: sub } });
  if (!store || store.status !== "active" || store.uninstalled_at || store.onboarding_step !== "complete") return null;
  return store;
};

const xmlEscape = (s) =>
  String(s).replace(/[<>&'"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" })[c]);

// GET /api/seo/robots.txt?store=laboratory
router.get("/robots.txt", async (req, res) => {
  try {
    const store = await findStore(req.query.store);
    res.type("text/plain");
    res.set("Cache-Control", "public, max-age=3600");
    // Not a live store: keep search engines out
    if (!store) return res.send("User-agent: *\nDisallow: /\n");
    // The merchant turned search off: crawlers may still visit, so they
    // see each page's noindex and drop pages already listed, but there's
    // no sitemap to find more
    if (store.search_indexing === false) return res.send("User-agent: *\nAllow: /\n");
    const site = `https://${store.subdomain}.syncstock.io`;
    return res.send(
      [
        "User-agent: *",
        "Allow: /",
        // Sign-in and signed-in pages: nothing to index there
        "Disallow: /store/",
        "Disallow: /onboarding",
        "",
        `Sitemap: ${site}/sitemap-products.xml`,
        "",
      ].join("\n"),
    );
  } catch (error) {
    console.error("Store robots.txt error:", error.message);
    return res.status(500).type("text/plain").send("");
  }
});

// GET /api/seo/sitemap.xml?store=laboratory — the store's home page,
// Browse, and a page for every in-stock product
router.get("/sitemap.xml", async (req, res) => {
  try {
    const store = await findStore(req.query.store);
    if (!store || store.search_indexing === false) return res.status(404).type("text/plain").send("Store not found");
    const site = `https://${store.subdomain}.syncstock.io`;

    const products = await Inventory.findAll({
      where: listable(store),
      attributes: [
        "shopify_product_id",
        [fn("MAX", col("product_name")), "name"],
        [fn("MAX", col("created_at")), "lastmod"],
      ],
      group: ["shopify_product_id"],
      order: [[fn("MAX", col("created_at")), "DESC"]],
      limit: MAX_URLS,
      raw: true,
    });

    const url = (loc, lastmod) =>
      `  <url><loc>${xmlEscape(loc)}</loc>${lastmod ? `<lastmod>${new Date(lastmod).toISOString()}</lastmod>` : ""}</url>`;
    const xml = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
      url(`${site}/`),
      url(`${site}/browse`, products[0]?.lastmod),
      ...products.map((p) => url(site + productPath(p.shopify_product_id, p.name), p.lastmod)),
      "</urlset>",
      "",
    ].join("\n");

    res.type("application/xml");
    res.set("Cache-Control", "public, max-age=3600");
    return res.send(xml);
  } catch (error) {
    console.error("Store sitemap error:", error.message);
    return res.status(500).type("text/plain").send("Sitemap unavailable");
  }
});

module.exports = router;
