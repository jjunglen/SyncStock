const { QueryTypes } = require("sequelize");
const { sequelize, Store, User, Account } = require("../models/index.js");
const { renderEmail, button, escapeHtml } = require("./emailLayout.js");
const { sendStoreEmail } = require("./email.service.js");
const { enabledCategories } = require("../utils/storeSettings.js");

// Monday "most wanted" email to each store's admins: the product + size
// combinations the most shoppers are waiting on that the store doesn't
// have in stock right now. Matches the way alerts match inventory (same
// product name, case-insensitive, same size), so everything listed is
// something that would send alerts the moment it's stocked. Stores can
// turn it off in settings (weekly_report).
const REPORT_SIZE = 10;

const mostWanted = (store) =>
  sequelize.query(
    `
    SELECT a.product_name, a.size, COUNT(DISTINCT a.user_id)::int AS waiting
    FROM alerts a
    WHERE a.store_id = :storeId
      AND a.active = true
      AND a.category IN (:categories)
      AND NOT EXISTS (
        SELECT 1 FROM inventory i
        WHERE i.store_id = a.store_id
          AND i.available > 0
          AND LOWER(i.product_name) = LOWER(a.product_name)
          AND i.size IS NOT DISTINCT FROM a.size
      )
    GROUP BY a.product_name, a.size
    ORDER BY waiting DESC, a.product_name
    LIMIT ${REPORT_SIZE}
    `,
    {
      replacements: { storeId: store.id, categories: enabledCategories(store) },
      type: QueryTypes.SELECT,
    },
  );

const reportHtml = (store, rows) => {
  const list = rows
    .map(
      (r, i) => `
      <tr>
        <td class="ss-muted" style="padding: 8px 8px 8px 0; font-size: 13px; color: #a1a1a1; width: 20px;">${i + 1}</td>
        <td class="ss-text" style="padding: 8px 0; font-size: 14px; color: #fafafa;">${escapeHtml(r.product_name)}${r.size ? ` <span class="ss-muted" style="color: #a1a1a1;">· ${escapeHtml(r.size)}</span>` : ""}</td>
        <td class="ss-text" style="padding: 8px 0; font-size: 14px; font-weight: bold; text-align: right; white-space: nowrap; color: #fafafa;">${r.waiting} waiting</td>
      </tr>`,
    )
    .join("");
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 24px;">${list}</table>
    ${button(`${process.env.FRONTEND_URL}/sourcing`, "See the full list")}`;
};

const sendWeeklyReport = async (store) => {
  const rows = await mostWanted(store);
  if (rows.length === 0) return false; // nothing waiting — no email

  const admins = await User.findAll({
    where: { store_id: store.id, role: "admin" },
    include: [{ model: Account, attributes: ["email", "full_name"] }],
  });
  const total = rows.reduce((sum, r) => sum + r.waiting, 0);

  for (const admin of admins) {
    if (!admin.Account?.email) continue;
    await sendStoreEmail({
      fromName: "Syncstock",
      to: admin.Account.email,
      subject: `Most wanted at ${store.name} this week: ${rows[0].product_name}`,
      html: renderEmail({
        preheader: `${total} shopper alerts are waiting on sizes you don't have in stock`,
        heading: "Most wanted this week",
        intro: `Hi${admin.Account.full_name ? ` ${escapeHtml(admin.Account.full_name)}` : ""}, these are the sizes the most ${escapeHtml(store.name)} shoppers are waiting on that aren't in stock. Stock any of them and those shoppers get an alert right away.`,
        bodyHtml: reportHtml(store, rows),
        footer: "Sent every Monday. Turn it off in Store settings.",
      }),
      text: [
        `Most wanted at ${store.name} this week (not in stock):`,
        "",
        ...rows.map((r, i) => `${i + 1}. ${r.product_name}${r.size ? ` · ${r.size}` : ""} — ${r.waiting} waiting`),
        "",
        `Full list: ${process.env.FRONTEND_URL}/sourcing`,
        "Turn this email off in Store settings.",
      ].join("\n"),
    });
  }
  return true;
};

// Runs from the Monday cron (server.js)
const sendWeeklyReports = async () => {
  const stores = await Store.findAll({ where: { status: "active", weekly_report: true } });
  let sent = 0;
  for (const store of stores) {
    try {
      if (await sendWeeklyReport(store)) sent++;
    } catch (error) {
      console.error(`Weekly report failed for ${store.subdomain}:`, error.message);
    }
  }
  console.log(`Weekly most-wanted reports sent for ${sent} of ${stores.length} stores`);
};

module.exports = { sendWeeklyReports, sendWeeklyReport, mostWanted };
