const { Store } = require("../models/index.js");
const {
  deleteStoreData,
  redactCustomer,
  collectCustomerData,
} = require("../services/storeData.service.js");
const { sendOpsEmail } = require("../services/email.service.js");

// Shopify's three required privacy webhooks, sent to one address
// (subscribed in shopify-app/shopify.app.toml) and told apart by the
// X-Shopify-Topic header. Shopify only needs a quick 200; the work runs
// after replying. A store we no longer have is still a 200 — there's
// simply nothing left to delete or report.
//   customers/data_request — a shopper asked the merchant for their data
//   customers/redact       — a shopper asked for their data deleted
//   shop/redact            — 48 hours after uninstall: delete the store
const handleComplianceWebhook = async (req, res) => {
  const topic = req.headers["x-shopify-topic"];
  let payload;
  try {
    payload = JSON.parse(req.body);
  } catch {
    return res.status(400).json({ success: false, message: "Invalid JSON" });
  }
  res.status(200).json({ received: true });

  const shopDomain = payload.shop_domain || req.headers["x-shopify-shop-domain"];
  try {
    const store = shopDomain ? await Store.findOne({ where: { shopify_domain: shopDomain } }) : null;
    if (!store) {
      console.log(`Compliance ${topic} for ${shopDomain}: no store on file, nothing to do`);
      return;
    }
    // Only the app the store uses now speaks for it. After a store moves
    // to the public app, the old app's shop/redact (sent 48 hours after
    // the old app is uninstalled) must NOT delete the store.
    if (req.shopifyApp !== (store.shopify_app || "custom")) {
      console.log(`Compliance ${topic} for ${shopDomain} from the ${req.shopifyApp} app ignored — store uses the ${store.shopify_app} app`);
      return;
    }
    const email = payload.customer?.email || null;

    if (topic === "customers/data_request") {
      const data = await collectCustomerData(store, email);
      // Shopify expects the merchant to get this to the shopper within
      // 30 days — it goes to Syncstock support to send on
      await sendOpsEmail({
        subject: `Data request: ${store.name} customer ${email || payload.customer?.id}`,
        text: [
          `Shopify data request ${payload.data_request?.id || ""} from ${store.name} (${shopDomain}).`,
          `Send this to the merchant within 30 days.`,
          "",
          JSON.stringify(data, null, 2),
        ].join("\n"),
      });
      console.log(`Compliance data_request handled for ${shopDomain}`);
    } else if (topic === "customers/redact") {
      const result = await redactCustomer(store, email);
      console.log(`Compliance customers/redact for ${shopDomain}:`, JSON.stringify(result));
    } else if (topic === "shop/redact") {
      await deleteStoreData(store);
      console.log(`Compliance shop/redact: deleted all data for ${shopDomain}`);
    } else {
      console.warn(`Compliance webhook with unknown topic: ${topic}`);
    }
  } catch (error) {
    console.error(`Compliance ${topic} error for ${shopDomain}:`, error.message);
  }
};

// app/uninstalled — the merchant removed Syncstock in Shopify. Their
// token stops working right away, so the store goes offline (shopper
// site shows "not found", no alerts). Data stays until shop/redact 48
// hours later, so reinstalling in that window picks up where they were.
const handleAppUninstalled = async (req, res) => {
  res.status(200).json({ received: true });
  try {
    await req.store.update({
      status: "suspended",
      uninstalled_at: new Date(),
      web_pixel_id: null,
    });
    console.log(`App uninstalled — ${req.store.shopify_domain} is offline`);
  } catch (error) {
    console.error("App uninstalled webhook error:", error.message);
  }
};

module.exports = { handleComplianceWebhook, handleAppUninstalled };
