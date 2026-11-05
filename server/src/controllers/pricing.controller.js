const { listingsVsSales } = require("../services/listingPrices.service.js");
const { isPriceCheckEnabled } = require("../services/priceCheck.service.js");

// GET /api/analytics/listing-prices (store admin) — the Pricing page's
// "Your listings" tab: each in-stock listing against this store's own past
// sales. stockx: whether this store also gets the "vs StockX" tab.
const getListingPrices = async (req, res) => {
  try {
    const data = await listingsVsSales(req.store);
    return res.status(200).json({ success: true, data: { ...data, stockx: isPriceCheckEnabled(req.store) } });
  } catch (error) {
    console.error("Listing prices error:", error.message);
    return res.status(500).json({ success: false, message: "Couldn't load your listings" });
  }
};

module.exports = { getListingPrices };
