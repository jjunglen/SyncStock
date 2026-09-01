const { Alert, User } = require("../models/index.js");
const {
  isValidSize,
  isValidPrice,
  requireFields,
} = require("../utils/validate.js");
const { getUserAlertStats } = require("../services/alert.service.js");

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
    const alerts = await Alert.findAll({
      where: { store_id: req.store.id, user_id: membership.id },
      order: [["created_at", "DESC"]],
    });
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

const createAlert = async (req, res) => {
  try {
    const membership = await resolveMembership(req, res);
    if (!membership) return;

    const {
      product_name,
      sku,
      size,
      max_price,
      notify_email,
      notify_inapp,
      stockx_product_id,
      stockx_url_key,
    } = req.body;

    const missing = requireFields(req.body, ["product_name", "size"]);
    if (missing.length > 0) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid shoe preference" });
    }

    if (max_price && !isValidPrice(max_price)) {
      return res.status(400).json({ success: false, message: "Invalid price" });
    }

    const existingAlert = await Alert.findOne({
      where: {
        store_id: req.store.id,
        user_id: membership.id,
        product_name,
        size,
        active: true,
      },
    });

    if (existingAlert) {
      return res.status(400).json({
        success: false,
        message: "You already have an active alert for this shoe and size",
      });
    }

    const alert = await Alert.create({
      store_id: req.store.id,
      user_id: membership.id,
      product_name,
      size,
      sku: sku || null,
      max_price: max_price || null,
      notify_email: notify_email ?? true,
      notify_inapp: notify_inapp ?? true,
      stockx_product_id: stockx_product_id || null,
      stockx_url_key: stockx_url_key || null,
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

    const { size, max_price, notify_email, notify_inapp, active } = req.body;

    if (size && !isValidSize(size)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid shoe size" });
    }

    if (max_price && !isValidPrice(max_price)) {
      return res.status(400).json({ success: false, message: "Invalid price" });
    }

    await alert.update({
      size: size ?? alert.size,
      max_price: max_price ?? alert.max_price,
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
