const { AlertClick, Purchase, PixelClaim, Inventory } = require("../models/index.js");

// Sales only count with proof that a Syncstock click led to them:
//   cart_tag — the order carries syncstock_click_id, which our "Buy now"
//              cart link puts on the Shopify cart (redirect.controller.js).
//              It rides along while the shopper browses, as long as they
//              check out that cart.
//   pixel    — the store's web pixel (shopify-app/extensions) saw the
//              checkout complete in the browser that clicked, which also
//              covers "Buy it now" / Shop Pay buttons that skip the cart.
// Either way, the click must be for the exact variant bought, and made
// within CLICK_WINDOW_DAYS of the order. Matching the order's email to a
// shopper is NOT proof — someone with alerts can buy for other reasons.
const CLICK_WINDOW_DAYS = 7;
const CLICK_ATTRIBUTE = "syncstock_click_id";
// A multi-item cart tags each item's click: syncstock_click_id,
// syncstock_click_id_2, syncstock_click_id_3, …
const CLICK_ATTRIBUTE_RE = /^syncstock_click_id(_\d+)?$/;
// The pixel reports as checkout completes, so a real claim is minutes
// from the order — this stops old orders being claimed after the fact
const CLAIM_MAX_GAP_MS = 60 * 60 * 1000;
// Small allowance for clock differences between Shopify and us
const CLOCK_SKEW_MS = 5 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const isPosOrder = (order) => {
  const tags = (order.tags || "").toLowerCase();
  const sourceName = (order.source_name || "").toLowerCase();
  return sourceName === "pos" || tags.includes("store-owned") || tags.includes("pos");
};

// What was actually paid for the line: price × quantity, less discounts
const lineTotal = (line) => {
  const gross = (parseFloat(line.price) || 0) * (line.quantity || 1);
  const discounts = (line.discount_allocations || []).reduce(
    (sum, d) => sum + (parseFloat(d.amount) || 0),
    0,
  );
  return Math.max(gross - discounts, 0).toFixed(2);
};

// The order line for the clicked item. Exact variant; clicks from before
// variants were recorded fall back to SKU.
const lineForClick = (click, lineItems) => {
  const withVariant = lineItems.filter((line) => line.variant_id);
  if (click.shopify_variant_id) {
    return withVariant.find((line) => String(line.variant_id) === click.shopify_variant_id);
  }
  if (!click.sku) return undefined;
  return withVariant.find(
    (line) => line.sku && line.sku.toLowerCase() === click.sku.toLowerCase(),
  );
};

const categoryForVariant = async (store, variantId) => {
  const item = await Inventory.findOne({
    where: { store_id: store.id, shopify_variant_id: variantId },
    attributes: ["category"],
  });
  return item?.category || "sneakers";
};

// Records a Purchase for every order line that a valid click proves.
// Safe to run more than once for the same order (webhook and pixel both
// call it): one row per order + variant.
const attributeOrder = async (store, order) => {
  if (!order?.id || isPosOrder(order)) return 0;

  const orderId = String(order.id);
  const orderedAt = new Date(order.created_at || Date.now());
  const lineItems = order.line_items || [];

  const tagIds = (order.note_attributes || [])
    .filter((attr) => CLICK_ATTRIBUTE_RE.test(attr.name || ""))
    .map((attr) => String(attr.value));
  const claims = await PixelClaim.findAll({
    where: { store_id: store.id, shopify_order_id: orderId },
  });
  const candidates = [
    ...tagIds.map((id) => ({ id, source: "cart_tag" })),
    ...claims
      .filter((claim) => Math.abs(new Date(claim.created_at) - orderedAt) <= CLAIM_MAX_GAP_MS)
      .map((claim) => ({ id: claim.click_id, source: "pixel" })),
  ].filter((candidate) => UUID_RE.test(candidate.id));
  if (candidates.length === 0) return 0;

  const clicks = await AlertClick.findAll({
    where: { id: [...new Set(candidates.map((c) => c.id))], store_id: store.id },
  });
  const clicksById = new Map(clicks.map((click) => [click.id, click]));

  let recorded = 0;
  const credited = new Set();
  // Cart tags come first, so a line proven both ways is labelled cart_tag
  for (const { id, source } of candidates) {
    const click = clicksById.get(id);
    if (!click) continue;

    const age = orderedAt - new Date(click.clicked_at);
    if (age < -CLOCK_SKEW_MS || age > CLICK_WINDOW_DAYS * DAY_MS) continue;

    const line = lineForClick(click, lineItems);
    if (!line) continue;
    const variantId = String(line.variant_id);
    if (credited.has(variantId)) continue;
    credited.add(variantId);

    try {
      const [, created] = await Purchase.findOrCreate({
        where: { store_id: store.id, shopify_order_id: orderId, shopify_variant_id: variantId },
        defaults: {
          user_id: click.user_id,
          alert_id: click.alert_id,
          click_id: click.id,
          attribution_source: source,
          category: await categoryForVariant(store, variantId),
          product_name: line.title || click.product_name,
          sku: line.sku || click.sku,
          size: click.size,
          price_paid: lineTotal(line),
          customer_email: order.email || null,
          purchased_at: orderedAt,
        },
      });
      if (created) {
        recorded += 1;
        console.log(
          `Sale attributed (${source}) — ${line.title} on order ${orderId} (store ${store.id})`,
        );
      }
    } catch (error) {
      // The webhook and the pixel raced to record the same line — fine
      if (error.name !== "SequelizeUniqueConstraintError") throw error;
    }
  }
  return recorded;
};

const fetchOrder = async (store, orderId) => {
  const fields = "id,email,created_at,line_items,note_attributes,source_name,tags";
  const resp = await fetch(
    `https://${store.shopify_domain}/admin/api/2025-01/orders/${orderId}.json?fields=${fields}`,
    { headers: { "X-Shopify-Access-Token": store.shopify_access_token } },
  );
  if (!resp.ok) return null;
  const { order } = await resp.json();
  return order || null;
};

// The pixel's report: save it for the webhook, then attribute right away
// if Shopify already has the order (the order details always come from
// Shopify, never from the browser).
const recordPixelCheckout = async (store, orderId, clickIds) => {
  await PixelClaim.bulkCreate(
    clickIds.map((clickId) => ({
      store_id: store.id,
      shopify_order_id: orderId,
      click_id: clickId,
    })),
    { ignoreDuplicates: true },
  );

  const order = await fetchOrder(store, orderId);
  // Not readable yet — the orders/create webhook will pick the claim up
  if (!order) return 0;
  return attributeOrder(store, order);
};

module.exports = {
  CLICK_WINDOW_DAYS,
  CLICK_ATTRIBUTE,
  UUID_RE,
  attributeOrder,
  recordPixelCheckout,
};
