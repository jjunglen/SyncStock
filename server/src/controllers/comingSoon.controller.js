const { Op } = require("sequelize");
const { ProductDrop, Inventory } = require("../models/index.js");
const { comingSoonList } = require("./inventory.controller.js");

// The merchant's Coming soon list (Store settings → Coming soon page):
// each item with its drop time, which shoppers see on the Coming soon
// page. Shoppers with an alert for it get a reminder about an hour before
// (dropReminder.service.js).

// GET /api/store/coming-soon
const getComingSoonDrops = async (req, res) => {
  try {
    const store = req.store;
    if (!store.coming_soon) return res.status(200).json({ success: true, data: [] });
    const items = await comingSoonList(store);
    return res.status(200).json({
      success: true,
      data: items.map((i) => ({
        product_id: i.product_id,
        name: i.name,
        brand: i.brand,
        category: i.category,
        image_url: i.image_url,
        photo_source: i.photo_source || null,
        sizes: i.sizes,
        drops_at: i.drops_at,
      })),
    });
  } catch (error) {
    console.error("Coming soon drops error:", error.message);
    return res.status(500).json({ success: false, message: "Couldn't load your Coming soon items" });
  }
};

const MAX_AHEAD_MS = 366 * 24 * 60 * 60 * 1000;

// PUT /api/store/coming-soon/:productId { drops_at: ISO time | null }
// null clears it. A new time means a new reminder.
const setDropTime = async (req, res) => {
  try {
    const store = req.store;
    const productId = String(req.params.productId || "");
    if (!/^\d{1,20}$/.test(productId)) return res.status(400).json({ success: false, message: "Unknown product" });
    const owned = await Inventory.findOne({ where: { store_id: store.id, shopify_product_id: productId }, attributes: ["id"] });
    if (!owned) return res.status(404).json({ success: false, message: "That product isn't in your catalog" });

    const raw = req.body?.drops_at;
    if (raw == null || raw === "") {
      await ProductDrop.destroy({ where: { store_id: store.id, shopify_product_id: productId } });
      return res.status(200).json({ success: true, data: { product_id: productId, drops_at: null } });
    }
    const at = new Date(raw);
    if (Number.isNaN(at.getTime())) return res.status(400).json({ success: false, message: "Pick a date and time" });
    if (at.getTime() <= Date.now()) return res.status(400).json({ success: false, message: "Pick a time in the future" });
    if (at.getTime() - Date.now() > MAX_AHEAD_MS) {
      return res.status(400).json({ success: false, message: "Pick a time within the next year" });
    }

    const existing = await ProductDrop.findOne({ where: { store_id: store.id, shopify_product_id: productId } });
    if (existing) {
      const changed = existing.drops_at.getTime() !== at.getTime();
      await existing.update({ drops_at: at, ...(changed && { reminded_at: null }) });
    } else {
      await ProductDrop.create({ store_id: store.id, shopify_product_id: productId, drops_at: at });
    }
    return res.status(200).json({ success: true, data: { product_id: productId, drops_at: at.toISOString() } });
  } catch (error) {
    console.error("Set drop time error:", error.message);
    return res.status(500).json({ success: false, message: "Couldn't save the drop time" });
  }
};

// Old drop times (a week past) are cleaned up nightly
const removePastDrops = () =>
  ProductDrop.destroy({ where: { drops_at: { [Op.lt]: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } } });

module.exports = { getComingSoonDrops, setDropTime, removePastDrops };
