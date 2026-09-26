const { User, Store } = require("../models/index.js");
const { readUnsubscribeToken } = require("../utils/unsubscribe.js");
const { storeBaseUrl } = require("../utils/storeUrl.js");
const { escapeHtml } = require("../services/emailLayout.js");

const turnOffEmail = async (token) => {
  const membershipId = readUnsubscribeToken(token);
  if (!membershipId) return null;
  const membership = await User.findByPk(membershipId);
  if (!membership) return null;
  await membership.update({ notify_email: false });
  return Store.findByPk(membership.store_id);
};

// POST /api/unsubscribe?token=… — Gmail/Yahoo one-click unsubscribe
// (RFC 8058). Mail providers call this directly; no page is shown.
const oneClickUnsubscribe = async (req, res) => {
  try {
    const store = await turnOffEmail(req.query.token);
    return res.status(store ? 200 : 400).end();
  } catch (error) {
    console.error("One-click unsubscribe error:", error.message);
    return res.status(500).end();
  }
};

// GET /api/unsubscribe?token=… — the footer link a shopper clicks
const unsubscribePage = async (req, res) => {
  let store = null;
  try {
    store = await turnOffEmail(req.query.token);
  } catch (error) {
    console.error("Unsubscribe error:", error.message);
  }

  const body = store
    ? `<h1>You're unsubscribed</h1>
       <p>You won't get alert emails from ${escapeHtml(store.name)} anymore. In-app alerts are unchanged.</p>
       <p><a href="${escapeHtml(storeBaseUrl(store))}/store/profile">Turn email back on in your profile</a></p>`
    : `<h1>This link didn't work</h1>
       <p>It may be incomplete. You can turn off email alerts anytime in your profile.</p>`;

  res.status(store ? 200 : 400).type("html").send(`<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Email alerts</title>
<style>body{margin:0;background:#0a0a0a;color:#fafafa;font-family:Arial,Helvetica,sans-serif;display:flex;min-height:100vh;align-items:center;justify-content:center;padding:16px}
main{max-width:420px;text-align:center}h1{font-size:22px}p{color:#a1a1a1;line-height:1.5}a{color:#378ADD}</style>
</head><body><main>${body}</main></body></html>`);
};

module.exports = { oneClickUnsubscribe, unsubscribePage };
