const { Alert, User, Account } = require("../models/index.js");
const { Op } = require("sequelize");
const {
  sendNotification,
  sendPriceDropNotification,
} = require("./notification.service.js");

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

    await checkSizeMatchNotifications(store, inventory, notifiedUsers);
  } catch (error) {
    console.error("Check alerts for inventory error:", error.message);
  }
};

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

// Separate from Alert-based matching entirely — checks every store
// member who opted into notify_size_alerts, regardless of whether
// they ever tracked this specific product. Matches on saved sizes
// (Account.sizes), not product name at all.
const checkSizeMatchNotifications = async (store, inventory, notifiedUsers) => {
  if (!inventory.size) return;

  const members = await User.findAll({
    where: { store_id: store.id, notify_size_alerts: true },
  });

  for (const member of members) {
    if (notifiedUsers.has(member.id)) continue;

    const account = await Account.findByPk(member.account_id);
    if (!account || !account.sizes || !account.sizes.includes(inventory.size)) {
      continue;
    }

    const fakeAlert = {
      id: null,
      user_id: member.id,
      notify_email: member.notify_email,
      notify_inapp: member.notify_inapp,
      max_price: null,
    };

    const sent = await sendNotification({ store, alert: fakeAlert, inventory });
    if (sent) {
      notifiedUsers.add(member.id);
    }
  }
};

const getUserAlertStats = async (userId) => {
  try {
    const totalAlerts = await Alert.count({ where: { user_id: userId } });
    const activeAlerts = await Alert.count({
      where: { user_id: userId, active: true },
    });
    return {
      totalAlerts,
      activeAlerts,
      pausedAlerts: totalAlerts - activeAlerts,
    };
  } catch (error) {
    console.error("Get user alert stats error:", error.message);
    return { totalAlerts: 0, activeAlerts: 0, pausedAlerts: 0 };
  }
};

module.exports = {
  checkAlertsForInventory,
  checkPriceDropAlerts,
  getUserAlertStats,
};
