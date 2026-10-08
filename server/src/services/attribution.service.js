const { AlertClick, Purchase, PixelClaim, Inventory } = require("../models/index.js");
const { shopifyGraphql, gid } = require("../utils/shopifyGraphql.js");

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

// Saves one sold line, or upgrades an "Assisted" row to a full sale when
// exact proof turns up later. One row per order + variant.
const savePurchase = async (store, order, line, click, source, matchType) => {
  const orderId = String(order.id);
  const variantId = String(line.variant_id);
  const where = { store_id: store.id, shopify_order_id: orderId, shopify_variant_id: variantId };
  try {
    const existing = await Purchase.findOne({ where });
    if (existing) {
      if (existing.match_type === "product" && matchType === "exact") {
        await existing.update({
          match_type: "exact",
          click_id: click.id,
          attribution_source: source,
          alert_id: click.alert_id,
          user_id: click.user_id,
          size: click.size,
        });
        console.log(`Sale upgraded to exact (${source}) — ${line.title} on order ${orderId} (store ${store.id})`);
        return 1;
      }
      return 0;
    }
    await Purchase.create({
      ...where,
      user_id: click.user_id,
      alert_id: click.alert_id,
      click_id: click.id,
      attribution_source: source,
      match_type: matchType,
      category: await categoryForVariant(store, variantId),
      product_name: line.title || click.product_name,
      sku: line.sku || click.sku,
      // An assisted sale may be another size than the one clicked
      size: matchType === "exact" ? click.size : null,
      price_paid: lineTotal(line),
      customer_email: order.email || null,
      purchased_at: new Date(order.created_at || Date.now()),
    });
    console.log(
      `${matchType === "exact" ? "Sale" : "Assisted sale"} attributed (${source}) — ${line.title} on order ${orderId} (store ${store.id})`,
    );
    return 1;
  } catch (error) {
    // The webhook, the pixel and the nightly check raced to record the
    // same line — fine
    if (error.name !== "SequelizeUniqueConstraintError") throw error;
    return 0;
  }
};

// Records a Purchase for every order line a valid click proves. Proof is
// the cart tag, the pixel's claim, or Shopify's visit history (utm). The
// click must be within CLICK_WINDOW_DAYS before the order:
//   exact   — the clicked size was bought: a sale
//   product — only another size/condition of the clicked product was
//             bought: "Assisted", reported separately
// Safe to run any number of times for the same order.
const attributeOrder = async (store, order) => {
  if (!order?.id || isPosOrder(order)) return 0;

  const orderId = String(order.id);
  const orderedAt = new Date(order.created_at || Date.now());
  const lineItems = (order.line_items || []).filter((line) => line.variant_id);

  const tagIds = (order.note_attributes || [])
    .filter((attr) => CLICK_ATTRIBUTE_RE.test(attr.name || ""))
    .map((attr) => String(attr.value));
  const claims = await PixelClaim.findAll({
    where: { store_id: store.id, shopify_order_id: orderId },
  });
  // Strongest proof first, so a line proven several ways keeps that label
  const candidates = [
    ...tagIds.map((id) => ({ id, source: "cart_tag" })),
    ...claims
      .filter((claim) => Math.abs(new Date(claim.created_at) - orderedAt) <= CLAIM_MAX_GAP_MS)
      .map((claim) => ({ id: claim.click_id, source: "pixel" })),
    ...(order.utm_click_ids || []).map((id) => ({ id, source: "utm" })),
  ].filter((candidate) => UUID_RE.test(candidate.id));
  if (candidates.length === 0 || lineItems.length === 0) return 0;

  const clicks = await AlertClick.findAll({
    where: { id: [...new Set(candidates.map((c) => c.id))], store_id: store.id },
  });
  const clicksById = new Map(clicks.map((click) => [click.id, click]));
  // Which product each click was for, for assisted (other-size) matches
  const clickedItems = await Inventory.findAll({
    where: { id: clicks.map((c) => c.inventory_id).filter(Boolean), store_id: store.id },
    attributes: ["id", "shopify_product_id"],
  });
  const productOfItem = new Map(clickedItems.map((i) => [i.id, i.shopify_product_id]));

  const valid = candidates
    .map((c) => ({ ...c, click: clicksById.get(c.id) }))
    .filter(({ click }) => {
      if (!click) return false;
      const age = orderedAt - new Date(click.clicked_at);
      return age >= -CLOCK_SKEW_MS && age <= CLICK_WINDOW_DAYS * DAY_MS;
    });

  let recorded = 0;
  const credited = new Set();
  const usedClicks = new Set();

  // 1. Exact: the clicked variant was bought
  for (const { click, source } of valid) {
    const line = lineForClick(click, lineItems);
    if (!line || credited.has(String(line.variant_id))) continue;
    credited.add(String(line.variant_id));
    usedClicks.add(click.id);
    recorded += await savePurchase(store, order, line, click, source, "exact");
  }

  // 2. Assisted: another size/condition of a clicked product was bought
  for (const { click, source } of valid) {
    if (usedClicks.has(click.id)) continue;
    const productId = productOfItem.get(click.inventory_id);
    if (!productId) continue;
    const line = lineItems.find(
      (l) => String(l.product_id) === String(productId) && !credited.has(String(l.variant_id)),
    );
    if (!line) continue;
    credited.add(String(line.variant_id));
    usedClicks.add(click.id);
    recorded += await savePurchase(store, order, line, click, source, "product");
  }
  return recorded;
};

