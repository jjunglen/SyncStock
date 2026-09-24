const { Alert } = require("../models/index.js");
const { Op } = require("sequelize");
const {
  sendNotification,
  sendPriceDropNotification,
} = require("./notification.service.js");

// Finds every active alert matching this store's newly-available
// inventory item (product_name + size, case-insensitive — same
// matching approach createAlert's own duplicate check already uses)
// and notifies each matched user once per webhook batch. notifiedUsers
// is shared across the whole product update, so if multiple variants
// somehow match the same user, they're only notified once.
const checkAlertsForInventory = async (store, inventory, notifiedUsers) => {
  try {
    const matchingAlerts = await Alert.findAll({
      where: {
        store_id: store.id,
        active: true,
        size: inventory.size,
        product_name: { [Op.iLike]: inventory.product_name },
      },
    });

    for (const alert of matchingAlerts) {
      if (notifiedUsers.has(alert.user_id)) continue;

      if (
        alert.max_price &&
        parseFloat(inventory.price) > parseFloat(alert.max_price)
      ) {
        continue;
      }

      const sent = await sendNotification({ store, alert, inventory });
      if (sent) {
        notifiedUsers.add(alert.user_id);
      }
    }
  } catch (error) {
    console.error("Check alerts for inventory error:", error.message);
  }
};

// Same matching, but for an item that just had a genuine price drop
// (the caller already confirmed that) — sends the price-drop-flavored
// notification instead of the standard restock one.
const checkPriceDropAlerts = async (store, inventory, notifiedUsers) => {
  try {
    const matchingAlerts = await Alert.findAll({
      where: {
        store_id: store.id,
        active: true,
        size: inventory.size,
        product_name: { [Op.iLike]: inventory.product_name },
      },
    });

    for (const alert of matchingAlerts) {
      if (notifiedUsers.has(alert.user_id)) continue;

      if (
        alert.max_price &&
        parseFloat(inventory.price) > parseFloat(alert.max_price)
      ) {
        continue;
      }

      const sent = await sendPriceDropNotification({ store, alert, inventory });
      if (sent) {
        notifiedUsers.add(alert.user_id);
      }
    }
  } catch (error) {
    console.error("Check price drop alerts error:", error.message);
  }
};

module.exports = { checkAlertsForInventory, checkPriceDropAlerts };
