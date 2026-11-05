const { Op } = require("sequelize");
const { SellRequest, SellItem, SellPhoto, User, Account } = require("../models/index.js");
const emails = require("../services/sellEmails.service.js");
const { deletePhotos, serialize, payoutFor } = require("../services/sellRequest.service.js");

// "Sell your items" (beta), the merchant's side (store admins): batches
// shoppers sent, the offer for each pair, and checking pairs in.

const fail = (res, status, message) => res.status(status).json({ success: false, message });

const VIEWS = {
  open: ["submitted", "offered"],
  accepted: ["accepted"],
  done: ["received", "declined", "expired", "cancelled"],
};

const withEverything = {
  include: [
    { model: SellItem, as: "items", include: [{ model: SellPhoto, as: "photos", attributes: ["id", "created_at"] }] },
    { model: User, include: [{ model: Account, attributes: ["full_name", "email"] }] },
  ],
};

const storeRequest = (req) =>
  /^[0-9a-f-]{36}$/i.test(String(req.params.id || ""))
    ? SellRequest.findOne({ where: { id: req.params.id, store_id: req.store.id, status: { [Op.ne]: "draft" } }, ...withEverything })
    : null;

const shopperAccount = (request) => request.User?.Account || null;

// GET /api/sell/store/requests?view=open|accepted|done
const listStoreRequests = async (req, res) => {
  try {
    const view = VIEWS[req.query.view] ? req.query.view : "open";
    const rows = await SellRequest.findAll({
      where: { store_id: req.store.id, status: VIEWS[view] },
      ...withEverything,
      order: [["submitted_at", "DESC"]],
      limit: 100,
    });
    const counts = {};
    for (const [key, statuses] of Object.entries(VIEWS)) {
      counts[key] = await SellRequest.count({ where: { store_id: req.store.id, status: statuses } });
    }
    return res.status(200).json({
      success: true,
      data: { view, counts, requests: rows.map((r) => serialize(r, { merchant: true })), margins: { new: req.store.buy_margin_new, used: req.store.buy_margin_used } },
    });
  } catch (error) {
    console.error("Buy requests list error:", error.message);
    return fail(res, 500, "Couldn't load buy requests");
  }
};

// POST /api/sell/store/requests/:id/offer
//   { items: [{ id, offer_price }], message } — offer_price null = not buying it
// Can be sent again to change an offer the shopper hasn't answered.
const sendOffer = async (req, res) => {
  try {
    const request = await storeRequest(req);
    if (!request || !["submitted", "offered"].includes(request.status)) return fail(res, 404, "Request not found or already answered");
    const given = new Map((Array.isArray(req.body.items) ? req.body.items : []).map((i) => [i.id, i.offer_price]));
    const updates = [];
    for (const item of request.items) {
      if (!given.has(item.id)) return fail(res, 400, "Price or skip every item");
      const raw = given.get(item.id);
      if (raw === null || raw === "" || raw === undefined) {
        updates.push([item, null]);
        continue;
      }
      const price = Number(String(raw).replace(/[$,\s]/g, ""));
      if (!Number.isFinite(price) || price <= 0 || price > 100000) return fail(res, 400, `Enter a valid offer for the ${item.product_name} (size ${item.size})`);
      updates.push([item, Math.round(price * 100) / 100]);
    }
    if (!updates.some(([, p]) => p !== null)) return fail(res, 400, "Make an offer on at least one item, or decline the request");
    for (const [item, price] of updates) {
      await item.update({ offer_price: price, offer_skipped: price === null });
    }
    const total = updates.reduce((sum, [, p]) => sum + (p || 0), 0);
    const message = String(req.body.message || "").trim().slice(0, 500) || null;
    await request.update({ status: "offered", offer_total: total, merchant_message: message, offered_at: new Date() });
    const fresh = await storeRequest(req);
    const account = shopperAccount(fresh);
    if (account) await emails.offerSent(req.store, account, fresh);
    return res.status(200).json({ success: true, data: serialize(fresh, { merchant: true }) });
  } catch (error) {
    console.error("Send offer error:", error.message);
    return fail(res, 500, "Couldn't send the offer. Try again.");
  }
};

// POST /api/sell/store/requests/:id/decline { message } — not buying any of it
const declineRequest = async (req, res) => {
  try {
    const request = await storeRequest(req);
    if (!request || !["submitted", "offered"].includes(request.status)) return fail(res, 404, "Request not found or already answered");
    const message = String(req.body.message || "").trim().slice(0, 500) || null;
    await deletePhotos({ request_id: request.id });
    await request.update({ status: "declined", merchant_message: message, responded_at: new Date() });
    const account = shopperAccount(request);
    if (account) await emails.storeDeclined(req.store, account, request);
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("Decline request error:", error.message);
    return fail(res, 500, "Couldn't decline. Try again.");
  }
};

// POST /api/sell/store/requests/:id/received { items: [ids] } — the pairs
// came in and were paid for. Defaults to every accepted pair; pairs left
// out didn't come in. Records what was paid (credit includes the bonus)
// and deletes the photos — the pair records stay for the price guide.
const markReceived = async (req, res) => {
  try {
    const request = await storeRequest(req);
    if (!request || request.status !== "accepted") return fail(res, 404, "Request not found or not accepted yet");
    const accepted = request.items.filter((i) => i.decision === "accepted");
    const ids = Array.isArray(req.body.items) ? new Set(req.body.items) : new Set(accepted.map((i) => i.id));
    const arrived = accepted.filter((i) => ids.has(i.id));
    if (!arrived.length) return fail(res, 400, "Pick the items that came in");
    const now = new Date();
    for (const item of accepted) {
      if (ids.has(item.id)) await item.update({ paid_price: payoutFor(item.offer_price, request), received_at: now });
      else await item.update({ decision: "no_show" });
    }
    await deletePhotos({ request_id: request.id });
    await request.update({ status: "received", received_at: now });
    const fresh = await storeRequest(req);
    const paid = arrived.reduce((sum, i) => sum + payoutFor(i.offer_price, request), 0);
    return res.status(200).json({
      success: true,
      data: { ...serialize(fresh, { merchant: true }), paid_total: Math.round(paid * 100) / 100 },
    });
  } catch (error) {
    console.error("Mark received error:", error.message);
    return fail(res, 500, "Couldn't check those in. Try again.");
  }
};

module.exports = { listStoreRequests, sendOffer, declineRequest, markReceived };
