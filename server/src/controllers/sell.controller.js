const crypto = require("crypto");
const { Op } = require("sequelize");
const { SellRequest, SellItem, SellPhoto, User } = require("../models/index.js");
const photos = require("../services/sellPhotos.service.js");
const { suggestFor } = require("../services/priceGuide.service.js");
const emails = require("../services/sellEmails.service.js");
const {
  MAX_PHOTOS,
  MAX_ITEMS,
  MAX_OPEN,
  OPEN_STATUSES,
  cleanItem,
  missingPhotos,
  deletePhotos,
  serialize,
  withItems,
} = require("../services/sellRequest.service.js");

// "Sell your items" (beta), the shopper's side. Every route has the store
// (from the site's subdomain) and a signed-in shopper. A batch starts as a
// draft: pairs and photos are added, then it's sent to the store.

const fail = (res, status, message, extra = {}) => res.status(status).json({ success: false, message, ...extra });

// The shopper's membership at this store; the store must have selling on
const shopperAt = async (req, res) => {
  if (!req.store?.sell_enabled) {
    fail(res, 404, "Selling isn't available at this store");
    return null;
  }
  const membership = await User.findOne({ where: { account_id: req.account.id, store_id: req.store.id } });
  if (!membership) {
    fail(res, 403, "Join this store to sell your items");
    return null;
  }
  return membership;
};

const findDraft = (store, membership) =>
  SellRequest.findOne({ where: { store_id: store.id, user_id: membership.id, status: "draft" }, ...withItems });

// A request of this shopper's, with its pairs and photos
const ownRequest = (req, membership, id) =>
  /^[0-9a-f-]{36}$/i.test(String(id || ""))
    ? SellRequest.findOne({ where: { id, store_id: req.store.id, user_id: membership.id }, ...withItems })
    : null;

// A pair in this shopper's draft
const draftItem = async (req, membership, id) => {
  if (!/^[0-9a-f-]{36}$/i.test(String(id || ""))) return null;
  const item = await SellItem.findOne({
    where: { id, store_id: req.store.id },
    include: [{ model: SellRequest, where: { user_id: membership.id, status: "draft" } }, { model: SellPhoto, as: "photos" }],
  });
  return item;
};

// GET /api/sell/requests — the shopper's batches, newest first, plus the draft
const listRequests = async (req, res) => {
  try {
    const membership = await shopperAt(req, res);
    if (!membership) return;
    const rows = await SellRequest.findAll({
      where: { store_id: req.store.id, user_id: membership.id },
      ...withItems,
      order: [["created_at", "DESC"]],
      limit: 50,
    });
    const draft = rows.find((r) => r.status === "draft");
    return res.status(200).json({
      success: true,
      data: {
        draft: draft ? serialize(draft) : null,
        requests: rows.filter((r) => r.status !== "draft").map((r) => serialize(r)),
        credit_bonus: req.store.credit_bonus,
      },
    });
  } catch (error) {
    console.error("Sell list error:", error.message);
    return fail(res, 500, "Couldn't load your sell requests");
  }
};

// POST /api/sell/items — add one or more pairs to the draft
//   { items: [{ product_name, style_code, stockx_product_id, image_url,
//     category, size, condition, box, notes, asking_price }] }
const addItems = async (req, res) => {
  try {
    const membership = await shopperAt(req, res);
    if (!membership) return;
    const list = Array.isArray(req.body.items) ? req.body.items : [req.body];
    if (!list.length) return fail(res, 400, "Add at least one pair");
    const clean = [];
    for (const raw of list) {
      const { item, error } = cleanItem(raw);
      if (error) return fail(res, 400, error);
      clean.push(item);
    }
    let draft = await findDraft(req.store, membership);
    const have = draft?.items?.length || 0;
    if (have + clean.length > MAX_ITEMS) return fail(res, 400, `A batch can have up to ${MAX_ITEMS} pairs`);
    if (!draft) {
      draft = await SellRequest.create({ store_id: req.store.id, user_id: membership.id, status: "draft" });
    }
    await SellItem.bulkCreate(clean.map((i) => ({ ...i, request_id: draft.id, store_id: req.store.id })));
    const fresh = await SellRequest.findByPk(draft.id, withItems);
    return res.status(201).json({ success: true, data: serialize(fresh) });
  } catch (error) {
    console.error("Sell add error:", error.message);
    return fail(res, 500, "Couldn't add that pair");
  }
};

