const test = require("node:test");
const assert = require("node:assert/strict");
const { stubModule } = require("./helpers.js");

let pendingWhere;
const created = [];
stubModule("src/models/index.js", {
  PendingNotification: {
    findOne: async ({ where }) => ((pendingWhere = where), null),
    create: async (row) => created.push(["pending", row]),
  },
  NotificationLog: {
    findOne: async () => null,
    create: async (row) => created.push(["log", row]),
  },
});
stubModule("src/services/push.service.js", { sendPushNotification: async () => {} });
stubModule("src/services/digest.service.js", { scheduleQuickFlush: () => {} });
const { sendNotification, sendPriceDropNotification } = require("../src/services/notification.service.js");

const args = {
  store: { id: "s1", subdomain: "kicks" },
  alert: { id: "al1", user_id: "u1", notify_inapp: true, notify_email: true },
  inventory: { id: "i1", product_name: "Jordan 1", size: "10M/11.5W", price: 200 },
};

test("queues in-app + email notifications for a fresh match", async () => {
  assert.equal(await sendNotification(args), true);
  assert.deepEqual(created.map((c) => c[0]), ["log", "pending"]);
});

for (const [name, fn] of [["restock", sendNotification], ["price drop", sendPriceDropNotification]]) {
  test(`${name} dedup only looks at recent notifications`, async () => {
    await fn(args);
    assert.ok(pendingWhere.created_at, `no time window: ${JSON.stringify(pendingWhere)}`);
  });
}
