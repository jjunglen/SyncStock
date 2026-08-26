const { Store } = require("../models/index.js");

// sneakershop.syncstock.io -> sneakershop
const extractSubdomain = (hostname) => {
    if (hostname === "localhost" || hostname.startsWith("127.0.0.1")) {
        return null;

    }

    const parts = hostname.split(".");
    if (parts.length < 3) return null;
    return parts[0];

};

// Uses on customer-facing routes: browsing, setting alerts, dashboard
const resolveStoreFromSubdomain = async (req, res, next) => {
    try {
        let subdomain = extractSubdomain(req.hostname);

        if (!subdomain && process.env.NODE_ENV !== "production") {
            subdomain = req.headers["x-dev-store"] || req.query.store || null;

        }

        if (!subdomain) {
            return res.status(400).json({ success: false, message: "Could not determine store" })
        }

        const store = await Store.findOne({ where: { subdomain } });

        if (!store || store.status !== "active") {
            return res.status(404).json({ success: false, message: "Store not found or not active"})
        }

        req.store = store;
        next();

    } catch(error) {
        return res.status(500).json({ success: false, message: "Failed to resolve store"});

    }
};

const resolveStoreFromShopifyDomain = async (req, res, next) => {
    try {
        const shopDomain = req.headers["x-shopify-shop-domain"];

        if (!shopDomain) {
            return res.status(400).json({ success: false, message: "Missing store domain header" });

        }

        const store = await Store.findOne({ where: { shopify_domain: shopDomain }});

        if (!store) {
            return res.status(404).json({ success: false, message: "No store for this shop domain"});

        }

        req.store = store
        next();

    } catch (error) {
        return res.status(500).json({ success: false, message: "Failed to resolve store"})
    }
}

module.exports = { resolveStoreFromShopifyDomain, resolveStoreFromSubdomain };
