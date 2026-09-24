const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("crypto");
process.env.ENCRYPTION_KEY = "a".repeat(64);
process.env.JWT_SECRET = "test-secret";
const { encrypt, decrypt } = require("../src/utils/encryption.js");
const jwtUtil = require("../src/utils/jwt.js");
const { verifyShopifyWebhook } = require("../src/middleware/shopify.middleware.js");
const { mockRes } = require("./helpers.js");

test("encrypt/decrypt round trip, random IV", () => {
  const a = encrypt("shpat_secret");
  assert.notEqual(a, encrypt("shpat_secret"));
  assert.equal(decrypt(a), "shpat_secret");
});

test("decrypt rejects tampered ciphertext and bad format", () => {
  const [iv, tag, ct] = encrypt("hello").split(":");
  const flipped = (parseInt(ct[0], 16) ^ 1).toString(16) + ct.slice(1);
  assert.throws(() => decrypt(`${iv}:${tag}:${flipped}`));
  assert.throws(() => decrypt("garbage"), /Invalid encrypted payload/);
});

test("session and onboarding tokens are not interchangeable", () => {
  const session = jwtUtil.signToken({ id: "acc1", email: "x@y.z" });
  assert.equal(jwtUtil.verifyToken(session).id, "acc1");
  assert.deepEqual(jwtUtil.verifyOnboardingToken(session), { valid: false, expired: false });

  const onboarding = jwtUtil.signOnboardingToken("store1");
  assert.deepEqual(jwtUtil.verifyOnboardingToken(onboarding), { valid: true, storeId: "store1" });
  assert.equal(jwtUtil.verifyToken("nope"), null);
});

test("verifyShopifyWebhook accepts a correct HMAC and rejects a wrong one", () => {
  process.env.SHOPIFY_APP_CLIENT_SECRET = "shh";
  const body = Buffer.from('{"id":1}');
  const sig = crypto.createHmac("sha256", "shh").update(body).digest("base64");

  let called = false;
  verifyShopifyWebhook({ store: {}, body, headers: { "x-shopify-hmac-sha256": sig } }, mockRes(), () => (called = true));
  assert.ok(called);

  const res = mockRes();
  verifyShopifyWebhook({ store: {}, body, headers: { "x-shopify-hmac-sha256": "AAAA" } }, res, () => assert.fail());
  assert.equal(res.statusCode, 401);
});
