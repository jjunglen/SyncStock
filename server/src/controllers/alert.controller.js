const { Op } = require("sequelize");
const { sequelize, Alert, User, Inventory, StockxImageCache } = require("../models/index.js");
const {
  isValidSize,
  isValidPrice,
  requireFields,
} = require("../utils/validate.js");
const { getUserAlertStats } = require("../services/alert.service.js");

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

const createAlert = async (req, res) => {
  try {
    const membership = await resolveMembership(req, res);
    if (!membership) return;

    const {
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
    } = req.body;

    if (!CONDITIONS.includes(condition_preference)) {
      return res.status(400).json({ success: false, message: "Invalid condition" });
    }

    if (!ALERT_CATEGORIES.includes(category)) {
      return res.status(400).json({ success: false, message: "Invalid category" });
    }

    // Trading cards have no size; sneakers and clothing need one
    const required = category === "trading_cards" ? ["product_name"] : ["product_name", "size"];
    const missing = requireFields(req.body, required);
    if (missing.length > 0) {
      return res
        .status(400)
        .json({ success: false, message: "Product name and size are required" });
    }

    if ((max_price && !isValidPrice(max_price)) || (min_price && !isValidPrice(min_price))) {
      return res.status(400).json({ success: false, message: "Invalid price" });
    }
    if (min_price && max_price && Number(min_price) > Number(max_price)) {
      return res.status(400).json({ success: false, message: "Minimum price is above the maximum" });
    }

    const existingAlert = await Alert.findOne({
      where: {
        store_id: req.store.id,
        user_id: membership.id,
        product_name,
        size: size || null,
        active: true,
      },
    });

    if (existingAlert) {
      return res.status(400).json({
        success: false,
        message: "You already have an active alert for this item",
      });
    }

    const alert = await Alert.create({
      store_id: req.store.id,
      user_id: membership.id,
      category,
      product_name,
      size: size || null,
      sku: sku || null,
      min_price: min_price || null,
      max_price: max_price || null,
      condition_preference,
      notify_email: notify_email ?? true,
      notify_inapp: notify_inapp ?? true,
      stockx_product_id: stockx_product_id || null,
      stockx_url_key: stockx_url_key || null,
      image_url: safeImageUrl(image_url),
    });

    return res
      .status(201)
      .json({
        success: true,
        data: alert,
        message: "Alert created successfully",
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

    if (size && !isValidSize(size)) {
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
