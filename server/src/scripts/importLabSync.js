const path = require("path");
// Load server/.env regardless of the directory this is run from
require("dotenv").config({ path: path.join(__dirname, "../../.env") });
const { Sequelize, Op } = require("sequelize");
const { sequelize, Store, Account, User, Alert } = require("../models/index.js");

// One-time move of LabSync's shoppers into Syncstock as shoppers of The
// Laboratory DTX (laboratory.syncstock.io). LabSync is only READ, never
// changed. Safe to re-run: people and alerts already moved are skipped.
//
// What moves, per LabSync user:
//   - account: email (as typed), name, photo, saved sizes, email verified
//     - password users keep their password (same bcrypt format)
//     - Google-only users get a placeholder id; their first Google
//       sign-in on Syncstock links it (google.auth.controller.js)
//   - store membership: email / in-app / "any size match" settings
//   - active alerts: shoe, size, condition, max price, StockX ids
// Someone who already has a Syncstock account keeps their login and
// Syncstock settings; their LabSync sizes and alerts are added.
// Push subscriptions can't move (tied to LabSync's website).
//
// Usage:
//   LABSYNC_DATABASE_URL=… node src/scripts/importLabSync.js            (dry run)
//   LABSYNC_DATABASE_URL=… node src/scripts/importLabSync.js --apply
const APPLY = process.argv.includes("--apply");
const STORE_SUBDOMAIN = "laboratory";

const run = async () => {
  if (!process.env.LABSYNC_DATABASE_URL) throw new Error("Set LABSYNC_DATABASE_URL");
  const labsync = new Sequelize(process.env.LABSYNC_DATABASE_URL, {
    dialect: "postgres",
    dialectOptions: { ssl: { require: true, rejectUnauthorized: false } },
    logging: false,
  });
  const store = await Store.findOne({ where: { subdomain: STORE_SUBDOMAIN } });
  if (!store) throw new Error(`No store "${STORE_SUBDOMAIN}"`);

  const [users] = await labsync.query(
    `SELECT id, auth_id, email, sizes, password, full_name, avatar_url, notify_size_alerts,
            notify_email, notify_inapp, email_verified FROM users ORDER BY created_at`,
  );
  const [alerts] = await labsync.query(
    `SELECT user_id, stockx_product_id, shoe_name, sku, stockx_url_key, size,
            condition_preference, max_price, notify_email, notify_inapp
     FROM alerts WHERE active = true`,
  );
  const alertsByUser = new Map();
  for (const a of alerts) {
    if (!alertsByUser.has(a.user_id)) alertsByUser.set(a.user_id, []);
    alertsByUser.get(a.user_id).push(a);
  }

  const totals = {
    labsyncUsers: users.length, newAccounts: 0, existingAccounts: 0,
    newMemberships: 0, googleOnly: 0, unverified: 0,
    alertsCopied: 0, alertsSkipped: 0, errors: 0,
  };
  const existingEmails = [];

  for (const u of users) {
    try {
      await sequelize.transaction(async (transaction) => {
        let account = await Account.findOne({
          where: sequelize.where(sequelize.fn("lower", sequelize.col("email")), u.email.toLowerCase()),
          transaction,
        });
        const sizes = Array.isArray(u.sizes) ? u.sizes : [];

        if (account) {
          totals.existingAccounts++;
          existingEmails.push(u.email);
          const merged = [...new Set([...(account.sizes || []), ...sizes])];
          if (APPLY && merged.length !== (account.sizes || []).length) {
            await account.update({ sizes: merged }, { transaction });
          }
        } else {
          totals.newAccounts++;
          const googleOnly = !u.password;
          if (googleOnly) totals.googleOnly++;
          const verified = googleOnly || !!u.email_verified;
          if (!verified) totals.unverified++;
          if (APPLY) {
            account = await Account.create(
              {
                email: u.email.trim(),
                password: u.password || null,
                auth_id: googleOnly ? `labsync:${u.auth_id || u.id}` : null,
                full_name: u.full_name || null,
                avatar_url: u.avatar_url || null,
                sizes,
                email_verified: verified,
              },
              { transaction, hooks: false },
            );
          }
        }

        let membership = account
          ? await User.findOne({ where: { account_id: account.id, store_id: store.id }, transaction })
          : null;
        if (!membership) {
          totals.newMemberships++;
          if (APPLY) {
            membership = await User.create(
              {
                account_id: account.id,
                store_id: store.id,
                role: "user",
                notify_email: u.notify_email ?? true,
                notify_inapp: u.notify_inapp ?? true,
                notify_size_alerts: !!u.notify_size_alerts,
              },
              { transaction },
            );
          }
        }

        for (const a of alertsByUser.get(u.id) || []) {
          const duplicate = membership
            ? await Alert.findOne({
                where: {
                  user_id: membership.id,
                  size: a.size,
                  active: true,
                  [Op.and]: sequelize.where(
                    sequelize.fn("lower", sequelize.col("product_name")),
                    a.shoe_name.toLowerCase(),
                  ),
                },
                transaction,
              })
            : null;
          if (duplicate) {
            totals.alertsSkipped++;
            continue;
          }
          totals.alertsCopied++;
          if (APPLY) {
            await Alert.create(
              {
                store_id: store.id,
                user_id: membership.id,
                category: "sneakers",
                product_name: a.shoe_name,
                sku: a.sku || null,
                size: a.size,
                condition_preference: a.condition_preference || "either",
                max_price: a.max_price || null,
                stockx_product_id: a.stockx_product_id || null,
                stockx_url_key: a.stockx_url_key || null,
                notify_email: a.notify_email ?? true,
                notify_inapp: a.notify_inapp ?? true,
                active: true,
              },
              { transaction },
            );
          }
        }
      });
    } catch (error) {
      totals.errors++;
      console.error(`  ! ${u.email}: ${error.message}`);
    }
  }

  console.log(APPLY ? "\nIMPORTED:" : "\nDRY RUN — nothing written. Would import:");
  console.table(totals);
  if (existingEmails.length) console.log("Already on Syncstock (merged, login unchanged):", existingEmails.join(", "));
  if (!APPLY) console.log("\nRe-run with --apply to import.");
  await labsync.close();
  process.exit(totals.errors ? 1 : 0);
};

run().catch((err) => {
  console.error("Import failed:", err.message);
  process.exit(1);
});
