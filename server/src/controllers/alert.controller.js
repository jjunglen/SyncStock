const { Op } = require("sequelize");
const { sequelize, Alert, User, Inventory, StockxImageCache } = require("../models/index.js");
const {
  isValidSize,
  isValidPrice,
  requireFields,
} = require("../utils/validate.js");
const { getUserAlertStats } = require("../services/alert.service.js");
const { sameSize } = require("../utils/otherSizes.js");
const { otherSizeChart } = require("../services/otherSizeChart.service.js");

const ALERT_CATEGORIES = Alert.getAttributes().category.values;

const resolveMembership = async (req, res) => {
  if (!req.account || !req.store) {
    res.status(401).json({ success: false, message: "Not logged in" });
    return null;
  }
  const membership = await User.findOne({
    where: { account_id: req.account.id, store_id: req.store.id },
  });
  if (!membership) {
    res
      .status(403)
      .json({ success: false, message: "Not a member of this store" });
    return null;
  }
  return membership;
};

const getAlerts = async (req, res) => {
  try {
    const membership = await resolveMembership(req, res);
    if (!membership) return;
    const alerts = await fillMissingImages(
      req.store,
      await Alert.findAll({
        where: { store_id: req.store.id, user_id: membership.id },
        order: [["created_at", "DESC"]],
      }),
    );
    const stats = await getUserAlertStats(membership.id);
    return res.status(200).json({ success: true, data: { alerts, stats } });
  } catch (error) {
    console.error("Get alerts error:", error.message);
    return res
      .status(500)
      .json({ success: false, message: "Failed to fetch alerts" });
  }
};

const getAlert = async (req, res) => {
  try {
    const membership = await resolveMembership(req, res);
    if (!membership) return;
    const alert = await Alert.findOne({
      where: { id: req.params.id, store_id: req.store.id },
    });
    if (!alert) {
      return res
        .status(404)
        .json({ success: false, message: "Alert not found" });
    }
    if (alert.user_id !== membership.id) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }
    return res.status(200).json({ success: true, data: alert });
  } catch (error) {
    console.error("Get alert error:", error.message);
    return res
      .status(500)
      .json({ success: false, message: "Failed to fetch alert" });
  }
};

// Alert photos may only come from StockX or Shopify's image CDN — never
// an arbitrary address typed into the request
const IMAGE_HOSTS = ["images.stockx.com", "cdn.shopify.com"];
const safeImageUrl = (value) => {
  try {
    const url = new URL(String(value));
    return url.protocol === "https:" && IMAGE_HOSTS.includes(url.hostname) ? url.toString() : null;
  } catch {
    return null;
  }
};

// Older alerts saved without a photo borrow one: the store's own listing
// of the same shoe, else the StockX photo remembered for it
const fillMissingImages = async (store, alerts) => {
  const missing = alerts.filter((a) => !a.image_url);
  if (missing.length === 0) return alerts;

  const names = [...new Set(missing.map((a) => a.product_name.toLowerCase()))];
  const listings = await Inventory.findAll({
    where: {
      store_id: store.id,
      image_url: { [Op.ne]: null },
      [Op.and]: sequelize.where(sequelize.fn("lower", sequelize.col("product_name")), { [Op.in]: names }),
    },
    attributes: ["product_name", "image_url"],
  });
  const byName = new Map(listings.map((l) => [l.product_name.toLowerCase(), l.image_url]));

  const keys = missing.map((a) => a.stockx_url_key).filter(Boolean);
  const cached = keys.length
    ? await StockxImageCache.findAll({ where: { url_key: keys, image_url: { [Op.ne]: null } } })
    : [];
  const byKey = new Map(cached.map((c) => [c.url_key, c.image_url]));

  return alerts.map((a) => {
    if (a.image_url) return a.toJSON();
    return {
      ...a.toJSON(),
      image_url: byName.get(a.product_name.toLowerCase()) || byKey.get(a.stockx_url_key) || null,
    };
  });
};

// "New or pre-owned" choices on an alert (Alert.condition_preference)
const CONDITIONS = ["either", "brand_new", "pre_owned"];
const MAX_SIZES_PER_REQUEST = 12;