// PUT /api/sell/items/:id — change a pair in the draft
const updateItem = async (req, res) => {
  try {
    const membership = await shopperAt(req, res);
    if (!membership) return;
    const item = await draftItem(req, membership, req.params.id);
    if (!item) return fail(res, 404, "Pair not found");
    const { item: clean, error } = cleanItem({ ...item.toJSON(), ...req.body });
    if (error) return fail(res, 400, error);
    await item.update(clean);
    const fresh = await SellRequest.findByPk(item.request_id, withItems);
    return res.status(200).json({ success: true, data: serialize(fresh) });
  } catch (error) {
    console.error("Sell update error:", error.message);
    return fail(res, 500, "Couldn't save that pair");
  }
};

// DELETE /api/sell/items/:id — remove a pair (and its photos) from the draft
const removeItem = async (req, res) => {
  try {
    const membership = await shopperAt(req, res);
    if (!membership) return;
    const item = await draftItem(req, membership, req.params.id);
    if (!item) return fail(res, 404, "Pair not found");
    await deletePhotos({ item_id: item.id });
    await item.destroy();
    const fresh = await SellRequest.findByPk(item.request_id, withItems);
    return res.status(200).json({ success: true, data: serialize(fresh) });
  } catch (error) {
    console.error("Sell remove error:", error.message);
    return fail(res, 500, "Couldn't remove that pair");
  }
};

// POST /api/sell/items/:id/photos — one photo (the raw image as the body)
const addPhoto = async (req, res) => {
  try {
    const membership = await shopperAt(req, res);
    if (!membership) return;
    if (!photos.isConfigured()) return fail(res, 503, "Photo uploads aren't set up yet. Try again later.");
    const item = await draftItem(req, membership, req.params.id);
    if (!item) return fail(res, 404, "Pair not found");
    if (item.photos.length >= MAX_PHOTOS) return fail(res, 400, `Up to ${MAX_PHOTOS} photos per pair`);
    const data = req.body;
    if (!Buffer.isBuffer(data) || !data.length) return fail(res, 400, "Choose a photo");
    if (data.length > photos.MAX_PHOTO_BYTES) return fail(res, 400, "That photo is too large. Try again.");
    const mime = photos.photoType(data);
    if (!mime) return fail(res, 400, "Photos must be JPG, PNG or WebP");
    const ext = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" }[mime];
    const path = `${req.store.id}/${item.request_id}/${item.id}/${crypto.randomUUID()}.${ext}`;
    await photos.upload(path, data, mime);
    const photo = await SellPhoto.create({ item_id: item.id, request_id: item.request_id, store_id: req.store.id, storage_path: path, mime, bytes: data.length });
    return res.status(201).json({ success: true, data: { id: photo.id, url: `/sell/photos/${photo.id}`, count: item.photos.length + 1 } });
  } catch (error) {
    console.error("Sell photo error:", error.message);
    return fail(res, 500, "Couldn't upload that photo. Try again.");
  }
};

// DELETE /api/sell/photos/:id — remove a photo from a draft pair
const removePhoto = async (req, res) => {
  try {
    const membership = await shopperAt(req, res);
    if (!membership) return;
    if (!/^[0-9a-f-]{36}$/i.test(req.params.id)) return fail(res, 404, "Photo not found");
    const photo = await SellPhoto.findOne({
      where: { id: req.params.id, store_id: req.store.id },
      include: [{ model: SellItem, include: [{ model: SellRequest, where: { user_id: membership.id, status: "draft" } }] }],
    });
    if (!photo?.SellItem) return fail(res, 404, "Photo not found");
    await deletePhotos({ id: photo.id });
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("Sell photo delete error:", error.message);
    return fail(res, 500, "Couldn't remove that photo");
  }
};

// POST /api/sell/requests/:id/submit { payout_method: "cash" | "credit" }
// — sends the draft to the store with a suggested offer for each pair
const submitRequest = async (req, res) => {
  try {
    const membership = await shopperAt(req, res);
    if (!membership) return;
    const request = await ownRequest(req, membership, req.params.id);
    if (!request || request.status !== "draft") return fail(res, 404, "Batch not found");
    if (!request.items.length) return fail(res, 400, "Add at least one pair");
    const payout = req.body.payout_method === "credit" ? "credit" : "cash";
    if (payout === "credit" && !(req.store.credit_bonus > 0)) return fail(res, 400, "This store pays cash only");
    const short = missingPhotos(request.items);
    if (short.length) {
      const s = short[0];
      return fail(res, 400, `Add ${s.need - s.have} more photo${s.need - s.have === 1 ? "" : "s"} of the ${s.product_name} (size ${s.size})`, { missing: short });
    }
    const open = await SellRequest.count({ where: { store_id: req.store.id, user_id: membership.id, status: { [Op.in]: OPEN_STATUSES } } });
    if (open >= MAX_OPEN) return fail(res, 400, `You have ${open} batches waiting. Finish one before sending another.`);

    // Suggested offers, saved with each pair for the merchant
    for (const item of request.items) {
      const s = await suggestFor(req.store, item);
      await item.update({ suggested_offer: s.offer, suggestion: s });
    }
    await request.update({ status: "submitted", payout_method: payout, credit_bonus: req.store.credit_bonus || 0, submitted_at: new Date() });
    const fresh = await SellRequest.findByPk(request.id, withItems);
    await emails.newRequest(req.store, fresh);
    return res.status(200).json({ success: true, data: serialize(fresh) });
  } catch (error) {
    console.error("Sell submit error:", error.message);
    return fail(res, 500, "Couldn't send your batch. Try again.");
  }
};

