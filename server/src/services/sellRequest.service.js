const { Op } = require("sequelize");
const { enabledCategories } = require("../utils/storeSettings.js");
const { PICKABLE_COMPANIES, PICKABLE_RAW, GRADES, BLACK_LABEL } = require("../utils/cardDetails.js");
const { SellRequest, SellItem, SellPhoto } = require("../models/index.js");
const photos = require("./sellPhotos.service.js");

// Rules for "Sell your items" (beta), shared by the shopper and merchant
// sides (sell.controller.js, sellStore.controller.js).

const CONDITIONS = ["new", "used"];
const BOXES = ["original", "damaged", "none"];
// What shoppers can sell — only the ones the store has switched on
// (Store settings → categories)
const CATEGORIES = ["sneakers", "clothing", "trading_cards"];
const sellCategories = (store) => CATEGORIES.filter((c) => enabledCategories(store).includes(c));
const CATEGORY_NAMES = { sneakers: "sneakers", clothing: "clothing", trading_cards: "trading cards" };
// Photos per item: pre-owned needs more angles than brand new; cards and
// sealed product need the front and back
const MIN_PHOTOS = { new: 2, used: 4, raw: 2, graded: 2, sealed: 2 };
const CARD_TYPES = ["raw", "graded", "sealed"];

// A trading card's details: { card, size, condition, box } or { error }
const cleanCard = (body) => {
  const src = body.card || body;
  const type = src.type || src.card_type;
  if (!CARD_TYPES.includes(type)) return { error: "Pick raw, graded or sealed" };
  if (type === "raw") {
    if (!PICKABLE_RAW.includes(src.raw_condition)) return { error: "Pick the card's condition: NM, LP or MP" };
    return { card: { type, raw_condition: src.raw_condition }, size: src.raw_condition, condition: "raw", box: "none" };
  }
  if (type === "graded") {
    const company = src.grading_company;
    if (!PICKABLE_COMPANIES.includes(company)) return { error: "Pick the grading company" };
    const grade = String(src.grade || "");
    if (!GRADES.includes(grade)) return { error: "Pick the grade" };
    if (grade === BLACK_LABEL && company !== "BGS") return { error: "Black Label is a Beckett grade" };
    const cert = String(src.cert_number || "").replace(/\D/g, "");
    if (cert && (cert.length < 6 || cert.length > 12)) return { error: "Cert numbers are 6 to 12 digits" };
    const label = `${company === "OTHER" ? "Graded" : company} ${grade === BLACK_LABEL ? "BL" : grade}`;
    return {
      card: { type, grading_company: company, grade, cert_number: cert || null },
      size: label,
      condition: "graded",
      box: "none",
    };
  }
  const box = src.box === "damaged" || body.box === "damaged" ? "damaged" : "original";
  return { card: { type }, size: "Sealed", condition: "sealed", box };
};
const MAX_PHOTOS = 6;
const MAX_ITEMS = 20; // pairs per batch
const MAX_OPEN = 3; // batches sent and not finished, per shopper per store
const EXPIRE_DAYS = 30; // no answer → expired, photos deleted
// Still in progress from the shopper's side
const OPEN_STATUSES = ["submitted", "offered", "accepted"];

const money = (v) => (v === null || v === undefined ? null : Number(v));

// Checks one pair's details. Returns { item } or { error }.
// allowed: the categories this store buys (sellCategories)
const cleanItem = (body = {}, allowed = CATEGORIES) => {
  const name = String(body.product_name || "").trim();
  if (!name || name.length > 200) return { error: "Name the item (up to 200 characters)" };
  const category = body.category ?? "sneakers";
  if (!CATEGORIES.includes(category)) return { error: "Pick what kind of item it is" };
  if (!allowed.includes(category)) return { error: `This store isn't buying ${CATEGORY_NAMES[category]} right now` };
  let size;
  let condition;
  let box;
  let card = null;
  if (category === "trading_cards") {
    const c = cleanCard(body);
    if (c.error) return { error: c.error };
    ({ size, condition, box, card } = c);
  } else {
    size = String(body.size || "").trim();
    if (!size || size.length > 20) return { error: "Pick a size" };
    condition = body.condition;
    if (!CONDITIONS.includes(condition)) return { error: "Pick brand new or pre-owned" };
    box = body.box ?? "original";
    if (!BOXES.includes(box)) return { error: "Pick the box condition" };
  }
  let asking = null;
  if (body.asking_price !== undefined && body.asking_price !== null && body.asking_price !== "") {
    asking = Number(String(body.asking_price).replace(/[$,\s]/g, ""));
    if (!Number.isFinite(asking) || asking <= 0 || asking > 100000) return { error: "Enter a valid asking price" };
    asking = Math.round(asking * 100) / 100;
  }
  const text = (v, max) => (v === undefined || v === null ? null : String(v).trim().slice(0, max) || null);
  // Only a StockX image (or none) — never an arbitrary URL in emails
  const image = text(body.image_url, 500);
  return {
    item: {
      product_name: name,
      style_code: text(body.style_code, 60)?.toUpperCase() || null,
      stockx_product_id: text(body.stockx_product_id, 80),
      image_url: image && /^https:\/\/images\.stockx\.com\//.test(image) ? image : null,
      category,
      size,
      condition,
      box,
      card,
      notes: text(body.notes, 500),
      asking_price: asking,
    },
  };
};

