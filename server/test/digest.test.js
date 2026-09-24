const test = require("node:test");
const assert = require("node:assert/strict");
const { stubModule } = require("./helpers.js");

let pending = [];
const markedSent = [];
const emailed = [];
stubModule("src/models/index.js", {
  PendingNotification: {
    findAll: async () => pending,
    update: async (vals, { where }) => markedSent.push(...where.id[Object.getOwnPropertySymbols(where.id)[0]]),
  },
  Store: { findByPk: async (id) => ({ id, sms_enabled: false }) },
  User: { findByPk: async (id) => ({ id, account_id: `acc-${id}` }) },
  Account: { findByPk: async (id) => ({ id, email: `${id}@x.io` }) },
});
stubModule("src/services/email.service.js", {
  sendDigestEmail: async ({ account }) => {
    if (account.id === "acc-u1") throw new Error("Resend 500");
    emailed.push(account.id);
  },
});
stubModule("src/services/sms.service.js", { sendDigestText: async () => {} });
const { flushPendingNotifications } = require("../src/services/digest.service.js");

test("one failing digest email does not stop other users' digests", async () => {
  pending = [
    { id: 1, store_id: "s1", user_id: "u1" },
    { id: 2, store_id: "s1", user_id: "u2" },
  ];
  await flushPendingNotifications().catch(() => {});
  assert.deepEqual(markedSent, [1, 2]); // both marked sent up front...
  assert.deepEqual(emailed, ["acc-u2"], "u2 was marked sent but never emailed");
});