const createAlert = async (req, res) => {
  try {
    const membership = await resolveMembership(req, res);
    if (!membership) return;

    let {
      product_name,
      category = "sneakers",
      sku,
      size,
      min_price,
      max_price,
      notify_email,
      notify_inapp,
      stockx_product_id,
      stockx_url_key,
      image_url,
      condition_preference = "either",
      store_product_id,
    } = req.body;

    if (!CONDITIONS.includes(condition_preference)) {
      return res.status(400).json({ success: false, message: "Invalid condition" });
    }

    if (!ALERT_CATEGORIES.includes(category)) {
      return res.status(400).json({ success: false, message: "Invalid category" });
    }

    // Several sizes at once (`sizes`) make one alert per size; `size`
    // alone still works. Trading cards have no size.
    let sizes =
      category === "trading_cards"
        ? [null]
        : [...new Set((Array.isArray(req.body.sizes) ? req.body.sizes : [size]).map((s) => String(s ?? "").trim()).filter(Boolean))];

    // "Track by name" (Track page): any "other" item whose name has these
    // words, in sizes from the store's size chart — or any size
    const byName = req.body.match === "keywords";
    if (byName) {
      if (category !== "other") {
        return res.status(400).json({ success: false, message: "Tracking by name is only for this store's other items" });
      }
      product_name = String(product_name || "").replace(/\s+/g, " ").trim();
      if (product_name.length < 2 || product_name.length > 60) {
        return res.status(400).json({ success: false, message: "Type 2 to 60 characters to track" });
      }
      const chart = (await otherSizeChart(req.store)).sizes;
      const asked = sizes.filter((s) => s !== null);
      sizes = asked.map((s) => chart.find((c) => sameSize(c, s))).filter(Boolean);
      if (asked.length && !sizes.length) {
        return res.status(400).json({ success: false, message: "Pick sizes from the store's list" });
      }
      if (!sizes.length) sizes = [null]; // any size
      store_product_id = null;
      sku = null;
      stockx_product_id = null;
      stockx_url_key = null;
    }

    // One of the store's own products (picked from the store's results in
    // "Track a new item"): alerts match restocks by name and size, so the
    // name, category and sizes come from the product itself. A product
    // with no sizes (one variant) gets one alert with no size.
    if (store_product_id) {
      const picked = await Inventory.findOne({
        where: { store_id: req.store.id, shopify_product_id: String(store_product_id) },
        attributes: ["product_name"],
      });
      if (!picked) {
        return res.status(404).json({ success: false, message: "That item isn't in this store anymore" });
      }
      // Every listing with the same name (some stores list each pair as
      // its own product) — the same rows the restock check matches
      const variants = await Inventory.findAll({
        where: { store_id: req.store.id, product_name: { [Op.iLike]: picked.product_name } },
        attributes: ["product_name", "category", "sku", "size", "image_url"],
      });
      const productSizes = new Set(variants.map((v) => v.size).filter(Boolean));
      product_name = variants[0].product_name;
      category = variants[0].category;
      sku = sku || variants.find((v) => v.sku)?.sku || null;
      image_url = image_url || variants.find((v) => v.image_url)?.image_url || null;
      if (!productSizes.size || category === "trading_cards") {
        sizes = [null];
      } else {
        sizes = sizes.filter((s) => productSizes.has(s));
        if (!sizes.length) {
          return res.status(400).json({ success: false, message: "Pick one of this item's sizes" });
        }
      }
    }

    if (requireFields({ product_name }, ["product_name"]).length > 0 || (sizes[0] !== null && sizes.length === 0)) {
      return res
        .status(400)
        .json({ success: false, message: "Product name and size are required" });
    }
    if (sizes.length > MAX_SIZES_PER_REQUEST) {
      return res
        .status(400)
        .json({ success: false, message: `Pick up to ${MAX_SIZES_PER_REQUEST} sizes at a time` });
    }

    if ((max_price && !isValidPrice(max_price)) || (min_price && !isValidPrice(min_price))) {
      return res.status(400).json({ success: false, message: "Invalid price" });
    }
    if (min_price && max_price && Number(min_price) > Number(max_price)) {
      return res.status(400).json({ success: false, message: "Minimum price is above the maximum" });
    }

    // Sizes already tracked are skipped, not an error
    const existing = await Alert.findAll({
      where: {
        store_id: req.store.id,
        user_id: membership.id,
        product_name,
        size: sizes[0] === null ? null : sizes,
        active: true,
      },
      attributes: ["size"],
    });
    const tracked = new Set(existing.map((a) => a.size));
    const toCreate = sizes.filter((s) => !tracked.has(s));

    if (toCreate.length === 0) {
      return res.status(400).json({
        success: false,
        message: "You already have an active alert for this item",
      });
    }

    const created = await Alert.bulkCreate(
      toCreate.map((s) => ({
        store_id: req.store.id,
        user_id: membership.id,
        category,
        product_name,
        size: s,
        sku: sku || null,
        min_price: min_price || null,
        max_price: max_price || null,
        condition_preference,
        notify_email: notify_email ?? true,
        notify_inapp: notify_inapp ?? true,
        stockx_product_id: stockx_product_id || null,
        stockx_url_key: stockx_url_key || null,
        image_url: safeImageUrl(image_url),
        attributes: byName ? { match: "keywords" } : {},
      })),
      { returning: true },
    );

    return res.status(201).json({
      success: true,
      // One alert keeps the old shape; several come back as a list
      data: created.length === 1 && !Array.isArray(req.body.sizes) ? created[0] : created,
      created: created.map((a) => a.size),
      skipped: [...tracked],
      message: created.length === 1 ? "Alert created successfully" : `${created.length} alerts created`,
    });
  } catch (error) {
    console.error("Create alert error:", error.message);
    return res
      .status(500)
      .json({ success: false, message: "Failed to create alert" });
  }
};

