const test = require("node:test");
const assert = require("node:assert/strict");
const { stubModule } = require("./helpers.js");

let existingPending = null;
let pendingWhere;
const created = [];
stubModule("src/models/index.js", {
  PendingNotification: {
    findOne: async ({ where }) => ((pendingWhere = where), existingPending),
    create: async (row) => created.push(["pending", row]),
  },
  NotificationLog: {
    findOne: async () => null,
    create: async (row) => created.push(["log", row]),
  },
});
stubModule("src/services/push.service.js", { sendPushNotification: async () => {} });
stubModule("src/services/digest.service.js", { scheduleQuickFlush: () => {} });
const { sendNotification } = require("../src/services/notification.service.js");

const args = {
  store: { id: "s1", subdomain: "kicks" },
  alert: { id: "al1", user_id: "u1", notify_inapp: true, notify_email: true },
  inventory: { id: "i1", product_name: "Jordan 1", size: "10M/11.5W", price: 200 },
};

test("queues in-app + email notifications for a fresh match", async () => {
  existingPending = null;
  assert.equal(await sendNotification(args), true);
  assert.deepEqual(created.map((c) => c[0]), ["log", "pending"]);
});

test("a restock weeks later still notifies (dedup must be time-bounded)", async () => {
  // A PendingNotification row that was already sent a month ago
  existingPending = { id: 9, sent: true, created_at: new Date(Date.now() - 30 * 864e5) };
  const result = await sendNotification(args);
  const keys = [...Object.keys(pendingWhere), ...Object.getOwnPropertySymbols(pendingWhere)];
  assert.ok(
    result === true || keys.some((k) => ["created_at", "sent"].includes(k)),
    `dedup query has no time/sent filter: ${JSON.stringify(pendingWhere)} — user is never re-notified for this item`,
  );
});
