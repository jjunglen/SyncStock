const path = require("path");
const fs = require("fs");
// Load server/.env regardless of the directory this is run from
require("dotenv").config({ path: path.join(__dirname, "../../.env") });
const { Sequelize } = require("sequelize");
const { Resend } = require("resend");
const { sequelize, Store, Account, User, Alert } = require("../models/index.js");
const { renderEmail, button, escapeHtml } = require("../services/emailLayout.js");
const { unsubscribeUrl } = require("../utils/unsubscribe.js");
const { logoUrl, textOnColor } = require("../utils/storeSettings.js");

// One-time "LabSync has moved" email to LabSync's shoppers, after
// importLabSync.js. Sent as The Laboratory DTX. Each person gets their
// name and how many alerts came across.
//
//   --preview <file.html>   write a sample email to a file, send nothing
//   --test <email>          send one sample to that address only
//   --send                  send to everyone who hasn't been sent it yet
//
// Who's been sent it is logged to server/.labsync-announcement-sent.json
// (git-ignored), so a re-run never emails anyone twice.
const STORE_SUBDOMAIN = "laboratory";
const SITE = "https://laboratory.syncstock.io";
const LOG = path.join(__dirname, "../../.labsync-announcement-sent.json");
const SKIP = ["j.junglen@gmail.com", "thelabdtx@gmail.com"]; // the owner's own accounts
const BATCH = 100; // Resend's batch limit
// Typo domains that can never be delivered (they'd only bounce, which
// hurts the sending address restock alerts use too)
const TYPO_DOMAIN = /@(gmail\.(con|co|cm|om)|gmial\.com|gmai\.com|gamil\.com|yaho\.com|yahoo\.con|hotmial\.com|icloud\.con|outlok\.com)$/i;
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const arg = (name) => {
  const i = process.argv.indexOf(name);
  return i === -1 ? null : process.argv[i + 1] || true;
};

const buildEmail = (store, { name, alertCount, unsubscribeHref }) => {
  const brand = store.brand_color
    ? { color: store.brand_color, text: textOnColor(store.brand_color) }
    : null;
  const hi = `Hi${name ? ` ${escapeHtml(name)}` : ""}`;
  const alertsLine =
    alertCount > 0
      ? `Your saved sizes and <strong>${alertCount} restock alert${alertCount === 1 ? "" : "s"}</strong> are already set up.`
      : "Your saved sizes are already set up.";
  const list = (items) =>
    `<ul class="ss-muted" style="margin: 0 0 20px; padding-left: 20px; font-size: 14px; line-height: 1.7; color: #a1a1a1;">${items
      .map((i) => `<li>${i}</li>`)
      .join("")}</ul>`;

  const html = renderEmail({
    preheader: "Same login, your alerts came with you — laboratory.syncstock.io",
    heading: "LabSync has a new home.",
    intro: `${hi}, LabSync is now <strong>laboratory.syncstock.io</strong>. Your account moved with it. ${alertsLine}`,
    bodyHtml:
      list([
        "Log in with the same email and password, or <strong>Continue with Google</strong>",
        "Set a price range on alerts, and pick Brand New or Pre-Owned",
        "Search forgives typos, and you can check out several pairs at once",
      ]) +
      `<p class="ss-muted" style="margin: 0 0 24px; font-size: 14px; line-height: 1.6; color: #a1a1a1;">One thing to redo: phone notifications. Turn them back on from your profile after you log in.</p>` +
      button(`${SITE}/store/login`, "Go to laboratory.syncstock.io", brand),
    footer: `You're getting this because you had a LabSync account with ${escapeHtml(store.name)}. Old labsync.cc links now open the new site.`,
    unsubscribeHref,
    logoUrl: logoUrl(store),
  });
  const text = [
    `${name ? `Hi ${name}` : "Hi"}, LabSync is now laboratory.syncstock.io. Your account moved with it.`,
    alertCount > 0 ? `Your saved sizes and ${alertCount} restock alert(s) are already set up.` : "Your saved sizes are already set up.",
    "",
    "- Log in with the same email and password, or Continue with Google",
    "- Set a price range on alerts, and pick Brand New or Pre-Owned",
    "- Search forgives typos, and you can check out several pairs at once",
    "",
    "One thing to redo: phone notifications. Turn them back on from your profile after you log in.",
    "",
    `${SITE}/store/login`,
    "",
    `Unsubscribe from ${store.name} emails: ${unsubscribeHref}`,
  ].join("\n");
  return { subject: "LabSync is now laboratory.syncstock.io", html, text };
};