const updateAlert = async (req, res) => {
  try {
    const membership = await resolveMembership(req, res);
    if (!membership) return;

    const alert = await Alert.findOne({
      where: { id: req.params.id, store_id: req.store.id },
    });

    if (!alert) {
      return res
        .status(404)
        .json({ success: false, message: "Alert not found" });
    }

    if (alert.user_id !== membership.id) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    const { size, min_price, max_price, notify_email, notify_inapp, active, condition_preference } = req.body;

    if (condition_preference && !CONDITIONS.includes(condition_preference)) {
      return res.status(400).json({ success: false, message: "Invalid condition" });
    }

    // "Other" items use the store's own size chart, not the shoe/clothing list
    const sizeOk =
      alert.category === "other"
        ? (await otherSizeChart(req.store)).sizes.some((c) => sameSize(c, size))
        : isValidSize(size);
    if (size && !sizeOk) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid size" });
    }

    if ((max_price && !isValidPrice(max_price)) || (min_price && !isValidPrice(min_price))) {
      return res.status(400).json({ success: false, message: "Invalid price" });
    }
    const nextMin = "min_price" in req.body ? min_price || null : alert.min_price;
    const nextMax = "max_price" in req.body ? max_price || null : alert.max_price;
    if (nextMin && nextMax && Number(nextMin) > Number(nextMax)) {
      return res.status(400).json({ success: false, message: "Minimum price is above the maximum" });
    }

    await alert.update({
      size: size ?? alert.size,
      // Sending a price empty/null removes that limit
      min_price: nextMin,
      max_price: nextMax,
      condition_preference: condition_preference ?? alert.condition_preference,
      notify_email: notify_email ?? alert.notify_email,
      notify_inapp: notify_inapp ?? alert.notify_inapp,
      active: active ?? alert.active,
    });

    return res
      .status(200)
      .json({
        success: true,
        data: alert,
        message: "Alert updated successfully",
      });
  } catch (error) {
    console.error("Update alert error:", error.message);
    return res
      .status(500)
      .json({ success: false, message: "Failed to update alert" });
  }
};

const deleteAlert = async (req, res) => {
  try {
    const membership = await resolveMembership(req, res);
    if (!membership) return;

    const alert = await Alert.findOne({
      where: { id: req.params.id, store_id: req.store.id },
    });

    if (!alert) {
      return res
        .status(404)
        .json({ success: false, message: "Alert not found" });
    }

    if (alert.user_id !== membership.id) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    await alert.destroy();

    return res
      .status(200)
      .json({ success: true, message: "Alert deleted successfully" });
  } catch (error) {
    console.error("Delete alert error:", error.message);
    return res
      .status(500)
      .json({ success: false, message: "Failed to delete alert" });
  }
};

module.exports = { getAlerts, getAlert, createAlert, updateAlert, deleteAlert };
