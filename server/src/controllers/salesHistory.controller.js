const { Store } = require("../models/index.js");
const { importSalesCsv, salesTotals } = require("../services/salesHistory.service.js");
const { guideFor } = require("../services/priceGuide.service.js");

// ?store=<subdomain> — whose sales these are (each store's history only
// prices its own offers)
const storeFrom = async (req) =>
  /^[a-z0-9-]{1,63}$/.test(String(req.query.store || "")) ? Store.findOne({ where: { subdomain: req.query.store } }) : null;

// The Lab's sales history on the platform admin page (platform admin only
// — platform.routes.js): upload the "All Items Sold" CSV, see totals,
// look up a price guide.

// POST /api/platform/sales/import?store=<subdomain>&file=<name>&dry_run=1 — body: the CSV
// as text/csv. dry_run=1 previews; without it, the new sales are saved.
const importSales = async (req, res) => {
  try {
    if (typeof req.body !== "string" || !req.body.trim()) {
      return res.status(400).json({ success: false, message: "Choose a CSV file to upload" });
    }
    const store = await storeFrom(req);
    if (!store) return res.status(400).json({ success: false, message: "Choose which store these sales are from" });
    const file = String(req.query.file || "upload.csv").slice(0, 200);
    const result = await importSalesCsv(req.body, file, { dryRun: req.query.dry_run === "1", storeId: store.id });
    if (result.sales === 0) {
      return res.status(400).json({ success: false, message: "No sales found — is this the All Items Sold sheet?", data: result });
    }
    return res.status(200).json({ success: true, data: result });
  } catch (error) {
    console.error("Sales import error:", error.message);
    return res.status(500).json({ success: false, message: "Couldn't read that file. Try again." });
  }
};

// GET /api/platform/sales?store=<subdomain> — totals and past uploads
const getSalesTotals = async (req, res) => {
  try {
    const store = await storeFrom(req);
    return res.status(200).json({ success: true, data: await salesTotals(store?.id) });
  } catch (error) {
    console.error("Sales totals error:", error.message);
    return res.status(500).json({ success: false, message: "Couldn't load sales history" });
  }
};

// GET /api/platform/sales/lookup?store=<subdomain>&q=<style code or name>&size=<size>
const lookup = async (req, res) => {
  try {
    const store = await storeFrom(req);
    if (!store) return res.status(400).json({ success: false, message: "Choose a store" });
    const result = await guideFor(store, { q: req.query.q, size: req.query.size });
    if (!result) return res.status(400).json({ success: false, message: "Type a style code or name" });
    return res.status(200).json({ success: true, data: result });
  } catch (error) {
    console.error("Sales lookup error:", error.message);
    return res.status(500).json({ success: false, message: "Couldn't look that up" });
  }
};

module.exports = { importSales, getSalesTotals, lookup };