// The order fields SyncStock reads — for one order and the nightly list
const ORDER_FIELDS = `
  legacyResourceId createdAt cancelledAt sourceName tags
  customAttributes { key value }
  lineItems(first: 20) {
    nodes {
      title sku quantity
      variant { legacyResourceId product { legacyResourceId } }
      originalUnitPriceSet { shopMoney { amount } }
      discountAllocations { allocatedAmountSet { shopMoney { amount } } }
    }
  }
  refunds(first: 5) {
    refundLineItems(first: 10) {
      nodes {
        lineItem { variant { legacyResourceId } }
        subtotalSet { shopMoney { amount } }
      }
    }
  }
  customerJourneySummary {
    ready
    firstVisit { utmParameters { source content } }
    lastVisit { utmParameters { source content } }
  }
`;
const ORDER_QUERY = `query ($id: ID!) { order(id: $id) { ${ORDER_FIELDS} } }`;
const RECENT_ORDERS_QUERY = `
  query ($cursor: String, $query: String) {
    orders(first: 10, after: $cursor, query: $query, sortKey: CREATED_AT) {
      pageInfo { hasNextPage endCursor }
      nodes { ${ORDER_FIELDS} }
    }
  }
`;

// Our alert links carry utm_source=syncstock and the click ID as
// utm_content (redirect.controller.js). Shopify's visit history keeps
// them for the shopper's first and last visit before the order — even
// when they left and came back later. Empty until Shopify has processed
// the order (up to 48 hours), or when the shopper declined tracking.
const utmClickIds = (journey) =>
  [journey?.firstVisit, journey?.lastVisit]
    .map((visit) => visit?.utmParameters)
    .filter((utm) => utm && String(utm.source || "").toLowerCase() === "syncstock")
    .map((utm) => String(utm.content || ""))
    .filter((id) => UUID_RE.test(id));

// GraphQL order → the same shape as the orders/create webhook, which
// attributeOrder works with — plus visit-history click IDs and refunds.
// No customer email: SyncStock only requests Shopify's basic
// protected-data level, and the click proves who bought.
const toOrderPayload = (order) => ({
  id: order.legacyResourceId,
  email: null,
  created_at: order.createdAt,
  cancelled_at: order.cancelledAt || null,
  source_name: order.sourceName,
  tags: (order.tags || []).join(", "),
  note_attributes: (order.customAttributes || []).map((a) => ({ name: a.key, value: a.value })),
  utm_click_ids: [...new Set(utmClickIds(order.customerJourneySummary))],
  line_items: order.lineItems.nodes.map((line) => ({
    title: line.title,
    sku: line.sku,
    quantity: line.quantity,
    variant_id: line.variant?.legacyResourceId || null,
    product_id: line.variant?.product?.legacyResourceId || null,
    price: line.originalUnitPriceSet?.shopMoney?.amount,
    discount_allocations: (line.discountAllocations || []).map((d) => ({
      amount: d.allocatedAmountSet?.shopMoney?.amount,
    })),
  })),
  // Refunded amount per variant, summed over all of the order's refunds
  refunded_by_variant: (order.refunds || []).reduce((totals, refund) => {
    for (const item of refund.refundLineItems?.nodes || []) {
      const variantId = item.lineItem?.variant?.legacyResourceId;
      if (!variantId) continue;
      totals[variantId] = (totals[variantId] || 0) + (parseFloat(item.subtotalSet?.shopMoney?.amount) || 0);
    }
    return totals;
  }, {}),
});

