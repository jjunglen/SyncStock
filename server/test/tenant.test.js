const test = require("node:test");
const assert = require("node:assert/strict");
const { stubModule, mockRes } = require("./helpers.js");

const Store = { findOne: async () => null, findByPk: async () => null };
const User = { findOne: async () => null };
stubModule("src/models/index.js", { Store, User, Account: {} });
const tenant = require("../src/middleware/tenant.middleware.js");

const req = (over = {}) => ({ headers: {}, query: {}, cookies: {}, hostname: "localhost", ...over });

test("resolves store from subdomain on a *.syncstock.io host", async () => {
  let where;
  Store.findOne = async (q) => ((where = q.where), { id: "s1", status: "active" });
  const r = req({ hostname: "kicks.syncstock.io" });
  let nextCalled = false;
  await tenant.resolveStoreFromSubdomain(r, mockRes(), () => (nextCalled = true));
  assert.deepEqual(where, { subdomain: "kicks" });
  assert.ok(nextCalled);
  assert.equal(r.store.id, "s1");
});

test("inactive store is rejected with 404", async () => {
  Store.findOne = async () => ({ id: "s1", status: "pending" });
  const res = mockRes();
  await tenant.resolveStoreFromSubdomain(req({ hostname: "kicks.syncstock.io" }), res, () => assert.fail());
  assert.equal(res.statusCode, 404);
});

test("the bare www host is not treated as a store subdomain", async () => {
  let looked = null;
  Store.findOne = async (q) => ((looked = q.where.subdomain), null);
  process.env.NODE_ENV = "production";
  const res = mockRes();
  await tenant.resolveStoreFromSubdomain(req({ hostname: "www.syncstock.io" }), res, () => {});
  process.env.NODE_ENV = "test";
  assert.equal(looked, null, `looked up store with subdomain "${looked}"`);
  assert.equal(res.statusCode, 400);
});

test("resolveStoreFromAdminMembership returns an error response when the DB throws", async () => {
  User.findOne = async () => { throw new Error("db down"); };
  const res = mockRes();
  // Express 4 does not catch rejected promises from async middleware:
  // if this rejects, the request hangs and Node logs an unhandled rejection.
  await assert.doesNotReject(() =>
    tenant.resolveStoreFromAdminMembership(req({ account: { id: "a1" } }), res, () => {}),
  );
  assert.equal(res.statusCode, 500);
});

test("resolveStoreForOnboarding returns an error response when the DB throws", async () => {
  process.env.JWT_SECRET = "test-secret";
  const { signOnboardingToken } = require("../src/utils/jwt.js");
  Store.findByPk = async () => { throw new Error("db down"); };
  const res = mockRes();
  await assert.doesNotReject(() =>
    tenant.resolveStoreForOnboarding(req({ headers: { "x-onboarding-token": signOnboardingToken("s1") } }), res, () => {}),
  );
  assert.equal(res.statusCode, 500);
});
