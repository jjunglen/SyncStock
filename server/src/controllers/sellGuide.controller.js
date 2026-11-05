const { guideFor } = require("../services/priceGuide.service.js");

// GET /api/sell/store/guide?q=<SKU or name>&size=<size> (store admin) —
// the price guide from this store's own sales history
const getGuide = async (req, res) => {
  try {
    const guide = await guideFor(req.store, { q: req.query.q, size: req.query.size });
    if (!guide) return res.status(400).json({ success: false, message: "Type a style code or name" });
    return res.status(200).json({
      success: true,
      data: {
        ...guide,
        margins: { new: req.store.buy_margin_new, used: req.store.buy_margin_used },
      },
    });
  } catch (error) {
    console.error("Price guide error:", error.message);
    return res.status(500).json({ success: false, message: "Couldn't load the price guide" });
  }
};

module.exports = { getGuide };
