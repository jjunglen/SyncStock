const { listingsVsSales } = require("../services/listingPrices.service.js");
const { isPriceCheckEnabled } = require("../services/priceCheck.service.js");
const { importSalesCsv, salesTotals } = require("../services/salesHistory.service.js");

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

// GET /api/analytics/sales-history (store admin) — this store's imported
// sales: totals and past uploads
const getSalesHistory = async (req, res) => {
  try {
    return res.status(200).json({ success: true, data: await salesTotals(req.store.id) });
  } catch (error) {
    console.error("Sales history error:", error.message);
    return res.status(500).json({ success: false, message: "Couldn't load your sales history" });
  }
};

// POST /api/analytics/sales-import?file=<name>&dry_run=1 (store admin) —
// body: the sales CSV (SyncStock's template) as text. dry_run=1 previews;
// without it, the new sales are saved to this store only. Rows already
// saved are skipped, so uploading the same file twice is safe.
const importSales = async (req, res) => {
  try {
    if (typeof req.body !== "string" || !req.body.trim()) {
      return res.status(400).json({ success: false, message: "Choose a CSV file to upload" });
    }
    const file = String(req.query.file || "sales.csv").slice(0, 200);
    const result = await importSalesCsv(req.body, file, { dryRun: req.query.dry_run === "1", storeId: req.store.id });
    if (result.sales === 0) {
      return res.status(400).json({
        success: false,
        message: "No sales found. Use the template's columns, with a sold price and a sold date on each row.",
        data: result,
      });
    }
    return res.status(200).json({ success: true, data: result });
  } catch (error) {
    console.error("Merchant sales import error:", error.message);
    return res.status(500).json({ success: false, message: "Couldn't read that file. Try again." });
  }
};

module.exports = { getListingPrices, getSalesHistory, importSales };
