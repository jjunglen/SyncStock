const { sequelize } = require("../config/database.js");

const Store = require("./Store.js");
const Account = require("./Account.js");
const User = require("./User.js");
const Alert = require("./Alert.js");
const Inventory = require("./Inventory.js");
const NotificationLog = require("./NotificationLog.js");
const AlertClick = require("./AlertClick.js");
const Purchase = require("./Purchase.js");
const PushSubscription = require("./PushSubscription.js");
const PendingNotification = require("./PendingNotification.js");
const StockxImageCache = require("./StockxImageCache.js");

Store.hasMany(User, { foreignKey: "store_id", onDelete: "CASCADE" });
Store.hasMany(Inventory, { foreignKey: "store_id", onDelete: "CASCADE" });
Store.hasMany(Alert, { foreignKey: "store_id", onDelete: "CASCADE" });
Store.hasMany(NotificationLog, { foreignKey: "store_id", onDelete: "CASCADE" });
Store.hasMany(AlertClick, { foreignKey: "store_id", onDelete: "CASCADE" });
Store.hasMany(Purchase, { foreignKey: "store_id", onDelete: "CASCADE" });
Store.hasMany(PushSubscription, {
  foreignKey: "store_id",
  onDelete: "CASCADE",
});
Store.hasMany(PendingNotification, {
  foreignKey: "store_id",
  onDelete: "CASCADE",
});

User.belongsTo(Store, { foreignKey: "store_id" });
Inventory.belongsTo(Store, { foreignKey: "store_id" });
Alert.belongsTo(Store, { foreignKey: "store_id" });
NotificationLog.belongsTo(Store, { foreignKey: "store_id" });
AlertClick.belongsTo(Store, { foreignKey: "store_id" });
Purchase.belongsTo(Store, { foreignKey: "store_id" });
PushSubscription.belongsTo(Store, { foreignKey: "store_id" });
PendingNotification.belongsTo(Store, { foreignKey: "store_id" });

Account.hasMany(User, { foreignKey: "account_id", onDelete: "CASCADE" });
User.belongsTo(Account, { foreignKey: "account_id" });

User.hasMany(Alert, { foreignKey: "user_id", onDelete: "CASCADE" });
User.hasMany(NotificationLog, { foreignKey: "user_id", onDelete: "CASCADE" });
User.hasMany(AlertClick, { foreignKey: "user_id", onDelete: "CASCADE" });
User.hasMany(Purchase, { foreignKey: "user_id", onDelete: "SET NULL" });
User.hasMany(PushSubscription, { foreignKey: "user_id", onDelete: "CASCADE" });
User.hasMany(PendingNotification, {
  foreignKey: "user_id",
  onDelete: "CASCADE",
});

Alert.belongsTo(User, { foreignKey: "user_id" });
NotificationLog.belongsTo(User, { foreignKey: "user_id" });
AlertClick.belongsTo(User, { foreignKey: "user_id" });
Purchase.belongsTo(User, { foreignKey: "user_id" });
PushSubscription.belongsTo(User, { foreignKey: "user_id" });
PendingNotification.belongsTo(User, { foreignKey: "user_id" });

Alert.hasMany(NotificationLog, {
  foreignKey: "alert_id",
  onDelete: "SET NULL",
});
Alert.hasMany(AlertClick, { foreignKey: "alert_id", onDelete: "SET NULL" });
Alert.hasMany(Purchase, { foreignKey: "alert_id", onDelete: "SET NULL" });

Inventory.hasMany(NotificationLog, {
  foreignKey: "inventory_id",
  onDelete: "SET NULL",
});

NotificationLog.hasMany(AlertClick, {
  foreignKey: "notification_id",
  onDelete: "SET NULL",
});

module.exports = {
  sequelize,
  Store,
  Account,
  User,
  Alert,
  Inventory,
  NotificationLog,
  AlertClick,
  Purchase,
  PushSubscription,
  PendingNotification,
  StockxImageCache,
};
