require("dotenv").config();
const {
  Store,
  Inventory,
  Alert,
  AlertClick,
  Purchase,
  NotificationLog,
  PendingNotification,
  PushSubscription,
  User,
  Account,
} = require("../models/index.js");

const shopDomain = process.argv[2];
const confirmed = process.argv.includes("--confirm");

const run = async () => {
  if (!shopDomain) {
    console.error(
      "Usage: node src/scripts/teardownStore.js <shopify_domain> [--confirm]",
    );
    process.exit(1);
  }

  const store = await Store.findOne({ where: { shopify_domain: shopDomain } });
  if (!store) {
    console.log(`No store found for shopify_domain: ${shopDomain}`);
    process.exit(0);
  }

  console.log(
    `\nFound store: ${store.name} (${store.id}), subdomain: ${store.subdomain}\n`,
  );

  const counts = {
    inventory: await Inventory.count({ where: { store_id: store.id } }),
    alerts: await Alert.count({ where: { store_id: store.id } }),
    alertClicks: await AlertClick.count({ where: { store_id: store.id } }),
    purchases: await Purchase.count({ where: { store_id: store.id } }),
    notificationLogs: await NotificationLog.count({
      where: { store_id: store.id },
    }),
    pendingNotifications: await PendingNotification.count({
      where: { store_id: store.id },
    }),
    pushSubscriptions: await PushSubscription.count({
      where: { store_id: store.id },
    }),
    memberships: await User.count({ where: { store_id: store.id } }),
  };

  console.log("Would delete:");
  console.log(`  ${counts.inventory} inventory rows`);
  console.log(`  ${counts.alerts} alerts`);
  console.log(`  ${counts.alertClicks} alert clicks`);
  console.log(`  ${counts.purchases} purchases`);
  console.log(`  ${counts.notificationLogs} notification logs`);
  console.log(`  ${counts.pendingNotifications} pending notifications`);
  console.log(`  ${counts.pushSubscriptions} push subscriptions`);
  console.log(`  ${counts.memberships} memberships (User rows)`);
  console.log(`  1 store row\n`);

  const memberships = await User.findAll({ where: { store_id: store.id } });
  let accountsToDelete = 0;
  for (const membership of memberships) {
    const otherMemberships = await User.count({
      where: { account_id: membership.account_id },
      // excludes this membership itself
    });
    if (otherMemberships === 1) accountsToDelete++;
  }
  console.log(
    `  ${accountsToDelete} account(s) with no other store memberships (would also be deleted)\n`,
  );

  if (!confirmed) {
    console.log(
      "DRY RUN — nothing was deleted. Re-run with --confirm to actually delete.\n",
    );
    process.exit(0);
  }

  console.log("Deleting...\n");

  await PushSubscription.destroy({ where: { store_id: store.id } });
  await NotificationLog.destroy({ where: { store_id: store.id } });
  await PendingNotification.destroy({ where: { store_id: store.id } });
  await AlertClick.destroy({ where: { store_id: store.id } });
  await Purchase.destroy({ where: { store_id: store.id } });
  await Alert.destroy({ where: { store_id: store.id } });
  await Inventory.destroy({ where: { store_id: store.id } });

  for (const membership of memberships) {
    const otherMemberships = await User.count({
      where: { account_id: membership.account_id },
    });
    const accountId = membership.account_id;
    await membership.destroy();
    if (otherMemberships === 1) {
      await Account.destroy({ where: { id: accountId } });
    }
  }

  await store.destroy();

  console.log("Done — store and all related data removed.\n");
  process.exit(0);
};

run().catch((err) => {
  console.error("Teardown failed:", err.message);
  process.exit(1);
});

