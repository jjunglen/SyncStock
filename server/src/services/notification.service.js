const { NotificationLog, PendingNotification } = require("../models/index.js");
const { Op } = require("sequelize");

const buildDashboardUrl = (store, inventoryId, alertId) => {
  const protocol = process.env.NODE_ENV === "production" ? "https" : "http";
  const host =
    process.env.NODE_ENV === "production"
      ? `${store.subdomain}.syncstock.io`
      : "localhost:5173";
  return `${protocol}://${host}/dashboard?item=${inventoryId}&alert=${alertId}`;
};

const sendNotification = async ({ store, alert, inventory }) => {
  const recentlyQueuedOrSent = await PendingNotification.findOne({
    where: {
      store_id: store.id,
      user_id: alert.user_id,
      inventory_id: inventory.id,
    },
  });
  if (recentlyQueuedOrSent) {
    console.log(
      `Skipping duplicate — ${inventory.product_name} already queued/sent for this user`,
    );
    return false;
  }

  const recentEmail = await NotificationLog.findOne({
    where: {
      store_id: store.id,
      user_id: alert.user_id,
      inventory_id: inventory.id,
      channel: "email",
      sent_at: { [Op.gte]: new Date(Date.now() - 60 * 60 * 1000) },
    },
  });
  if (recentEmail) return false;

  const message = `${inventory.product_name} (Size ${inventory.size}) is now available`;

  if (alert.notify_inapp) {
    await NotificationLog.create({
      store_id: store.id,
      user_id: alert.user_id,
      alert_id: alert.id,
      inventory_id: inventory.id,
      channel: "in_app",
      image_url: inventory.image_url || null,
      message,
    });
  }

  if (alert.notify_email) {
    await PendingNotification.create({
      store_id: store.id,
      user_id: alert.user_id,
      alert_id: alert.id,
      inventory_id: inventory.id,
      product_name: inventory.product_name,
      sku: inventory.sku,
      size: inventory.size,
      price: inventory.price,
      image_url: inventory.image_url,
      shopify_url: buildDashboardUrl(store, inventory.id, alert.id),
    });
    scheduleQuickFlush(store.id, alert.user_id);
  }

  return true;
};

const sendPriceDropNotification = async ({ store, alert, inventory }) => {
  const recentlyQueuedOrSent = await PendingNotification.findOne({
    where: {
      store_id: store.id,
      user_id: alert.user_id,
      inventory_id: inventory.id,
    },
  });
  if (recentlyQueuedOrSent) return false;

  const recentEmail = await NotificationLog.findOne({
    where: {
      store_id: store.id,
      user_id: alert.user_id,
      inventory_id: inventory.id,
      channel: "email",
      sent_at: { [Op.gte]: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    },
  });
  if (recentEmail) return false;

  const message = `${inventory.product_name} (Size ${inventory.size}) dropped to $${inventory.price}`;

  if (alert.notify_inapp) {
    await NotificationLog.create({
      store_id: store.id,
      user_id: alert.user_id,
      alert_id: alert.id,
      inventory_id: inventory.id,
      channel: "in_app",
      image_url: inventory.image_url || null,
      message,
    });
  }

  if (alert.notify_email) {
    await PendingNotification.create({
      store_id: store.id,
      user_id: alert.user_id,
      alert_id: alert.id,
      inventory_id: inventory.id,
      product_name: inventory.product_name,
      sku: inventory.sku,
      size: inventory.size,
      price: inventory.price,
      image_url: inventory.image_url,
      shopify_url: buildDashboardUrl(store, inventory.id, alert.id),
    });
    scheduleQuickFlush(store.id, alert.user_id);
  }

  return true;
};

module.exports = { sendNotification, sendPriceDropNotification };