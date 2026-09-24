const test = require("node:test");
const assert = require("node:assert/strict");
const { stubModule } = require("./helpers.js");

let pending = [];
const updates = [];
const emailed = [];
stubModule("src/models/index.js", {
  PendingNotification: {
    findAll: async () => pending,
    update: async ({ sent }, { where }) =>
      updates.push([sent, where.id[Object.getOwnPropertySymbols(where.id)[0]]]),
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

test("one failing digest email does not stop other users' digests, and is requeued", async () => {
  const origError = console.error;
  console.error = () => {};
  pending = [
    { id: 1, store_id: "s1", user_id: "u1" },
    { id: 2, store_id: "s1", user_id: "u2" },
  ];
  await flushPendingNotifications();
  console.error = origError;

  assert.deepEqual(emailed, ["acc-u2"]);
  assert.deepEqual(updates, [
    [true, [1, 2]], // claimed up front
    [false, [1]], // u1's failed item goes back in the queue
  ]);
});
