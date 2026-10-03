const { Store } = require("../models/index.js");
const {
  SELECTABLE_CATEGORIES,
  COMING_SOON_CATEGORIES,
  enabledCategories,
  logoUrl,
} = require("../utils/storeSettings.js");
const { APPS } = require("../utils/shopifyApps.js");

const MAX_LOGO_BYTES = 300 * 1024;

// One-click links into the store's Shopify theme editor with SyncStock's
// theme app extension (shopify-app/extensions/syncstock-theme) ready to
// add: the "Restock alerts" section (blocks/restock-banner.liquid) and the
// floating button app embed (blocks/restock-button.liquid). Each needs the
// client ID of the app the store installed.
const themeLinks = (store) => {
  // The client ID only — it's public (it's in the app's TOML file)
  const clientId = APPS[store.shopify_app || "custom"]?.clientId();
  if (!clientId) return null;
  const editor = `https://${store.shopify_domain}/admin/themes/current/editor`;
  return {
    section: `${editor}?template=index&addAppBlockId=${clientId}/restock-banner&target=newAppsSection`,
    button: `${editor}?context=apps&template=index&activateAppId=${clientId}/restock-button`,
  };
};

// What the settings page shows
const settingsFor = (store) => ({
  enabled_categories: enabledCategories(store),
  selectable_categories: SELECTABLE_CATEGORIES,
  coming_soon_categories: COMING_SOON_CATEGORIES,
  brand_color: store.brand_color || null,
  logo_url: logoUrl(store),
  weekly_report: store.weekly_report,
  theme_links: themeLinks(store),
});

// GET /api/store/settings (store admin)
const getSettings = (req, res) =>
  res.status(200).json({ success: true, data: settingsFor(req.store) });

// PUT /api/store/settings (store admin)
// { enabled_categories?, brand_color? (hex or null), weekly_report? }
const updateSettings = async (req, res) => {
  try {
    const { enabled_categories, brand_color, weekly_report } = req.body;
    const changes = {};

    if (enabled_categories !== undefined) {
      const chosen = Array.isArray(enabled_categories)
        ? [...new Set(enabled_categories)].filter((c) => SELECTABLE_CATEGORIES.includes(c))
        : [];
      if (chosen.length === 0) {
        return res
          .status(400)
          .json({ success: false, message: "Keep at least one category on" });
      }
      changes.enabled_categories = chosen;
    }

    if (brand_color !== undefined) {
      if (brand_color !== null && !/^#[0-9a-f]{6}$/i.test(brand_color)) {
        return res.status(400).json({ success: false, message: "Pick a valid color" });
      }
      changes.brand_color = brand_color ? brand_color.toLowerCase() : null;
    }

    if (weekly_report !== undefined) changes.weekly_report = !!weekly_report;

    await req.store.update(changes);
    return res.status(200).json({ success: true, data: settingsFor(req.store) });
  } catch (error) {
    console.error("Update store settings error:", error.message);
    return res.status(500).json({ success: false, message: "Failed to save settings" });
  }
};

// Recognizes PNG, JPEG and WebP by their first bytes — the browser's
// Content-Type isn't trusted, and SVG (which can carry scripts) is refused
const imageType = (buf) => {
  if (buf.length > 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return "image/png";
  }
  if (buf.length > 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  if (buf.length > 12 && buf.toString("ascii", 0, 4) === "RIFF" && buf.toString("ascii", 8, 12) === "WEBP") {
    return "image/webp";
  }
  return null;
};

// PUT /api/store/logo (store admin) — the raw image file as the body
const uploadLogo = async (req, res) => {
  try {
    const data = req.body;
    if (!Buffer.isBuffer(data) || data.length === 0) {
      return res.status(400).json({ success: false, message: "Choose an image to upload" });
    }
    if (data.length > MAX_LOGO_BYTES) {
      return res.status(400).json({ success: false, message: "Logo must be under 300 KB" });
    }
    const mime = imageType(data);
    if (!mime) {
      return res.status(400).json({ success: false, message: "Logo must be a PNG, JPG or WebP" });
    }

    await req.store.update({ logo_data: data, logo_mime: mime, logo_updated_at: new Date() });
    return res.status(200).json({ success: true, data: settingsFor(req.store) });
  } catch (error) {
    console.error("Upload logo error:", error.message);
    return res.status(500).json({ success: false, message: "Failed to upload logo" });
  }
};

// DELETE /api/store/logo (store admin)
const deleteLogo = async (req, res) => {
  try {
    await req.store.update({ logo_data: null, logo_mime: null, logo_updated_at: null });
    return res.status(200).json({ success: true, data: settingsFor(req.store) });
  } catch (error) {
    console.error("Delete logo error:", error.message);
    return res.status(500).json({ success: false, message: "Failed to remove logo" });
  }
};

// GET /api/store/logo/:id — public, for the shopper site and emails
const serveLogo = async (req, res) => {
  try {
    const store = await Store.unscoped().findByPk(req.params.id, {
      attributes: ["logo_data", "logo_mime"],
    });
    if (!store?.logo_data) return res.status(404).end();
    res.set({
      "Content-Type": store.logo_mime,
      // The URL changes (?v=) when the logo does, so it can be cached long
      "Cache-Control": "public, max-age=604800, immutable",
      "X-Content-Type-Options": "nosniff",
      // Emails and storefronts load it from other sites
      "Cross-Origin-Resource-Policy": "cross-origin",
    });
    return res.send(store.logo_data);
  } catch (error) {
    // A malformed id is just "not found"
    return res.status(404).end();
  }
};

module.exports = { getSettings, updateSettings, uploadLogo, deleteLogo, serveLogo };
