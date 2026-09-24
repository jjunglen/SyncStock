const test = require("node:test");
const assert = require("node:assert/strict");
const v = require("../src/utils/validate.js");
const { parseVariantTitle } = require("../src/utils/parseVariantTitle.js");

test("isValidEmail", () => {
  assert.ok(v.isValidEmail("a@b.co"));
  assert.ok(!v.isValidEmail("a@b"));
  assert.ok(!v.isValidEmail("a b@c.com"));
  assert.ok(!v.isValidEmail(""));
});

test("isValidPassword requires 8+ chars, a number and a symbol", () => {
  assert.ok(v.isValidPassword("abcdef1!"));
  assert.ok(!v.isValidPassword("abcdefg1"));
  assert.ok(!v.isValidPassword("abcdefg!"));
  assert.ok(!v.isValidPassword("ab1!"));
  assert.ok(!v.isValidPassword(12345678));
});

test("isValidPrice", () => {
  assert.ok(v.isValidPrice(0));
  assert.ok(v.isValidPrice("19.99"));
  assert.ok(v.isValidPrice(null));
  assert.ok(!v.isValidPrice(-1));
  assert.ok(!v.isValidPrice("abc"));
});

test("isValidPrice rejects empty string", () => {
  // Number("") === 0, so "" currently slips through as a valid price
  assert.equal(v.isValidPrice(""), false);
});

test("requireFields reports missing / empty fields", () => {
  assert.deepEqual(v.requireFields({ a: 1, b: "", c: null, e: 0 }, ["a", "b", "c", "d", "e"]), ["b", "c", "d"]);
});

test("enum validators", () => {
  assert.ok(v.isValidCondition("either"));
  assert.ok(!v.isValidCondition("used"));
  assert.ok(v.isValidBoxPreference("any"));
  assert.ok(v.isValidCardCondition("NM"));
  assert.ok(v.isValidGradingCompany("PSA"));
  assert.ok(!v.isValidGradingCompany("psa"));
});

test("parseVariantTitle splits size / condition / box", () => {
  assert.deepEqual(parseVariantTitle("10M/11.5W - Brand New - No Box"), {
    size: "10M/11.5W", condition: "brand_new", boxCondition: "No Box",
  });
  assert.deepEqual(parseVariantTitle("9M/10.5W"), {
    size: "9M/10.5W", condition: "either", boxCondition: "Original Box (Good)",
  });
  assert.equal(parseVariantTitle("9M/10.5W", "pre-owned-jordan-1").condition, "pre_owned");
  assert.equal(parseVariantTitle("4Y - Pre-Owned").size, "4M/5.5W");
});

test("every size parseVariantTitle can emit is accepted by isValidSize", () => {
  for (const youth of ["3.5Y", "4Y", "4.5Y", "5Y", "5.5Y", "6Y", "6.5Y", "7Y"]) {
    const { size } = parseVariantTitle(youth);
    assert.ok(v.isValidSize(size), `${youth} -> ${size} is not in isValidSize's list`);
  }
});
