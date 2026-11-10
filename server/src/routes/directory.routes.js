const express = require("express");
const { Store } = require("../models/index.js");
const { publicLimiter } = require("../middleware/rateLimit.middleware.js");
const { enabledCategories, otherCategoryName, logoUrl } = require("../utils/storeSettings.js");

const router = express.Router();

// GET /api/directory — the "Joined stores" page on syncstock.io: live
// stores that chose to be listed (Store settings → "List my store",
// stores.app_listed). Public, no sign-in. Only what the store's own
// shopper site already shows: name, logo, color, categories, address.
router.get("/", publicLimiter, async (req, res) => {
  try {
    const stores = await Store.findAll({
      where: { status: "active", uninstalled_at: null, onboarding_step: "complete", app_listed: true },
      order: [["name", "ASC"]],
      limit: 200,
    });
    const data = stores.map((s) => ({
      name: s.name,
      subdomain: s.subdomain,
      url: `https://${s.subdomain}.syncstock.io/`,
      logo_url: logoUrl(s),
      brand_color: s.brand_color || null,
      categories: enabledCategories(s),
      other_name: otherCategoryName(s),
    }));
    res.set("Cache-Control", "public, max-age=300");
    return res.status(200).json({ success: true, data });
  } catch (error) {
    console.error("Store directory error:", error.message);
    return res.status(500).json({ success: false, message: "Couldn't load stores" });
  }
});

module.exports = router;