// Pairs that don't have enough photos yet: [{ id, product_name, size, have, need }]
const missingPhotos = (items) =>
  items
    .map((i) => ({ id: i.id, product_name: i.product_name, size: i.size, category: i.category, have: (i.photos || []).length, need: MIN_PHOTOS[i.condition] || 2 }))
    .filter((i) => i.have < i.need);

// Deletes the photo files and rows for a request (or one pair)
const deletePhotos = async (where) => {
  const rows = await SellPhoto.findAll({ where, attributes: ["id", "storage_path"], raw: true });
  if (!rows.length) return 0;
  if (photos.isConfigured()) {
    try {
      await photos.remove(rows.map((r) => r.storage_path));
    } catch (error) {
      // Rows go anyway; the cleanup job retries files by prefix
      console.error("Sell photo delete error:", error.message);
    }
  }
  await SellPhoto.destroy({ where: { id: rows.map((r) => r.id) } });
  return rows.length;
};

const photoUrl = (photo) => `/sell/photos/${photo.id}`;

// What the shopper or the merchant sees for a request
const serialize = (request, { merchant = false } = {}) => {
  const r = request.toJSON ? request.toJSON() : request;
  const items = (r.items || [])
    .slice()
    .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
    .map((i) => ({
      id: i.id,
      product_name: i.product_name,
      style_code: i.style_code,
      image_url: i.image_url,
      category: i.category,
      size: i.size,
      condition: i.condition,
      box: i.box,
      card: i.card || null,
      notes: i.notes,
      asking_price: money(i.asking_price),
      photos: (i.photos || []).map((p) => ({ id: p.id, url: photoUrl(p) })),
      min_photos: MIN_PHOTOS[i.condition] || 2,
      offer_price: r.status === "draft" || r.status === "submitted" ? (merchant ? money(i.offer_price) : null) : money(i.offer_price),
      offer_skipped: i.offer_skipped,
      decision: i.decision,
      paid_price: money(i.paid_price),
      ...(merchant && { suggested_offer: money(i.suggested_offer), suggestion: i.suggestion }),
    }));
  return {
    id: r.id,
    status: r.status,
    payout_method: r.payout_method,
    credit_bonus: r.credit_bonus,
    offer_total: money(r.offer_total),
    merchant_message: r.merchant_message,
    submitted_at: r.submitted_at,
    offered_at: r.offered_at,
    responded_at: r.responded_at,
    received_at: r.received_at,
    created_at: r.created_at,
    items,
    ...(merchant && r.User && { shopper: shopperLabel(r.User) }),
  };
};

// "Alex M." — first name and last initial for the merchant's list
const shopperLabel = (membership) => {
  const name = membership?.Account?.full_name || "";
  const [first, ...rest] = name.trim().split(/\s+/);
  if (!first) return "A shopper";
  const last = rest.pop();
  return last ? `${first} ${last[0].toUpperCase()}.` : first;
};

// The amount the shopper gets for an item's offer: cash, or credit with
// the bonus added
const payoutFor = (offer, request) =>
  offer === null || offer === undefined
    ? null
    : request.payout_method === "credit"
      ? Math.round(Number(offer) * (1 + (request.credit_bonus || 0) / 100) * 100) / 100
      : Number(offer);

const withItems = { include: [{ model: SellItem, as: "items", include: [{ model: SellPhoto, as: "photos", attributes: ["id", "created_at"] }] }] };

// Requests with no answer for EXPIRE_DAYS: marked expired, photos deleted.
// Drafts left that long are removed the same way. Run daily (server.js).
const expireStale = async (now = new Date()) => {
  const cutoff = new Date(now.getTime() - EXPIRE_DAYS * 24 * 60 * 60 * 1000);
  const stale = await SellRequest.findAll({
    where: {
      [Op.or]: [
        { status: "draft", updated_at: { [Op.lt]: cutoff } },
        { status: "submitted", submitted_at: { [Op.lt]: cutoff } },
        { status: "offered", offered_at: { [Op.lt]: cutoff } },
      ],
    },
    attributes: ["id", "status"],
  });
  for (const r of stale) {
    await deletePhotos({ request_id: r.id });
    await r.update({ status: "expired" });
  }
  return stale.length;
};

module.exports = {
  sellCategories,
  CONDITIONS,
  BOXES,
  MIN_PHOTOS,
  MAX_PHOTOS,
  MAX_ITEMS,
  MAX_OPEN,
  EXPIRE_DAYS,
  OPEN_STATUSES,
  cleanItem,
  missingPhotos,
  deletePhotos,
  serialize,
  payoutFor,
  withItems,
  expireStale,
  shopperLabel,
};
