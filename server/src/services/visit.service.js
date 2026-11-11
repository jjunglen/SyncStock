const { SiteVisit } = require("../models/index.js");
const { visitorFor, isBot, deviceFor } = require("../utils/visitor.js");

// Counts a shopper on a store's site, once per person per day (the
// first device they used that day). Every store page loads the store's
// info (GET /api/store) once, so that's where it's counted. Runs after
// the response; an error is only logged.
const recordVisit = (req) => {
  if (!req.store?.id || isBot(req)) return;
  SiteVisit.bulkCreate(
    [
      {
        store_id: req.store.id,
        visitor: visitorFor(req),
        day: new Date().toISOString().slice(0, 10),
        device: deviceFor(req),
      },
    ],
    { ignoreDuplicates: true },
  ).catch((err) => console.error("Visit log error:", err.message));
};

module.exports = { recordVisit };