// The order from Shopify, or null if it can't be read yet
const fetchOrder = async (store, orderId) => {
  if (!/^\d+$/.test(String(orderId))) return null;
  try {
    const data = await shopifyGraphql(store, ORDER_QUERY, { id: gid("Order", orderId) }, { allowPartial: true });
    return data?.order ? toOrderPayload(data.order) : null;
  } catch (error) {
    console.error(`Couldn't read order ${orderId}:`, error.message);
    return null;
  }
};

// Cancellations and refunds, from the order as Shopify has it now. Sets
// absolute amounts (not increments), so a repeated webhook or the nightly
// check can never subtract twice. A cancelled order's sales count as
// fully refunded.
const applyRefunds = async (store, order) => {
  const purchases = await Purchase.findAll({
    where: { store_id: store.id, shopify_order_id: String(order.id) },
  });
  let changed = 0;
  for (const purchase of purchases) {
    const paid = parseFloat(purchase.price_paid) || 0;
    const refunded = order.cancelled_at
      ? paid
      : Math.min(paid, order.refunded_by_variant?.[purchase.shopify_variant_id] || 0);
    const cancelledAt = order.cancelled_at ? new Date(order.cancelled_at) : null;
    const sameRefund = Math.abs(refunded - (parseFloat(purchase.refunded_amount) || 0)) < 0.005;
    const sameCancel = (cancelledAt?.getTime() || null) === (purchase.cancelled_at ? new Date(purchase.cancelled_at).getTime() : null);
    if (sameRefund && sameCancel) continue;
    await purchase.update({ refunded_amount: refunded.toFixed(2), cancelled_at: cancelledAt });
    changed += 1;
    console.log(
      `Sale ${order.cancelled_at ? "cancelled" : "refund updated"} — ${purchase.product_name} on order ${order.id}: ` +
        `$${refunded.toFixed(2)} of $${paid.toFixed(2)} refunded (store ${store.id})`,
    );
  }
  return changed;
};

// orders/cancelled and refunds/create webhooks: re-read the order
const refreshOrderRefunds = async (store, orderId) => {
  const order = await fetchOrder(store, orderId);
  if (order) await applyRefunds(store, order);
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

// Nightly safety net over every order in the click window. Catches sales
// whose webhook never arrived, shoppers who came back later (visit
// history, ready up to 48 hours after the order), and refunds or
// cancellations whose webhook was missed. Idempotent.
const MAX_RECONCILE_PAGES = 100;
const reconcileRecentOrders = async (store) => {
  const since = new Date(Date.now() - (CLICK_WINDOW_DAYS + 1) * DAY_MS).toISOString().slice(0, 10);
  let cursor = null;
  let pages = 0;
  const result = { orders: 0, sales: 0, refundsUpdated: 0 };
  do {
    const data = await shopifyGraphql(
      store,
      RECENT_ORDERS_QUERY,
      { cursor, query: `created_at:>=${since}` },
      { allowPartial: true },
    );
    const page = data?.orders;
    if (!page) break;
    for (const node of page.nodes) {
      const order = toOrderPayload(node);
      result.orders += 1;
      result.sales += await attributeOrder(store, order);
      result.refundsUpdated += await applyRefunds(store, order);
    }
    cursor = page.pageInfo.hasNextPage ? page.pageInfo.endCursor : null;
    pages += 1;
  } while (cursor && pages < MAX_RECONCILE_PAGES);
  return result;
};

module.exports = {
  CLICK_WINDOW_DAYS,
  CLICK_ATTRIBUTE,
  UUID_RE,
  attributeOrder,
  recordPixelCheckout,
  applyRefunds,
  refreshOrderRefunds,
  reconcileRecentOrders,
};
