const {
  AlertClick,
  Inventory,
  NotificationLog,
  Store,
  User,
} = require("../models/index.js");
const { storeBaseUrl } = require("../utils/storeUrl.js");

const trackRedirect = async (req, res) => {
  try {
    const { alert_id, inventory_id, notification_id } = req.query;

    if (!inventory_id) {
      return res
        .status(400)
        .json({ success: false, message: "Missing inventory_id" });
    }

    const item = await Inventory.findByPk(inventory_id);

    if (!item) {
      return res
        .status(404)
        .json({ success: false, message: "Inventory item not found" });
    }

    const store = await Store.findByPk(item.store_id);
    if (!store) {
      return res
        .status(404)
        .json({ success: false, message: "Store not found" });
    }

    let membership = null;
    if (req.account) {
      membership = await User.findOne({
        where: { account_id: req.account.id, store_id: store.id },
      });
    }

    if (item.available < 1) {
      return res.redirect(
        `${storeBaseUrl(store)}/store/dashboard?tab=browse`,
      );
    }

    const click = await AlertClick.create({
      store_id: store.id,
      user_id: membership?.id || null,
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
        { where: { id: notification_id, store_id: store.id } },
      );
    }

    const cartUrl = `${store.storefront_url}/cart/${item.shopify_variant_id}:1?attributes[syncstock_click_id]=${click.id}`;

    return res.redirect(cartUrl);
  } catch (error) {
    console.error("Track redirect error:", error.message);
    return res.status(500).json({ success: false, message: "Redirect failed" });
  }
};

module.exports = { trackRedirect };
