const { Op } = require("sequelize");
const {
  sequelize,
  Inventory,
  Alert,
  AlertClick,
  Purchase,
  NotificationLog,
  PendingNotification,
  PushSubscription,
  PixelClaim,
  User,
  Account,
} = require("../models/index.js");

// Deleting and exporting a store's data — used by Shopify's required
// privacy webhooks (compliance.controller.js) and the teardown script.

const findAccountByEmail = (email) =>
  Account.findOne({
    where: sequelize.where(sequelize.fn("lower", sequelize.col("email")), email.toLowerCase()),
  });

// Everything tied to one membership (a shopper at one store)
const deleteMembershipData = async (membership, transaction) => {
  const where = { user_id: membership.id };
  await PushSubscription.destroy({ where, transaction });
  await PendingNotification.destroy({ where, transaction });
  await NotificationLog.destroy({ where, transaction });
  await AlertClick.destroy({ where, transaction });
  await Alert.destroy({ where, transaction });
  // Sales stay in the merchant's totals, just no longer tied to a person
  await Purchase.update(
    { user_id: null, customer_email: null },
    { where: { user_id: membership.id }, transaction },
  );
  await membership.destroy({ transaction });
};

// An account belongs to the shopper, not one store — only removed when
// this was their last store
const deleteAccountIfUnused = async (accountId, transaction) => {
  const remaining = await User.count({ where: { account_id: accountId }, transaction });
  if (remaining === 0) await Account.destroy({ where: { id: accountId }, transaction });
  return remaining === 0;
};

// shop/redact — everything for the store, including the store row
const deleteStoreData = async (store) => {
  await sequelize.transaction(async (transaction) => {
    const where = { store_id: store.id };
    const memberships = await User.findAll({ where, transaction });

    await PixelClaim.destroy({ where, transaction });
    await PushSubscription.destroy({ where, transaction });
    await NotificationLog.destroy({ where, transaction });
    await PendingNotification.destroy({ where, transaction });
    await AlertClick.destroy({ where, transaction });
    await Purchase.destroy({ where, transaction });
    await Alert.destroy({ where, transaction });
    await Inventory.destroy({ where, transaction });

    for (const membership of memberships) {
      const accountId = membership.account_id;
      await membership.destroy({ transaction });
      await deleteAccountIfUnused(accountId, transaction);
    }
    await store.destroy({ transaction });
  });
};

// customers/redact — one shopper's data at this store. Purchases are
// matched by email too, since guests can buy without an account.
const redactCustomer = async (store, email) => {
  if (!email) return { found: false };
  return sequelize.transaction(async (transaction) => {
    await Purchase.update(
      { user_id: null, customer_email: null },
      {
        where: {
          store_id: store.id,
          [Op.and]: sequelize.where(
            sequelize.fn("lower", sequelize.col("customer_email")),
            email.toLowerCase(),
          ),
        },
        transaction,
      },
    );

    const account = await findAccountByEmail(email);
    if (!account) return { found: false };
    const membership = await User.findOne({
      where: { store_id: store.id, account_id: account.id },
      transaction,
    });
    if (!membership) return { found: false };

    await deleteMembershipData(membership, transaction);
    const accountDeleted = await deleteAccountIfUnused(account.id, transaction);
    return { found: true, accountDeleted };
  });
};

// customers/data_request — what Syncstock holds about a shopper at this
// store, for the merchant to pass on
const collectCustomerData = async (store, email) => {
  const purchases = await Purchase.findAll({
    where: {
      store_id: store.id,
      [Op.and]: sequelize.where(
        sequelize.fn("lower", sequelize.col("customer_email")),
        (email || "").toLowerCase(),
      ),
    },
    attributes: ["shopify_order_id", "product_name", "size", "price_paid", "purchased_at"],
    raw: true,
  });

  const account = email ? await findAccountByEmail(email) : null;
  const membership = account
    ? await User.findOne({ where: { store_id: store.id, account_id: account.id } })
    : null;
  if (!membership) return { email, account: null, purchases };

  const alerts = await Alert.findAll({
    where: { user_id: membership.id },
    attributes: ["product_name", "size", "max_price", "condition_preference", "active", "created_at"],
    raw: true,
  });
  const notifications = await NotificationLog.count({ where: { user_id: membership.id } });

  return {
    email: account.email,
    account: {
      full_name: account.full_name,
      sizes: account.sizes,
      phone_number: account.phone_number || null,
      created_at: account.created_at,
    },
    preferences: {
      notify_email: membership.notify_email,
      notify_inapp: membership.notify_inapp,
      notify_sms: membership.notify_sms,
      notify_size_alerts: membership.notify_size_alerts,
    },
    alerts,
    notifications_sent: notifications,
    purchases,
  };
};

module.exports = { deleteStoreData, redactCustomer, collectCustomerData };