// POST /api/sell/requests/:id/cancel — withdraw before the store answers
// (or throw away the draft); photos are deleted
const cancelRequest = async (req, res) => {
  try {
    const membership = await shopperAt(req, res);
    if (!membership) return;
    const request = await ownRequest(req, membership, req.params.id);
    if (!request || !["draft", "submitted"].includes(request.status)) return fail(res, 404, "Batch not found");
    await deletePhotos({ request_id: request.id });
    if (request.status === "draft") await request.destroy();
    else await request.update({ status: "cancelled" });
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("Sell cancel error:", error.message);
    return fail(res, 500, "Couldn't cancel that batch");
  }
};

// GET /api/sell/photos/:id — a photo, only for the shopper who sent it or
// the store's admins (no public links). Signed in; no store header needed.
const viewPhoto = async (req, res) => {
  try {
    if (!/^[0-9a-f-]{36}$/i.test(req.params.id)) return fail(res, 404, "Photo not found");
    const photo = await SellPhoto.findByPk(req.params.id, { include: [{ model: SellItem, include: [{ model: SellRequest }] }] });
    const request = photo?.SellItem?.SellRequest;
    if (!request) return fail(res, 404, "Photo not found");
    const viewer = await User.findOne({ where: { account_id: req.account.id, store_id: photo.store_id } });
    const allowed = viewer && (viewer.id === request.user_id || viewer.role === "admin");
    if (!allowed) return fail(res, 404, "Photo not found");
    const data = await photos.download(photo.storage_path);
    res.set("Content-Type", photo.mime);
    res.set("Cache-Control", "private, max-age=3600");
    res.set("X-Content-Type-Options", "nosniff");
    return res.status(200).send(data);
  } catch (error) {
    console.error("Sell photo view error:", error.message);
    return fail(res, 404, "Photo not found");
  }
};

// POST /api/sell/requests/:id/respond { accept: [item ids] } — the
// shopper's answer to an offer. Some pairs = accept those; none = decline
// (photos deleted). Accepted pairs keep their photos until drop-off.
const respondToOffer = async (req, res) => {
  try {
    const membership = await shopperAt(req, res);
    if (!membership) return;
    const request = await ownRequest(req, membership, req.params.id);
    if (!request || request.status !== "offered") return fail(res, 404, "There's no offer to answer");
    const offered = request.items.filter((i) => !i.offer_skipped && i.offer_price !== null);
    const accept = new Set(Array.isArray(req.body.accept) ? req.body.accept : []);
    if ([...accept].some((id) => !offered.some((i) => i.id === id))) return fail(res, 400, "You can only accept pairs the store made an offer on");
    for (const item of request.items) {
      await item.update({ decision: accept.has(item.id) ? "accepted" : "declined" });
    }
    const now = new Date();
    if (!accept.size) {
      await deletePhotos({ request_id: request.id });
      await request.update({ status: "declined", responded_at: now });
    } else {
      // Photos of pairs not being sold go now; the rest at drop-off
      for (const item of request.items.filter((i) => !accept.has(i.id))) await deletePhotos({ item_id: item.id });
      await request.update({ status: "accepted", responded_at: now });
    }
    const fresh = await SellRequest.findByPk(request.id, withItems);
    await emails.shopperAnswered(req.store, fresh);
    return res.status(200).json({ success: true, data: serialize(fresh) });
  } catch (error) {
    console.error("Sell respond error:", error.message);
    return fail(res, 500, "Couldn't send your answer. Try again.");
  }
};

module.exports = { respondToOffer, viewPhoto, listRequests, addItems, updateItem, removeItem, addPhoto, removePhoto, submitRequest, cancelRequest, shopperAt, ownRequest };
