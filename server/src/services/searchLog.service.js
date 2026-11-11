const { Op } = require("sequelize");
const { SearchLog } = require("../models/index.js");
const { cleanQuery } = require("../utils/inventorySearch.js");
const { visitorFor, isBot } = require("../utils/visitor.js");

// Records shopper searches for the platform admin's search monitor.
// Never slows or breaks a search: it runs after the response, and any
// error is only logged.

// Search-as-you-type sends "j", "jo", "jordan 4" a moment apart. Within
// this window, a search that extends (or backspaces) the visitor's last
// one replaces it, so the log keeps what they ended up searching.
const TYPING_WINDOW_MS = 30 * 1000;
// The same search again soon (next page, a background refresh, the
// two lists on the shopper dashboard) isn't a new search
const REPEAT_WINDOW_MS = 10 * 60 * 1000;
const MIN_LENGTH = 2;

const normalize = (q) => q.toLowerCase().replace(/\s+/g, " ").trim();

const record = async (req, { q, results, match, source }) => {
  const query = cleanQuery(q).replace(/\s+/g, " ");
  if (query.length < MIN_LENGTH || !req.store?.id) return;
  if (isBot(req)) return;

  const visitor = visitorFor(req);
  const now = Date.now();
  const last = await SearchLog.findOne({
    where: { store_id: req.store.id, visitor, updated_at: { [Op.gte]: new Date(now - REPEAT_WINDOW_MS) } },
    order: [["updated_at", "DESC"]],
  });

  if (last) {
    const before = normalize(last.query);
    const after = normalize(query);
    const typing = now - new Date(last.updatedAt).getTime() < TYPING_WINDOW_MS;
    // Still typing, or the same search again: update that row
    if (before === after || (typing && after.startsWith(before))) {
      await last.update({ query, results, match, source });
      return;
    }
    // Deleting letters: keep the longer search they had
    if (typing && before.startsWith(after)) return;
  }
  await SearchLog.create({ store_id: req.store.id, visitor, query, results, match, source });
};

// Fire and forget, after the search has answered
const recordSearch = (req, details) => {
  record(req, details).catch((err) => console.error("Search log error:", err.message));
};

module.exports = { recordSearch };