const recipients = async (store) => {
  const labsync = new Sequelize(process.env.LABSYNC_DATABASE_URL, {
    dialect: "postgres",
    dialectOptions: { ssl: { require: true, rejectUnauthorized: false } },
    logging: false,
  });
  const [rows] = await labsync.query(`SELECT lower(email) AS email FROM users`);
  await labsync.close();
  const typos = rows.map((r) => r.email).filter((e) => TYPO_DOMAIN.test(e));
  if (typos.length) console.log(`Skipping undeliverable typo addresses: ${typos.join(", ")}`);
  const emails = rows.map((r) => r.email).filter((e) => !SKIP.includes(e) && !TYPO_DOMAIN.test(e));

  const members = await User.findAll({
    where: { store_id: store.id },
    include: [
      {
        model: Account,
        attributes: ["email", "full_name"],
        where: sequelize.where(sequelize.fn("lower", sequelize.col("Account.email")), { [require("sequelize").Op.in]: emails }),
      },
    ],
  });
  const counts = await Alert.findAll({
    where: { store_id: store.id, active: true, user_id: members.map((m) => m.id) },
    attributes: ["user_id", [sequelize.fn("COUNT", sequelize.col("id")), "n"]],
    group: ["user_id"],
    raw: true,
  });
  const byUser = new Map(counts.map((c) => [c.user_id, Number(c.n)]));
  return members
    .filter((m) => m.notify_email !== false) // respects anyone who unsubscribed
    .map((m) => ({
      email: m.Account.email,
      name: m.Account.full_name?.split(" ")[0] || null,
      alertCount: byUser.get(m.id) || 0,
      unsubscribeHref: unsubscribeUrl(m.id),
    }));
};

const run = async () => {
  const store = await Store.findOne({ where: { subdomain: STORE_SUBDOMAIN } });
  const preview = arg("--preview");
  const test = arg("--test");
  const send = process.argv.includes("--send");

  if (preview) {
    const { html } = buildEmail(store, { name: "Jordan", alertCount: 3, unsubscribeHref: `${SITE}` });
    fs.writeFileSync(preview, html);
    console.log(`Preview written to ${preview}`);
    process.exit(0);
  }

  if (!process.env.LABSYNC_DATABASE_URL) throw new Error("Set LABSYNC_DATABASE_URL");
  const resend = new Resend(process.env.RESEND_API_KEY);
  const from = `${store.name} <${process.env.RESEND_FROM_EMAIL}>`;
  const list = await recipients(store);

  if (test) {
    const sample = list.find((r) => r.alertCount > 0) || list[0];
    const email = buildEmail(store, { ...sample, name: "JP" });
    const { error } = await resend.emails.send({ from, to: test, ...email });
    if (error) throw new Error(error.message);
    console.log(`Test sent to ${test} (would go to ${list.length} people)`);
    process.exit(0);
  }

  if (!send) {
    console.log(`Would send to ${list.length} people. Use --preview, --test <email> or --send.`);
    process.exit(0);
  }

  const sent = new Set(fs.existsSync(LOG) ? JSON.parse(fs.readFileSync(LOG, "utf8")) : []);
  const todo = list.filter((r) => !sent.has(r.email.toLowerCase()));
  console.log(`Sending to ${todo.length} (${list.length - todo.length} already sent)`);

  const message = (r) => ({
    from,
    to: r.email,
    ...buildEmail(store, r),
    headers: {
      "List-Unsubscribe": `<${r.unsubscribeHref}>`,
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    },
  });
  const markSent = (list) => {
    list.forEach((r) => sent.add(r.email.toLowerCase()));
    fs.writeFileSync(LOG, JSON.stringify([...sent], null, 1));
  };
  const skipped = [];

  for (let i = 0; i < todo.length; i += BATCH) {
    const batch = todo.slice(i, i + BATCH);
    const { error } = await resend.batch.send(batch.map(message));
    if (!error) {
      markSent(batch);
      console.log(`  sent ${Math.min(i + BATCH, todo.length)}/${todo.length}`);
      continue;
    }
    // One bad address rejects a whole batch — send this batch one by one
    // (under Resend's 2-per-second limit) so it only skips that person
    console.log(`  batch ${i / BATCH + 1} rejected (${error.message}) — sending one at a time`);
    for (const r of batch) {
      const one = await resend.emails.send(message(r));
      if (one.error) skipped.push(`${r.email} (${one.error.message})`);
      else markSent([r]);
      await wait(600);
    }
    console.log(`  done ${Math.min(i + BATCH, todo.length)}/${todo.length}`);
  }
  console.log(`Sent: ${sent.size} total.${skipped.length ? ` Skipped ${skipped.length}:` : ""}`);
  skipped.forEach((s) => console.log(`  - ${s}`));
  process.exit(0);
};

run().catch((err) => {
  console.error("Failed:", err.message);
  process.exit(1);
});
