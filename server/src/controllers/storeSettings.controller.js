const { Store } = require("../models/index.js");
const {
  SELECTABLE_CATEGORIES,
  COMING_SOON_CATEGORIES,
  enabledCategories,
  logoUrl,
} = require("../utils/storeSettings.js");
const { APPS } = require("../utils/shopifyApps.js");
const { STORY_FONTS } = require("../utils/storyDetails.js");
const {
  latestItem,
  storyImage,
  sendStoriesEmail,
  DAY_MS,
} = require("../services/stories.service.js");

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
  // Phone app store list — read-only until the app launches (the
  // settings switch shows "Coming soon")
  app_listed: store.app_listed,
  instagram_stories: store.instagram_stories,
  story_frequency: store.story_frequency,
  story_background: store.story_background,
  story_box_color: store.story_box_color,
  story_text_color: store.story_text_color,
  story_font: store.story_font,
  story_show_name: store.story_show_name,
  story_fonts: Object.entries(STORY_FONTS).map(([key, f]) => ({
    key,
    label: f.label,
    family: f.family,
    weight: f.weight,
    upper: !!f.upper,
  })),
  theme_links: themeLinks(store),
});

// GET /api/store/settings (store admin)
const getSettings = (req, res) =>
  res.status(200).json({ success: true, data: settingsFor(req.store) });

// PUT /api/store/settings (store admin)
// { enabled_categories?, brand_color? (hex or null), weekly_report?,
//   instagram_stories?, story_frequency? ("daily" | "batch"),
//   story_background?, story_box_color?, story_text_color? (hex),
//   story_font? (a STORY_FONTS key), story_show_name? }
const updateSettings = async (req, res) => {
  try {
    const { enabled_categories, brand_color, weekly_report, instagram_stories, story_frequency } = req.body;
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

    // Turning stories on: the first email covers the last day's arrivals
    if (instagram_stories !== undefined) {
      changes.instagram_stories = !!instagram_stories;
      if (instagram_stories && !req.store.instagram_stories) {
        changes.stories_checked_at = new Date(Date.now() - DAY_MS);
      }
    }

    if (story_frequency !== undefined) {
      if (!["daily", "batch"].includes(story_frequency)) {
        return res.status(400).json({ success: false, message: "Pick when to send stories" });
      }
      changes.story_frequency = story_frequency;
    }

    if (req.body.story_show_name !== undefined) changes.story_show_name = !!req.body.story_show_name;

    if (req.body.story_font !== undefined) {
      if (!STORY_FONTS[req.body.story_font]) {
        return res.status(400).json({ success: false, message: "Pick a font from the list" });
      }
      changes.story_font = req.body.story_font;
    }

    for (const field of ["story_background", "story_box_color", "story_text_color"]) {
      if (req.body[field] === undefined) continue;
      if (!/^#[0-9a-f]{6}$/i.test(req.body[field])) {
        return res.status(400).json({ success: false, message: "Pick a valid color" });
      }
      changes[field] = req.body[field].toLowerCase();
    }

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
// Logos are sent with their empty border trimmed, so a logo uploaded with
// lots of transparent or white space around it still fills the space
// it's shown in (shopper site header, emails). Trimmed once per version.
const trimmedLogos = new Map();
const MAX_TRIMMED = 50;
const trimmedLogo = async (store) => {
  const key = `${store.id}:${new Date(store.logo_updated_at || 0).getTime()}`;
  if (trimmedLogos.has(key)) return trimmedLogos.get(key);
  let logo = { data: store.logo_data, mime: store.logo_mime };
  try {
    const sharp = require("sharp"); // loaded on first use, not at startup
    const trimmed = await sharp(store.logo_data).trim().png().toBuffer();
    logo = { data: trimmed, mime: "image/png" };
  } catch {
    // Nothing to trim, or the image tools aren't available — send it as is
  }
  if (trimmedLogos.size >= MAX_TRIMMED) trimmedLogos.delete(trimmedLogos.keys().next().value);
  trimmedLogos.set(key, logo);
  return logo;
};

const serveLogo = async (req, res) => {
  try {
    const store = await Store.unscoped().findByPk(req.params.id, {
      attributes: ["id", "logo_data", "logo_mime", "logo_updated_at"],
    });
    if (!store?.logo_data) return res.status(404).end();
    const logo = await trimmedLogo(store);
    res.set({
      "Content-Type": logo.mime,
      // The URL changes (?v=) when the logo does, so it can be cached long
      "Cache-Control": "public, max-age=604800, immutable",
      "X-Content-Type-Options": "nosniff",
      // Emails and storefronts load it from other sites
      "Cross-Origin-Resource-Policy": "cross-origin",
    });
    return res.send(logo.data);
  } catch (error) {
    // A malformed id is just "not found"
    return res.status(404).end();
  }
};

// GET /api/store/stories/preview (store admin) — the newest in-stock
// product as an Instagram story, for the settings page
const previewStory = async (req, res) => {
  try {
    const item = await latestItem(req.store);
    if (!item) return res.status(404).json({ success: false, message: "No in-stock products with photos yet" });
    const jpg = await storyImage(req.store, item);
    res.set("Content-Type", "image/jpeg");
    res.set("Cache-Control", "private, no-store");
    return res.send(jpg);
  } catch (error) {
    console.error("Story preview error:", error.message);
    return res.status(500).json({ success: false, message: "Couldn't make a preview" });
  }
};

// POST /api/store/stories/test (store admin) — the last day's new
// arrivals (up to 10), emailed only to the person who asked. Doesn't
// change what the next daily email includes.
const sendTestStories = async (req, res) => {
  try {
    const to = new Date();
    const count = await sendStoriesEmail(req.store, {
      from: new Date(to.getTime() - DAY_MS),
      to,
      recipients: [{ email: req.account.email, full_name: req.account.full_name }],
      limit: 10,
    });
    if (!count) {
      return res.status(200).json({ success: true, data: { sent: 0 }, message: "No new arrivals in the last 24 hours" });
    }
    return res.status(200).json({ success: true, data: { sent: count }, message: `Sent ${count} to ${req.account.email}` });
  } catch (error) {
    console.error("Test stories error:", error.message);
    return res.status(500).json({ success: false, message: "Couldn't send the test email" });
  }
};

module.exports = { getSettings, updateSettings, uploadLogo, deleteLogo, serveLogo, previewStory, sendTestStories };
