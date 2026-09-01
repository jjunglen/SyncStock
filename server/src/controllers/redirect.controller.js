const {
  AlertClick,
  Inventory,
  NotificationLog,
} = require("../models/index.js");

const trackRedirect = async (req, res) => {
  try {
    const { alert_id, inventory_id, notification_id } = req.query;

    if (!inventory_id) {
      return res
        .status(400)
        .json({ success: false, message: "Missing inventory_id" });
    }

    const item = await Inventory.findOne({
      where: { id: inventory_id, store_id: req.store.id },
    });

    if (!item) {
      return res
        .status(404)
        .json({ success: false, message: "Inventory item not found" });
    }

    if (item.available < 1) {
      return res.redirect(`${process.env.FRONTEND_URL}/dashboard?tab=browse`);
    }

    const click = await AlertClick.create({
      store_id: req.store.id,
      user_id: req.membership?.id || null,
      alert_id: alert_id && alert_id !== "null" ? alert_id : null,
      notification_id: notification_id || null,
      product_name: item.product_name,
      sku: item.sku || null,
      size: item.size || null,
      clicked_at: new Date(),
    });

    if (notification_id) {
      await NotificationLog.update(
        { read: true },
        { where: { id: notification_id, store_id: req.store.id } },
      );
    }

    const cartUrl = `${req.store.storefront_url}/cart/${item.shopify_variant_id}:1?attributes[syncstock_click_id]=${click.id}`;

    return res.redirect(cartUrl);
  } catch (error) {
    console.error("Track redirect error:", error.message);
    return res.status(500).json({ success: false, message: "Redirect failed" });
  }
};

module.exports = { trackRedirect };
