const { Alert, User, Account } = require("../models/index.js");
const { Op } = require("sequelize");
const {
  sendNotification,
  sendPriceDropNotification,
} = require("./notification.service.js");
const { isCategoryEnabled } = require("../utils/storeSettings.js");
const { sameSize } = require("../utils/otherSizes.js");
const { otherSizeChart } = require("./otherSizeChart.service.js");

// An alert set by name ("Track by name" on Track): fires for any product
// whose name has every word, in the chosen size (or any size)
const isNameAlert = (alert) => alert.attributes?.match === "keywords";
const nameWords = (text) => String(text || "").toLowerCase().split(/\s+/).filter(Boolean);

// Alerts this restock or price drop answers. Sneakers and clothing match
// on the exact name and size, as before. "Other" items (snowboards,
// rings…) also match name alerts, and sizes match however they're
// written ("158" = "158cm").
const findMatchingAlerts = async (store, inventory) => {
  if (inventory.category !== "other") {
    return Alert.findAll({
      where: {
        store_id: store.id,
        active: true,
        size: inventory.size,
        product_name: { [Op.iLike]: inventory.product_name },
      },
    });
  }
  const candidates = await Alert.findAll({
    where: {
      store_id: store.id,
      active: true,
      [Op.or]: [
        { product_name: { [Op.iLike]: inventory.product_name } },
        { "attributes.match": "keywords" },
      ],
    },
  });
  const name = String(inventory.product_name || "").toLowerCase();
  return candidates.filter((alert) => {
    const byName = isNameAlert(alert);
    if (byName && !nameWords(alert.product_name).every((w) => name.includes(w))) return false;
    // No size picked (by name, or the item had no sizes when tracked):
    // any size of it counts — the shopper tracked the item itself
    if (alert.size == null) return true;
    return sameSize(alert.size, inventory.size);
  });
};

// An alert's own limits: its price range, and new vs pre-owned. Items
// with no known condition match either choice.
const meetsPreferences = (alert, inventory) => {
  const price = parseFloat(inventory.price);
  if (alert.max_price && price > parseFloat(alert.max_price)) return false;
  if (alert.min_price && price < parseFloat(alert.min_price)) return false;
  const wanted = alert.condition_preference;
  const actual = inventory.condition;
  if (wanted && wanted !== "either" && ["brand_new", "pre_owned"].includes(actual)) {
    return wanted === actual;
  }
  return true;
};

const checkAlertsForInventory = async (store, inventory, notifiedUsers) => {
  try {
    // Categories the merchant hides don't send alerts either
    if (!isCategoryEnabled(store, inventory.category)) return;
    const matchingAlerts = await findMatchingAlerts(store, inventory);

    for (const alert of matchingAlerts) {
      if (notifiedUsers.has(alert.user_id)) continue;
      if (!meetsPreferences(alert, inventory)) continue;

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
    if (!isCategoryEnabled(store, inventory.category)) return;
    const matchingAlerts = await findMatchingAlerts(store, inventory);

    for (const alert of matchingAlerts) {
      if (notifiedUsers.has(alert.user_id)) continue;
      if (!meetsPreferences(alert, inventory)) continue;

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

  // "other": only sizes on this store's chart (set or automatic)
  const chart = inventory.category === "other" && members.length ? (await otherSizeChart(store)).sizes : [];

  for (const member of members) {
    if (notifiedUsers.has(member.id)) continue;

    const account = await Account.findByPk(member.account_id);
    if (!account || !account.sizes) continue;
    if (inventory.category === "other") {
      // Matched however they're written
      const saved = account.sizes.filter((s) => chart.some((c) => sameSize(c, s)));
      if (!saved.some((s) => sameSize(s, inventory.size))) continue;
    } else if (!account.sizes.includes(inventory.size)) {
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
