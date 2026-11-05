const { PendingNotification } = require("../models/index.js");
const { storeBaseUrl } = require("../utils/storeUrl.js");

const buildDashboardUrl = (store, inventoryId, alertId) => {
  const params = new URLSearchParams({ item: inventoryId });
  // Size-match notifications have no alert behind them
  if (alertId) params.set("alert", alertId);
  return `${storeBaseUrl(store)}/store/dashboard?${params.toString()}`;
};

// Queues a match for the shopper. Nothing is sent here: email, in-app,
// and push all go out together from digest.service.js once the batch has
// settled, with each product's final photo (listing tools like Copyt
// add photos after creating the product). Returns false if this item is
// already waiting to go to this shopper. Once sent, the next restock
// (sold out, then back) notifies again: webhooks only call this when an
// item goes from sold out to in stock, so repeats can't pile up.
const queueNotification = async ({ store, alert, inventory }) => {
  if (!alert.notify_inapp && !alert.notify_email) return false;

  const alreadyQueued = await PendingNotification.findOne({
    where: {
      store_id: store.id,
      user_id: alert.user_id,
      inventory_id: inventory.id,
      sent: false,
    },
  });
  if (alreadyQueued) {
    console.log(
      `Skipping duplicate — ${inventory.product_name} already queued for this user`,
    );
    return false;
  }

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

  return true;
};

// Restocks and price drops queue the same way; the digest tells them
// apart when sending (price below compare-at price = price drop)
const sendNotification = queueNotification;
const sendPriceDropNotification = queueNotification;

module.exports = { sendNotification, sendPriceDropNotification, buildDashboardUrl };
