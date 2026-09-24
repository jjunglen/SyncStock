const test = require("node:test");
const assert = require("node:assert/strict");
const { stubModule, mockRes } = require("./helpers.js");

let queried = false;
stubModule("src/models/index.js", {
  Inventory: {
    getAttributes: () => ({ category: { values: ["sneakers", "trading_cards"] } }),
    findAndCountAll: async () => ((queried = true), { count: 0, rows: [] }),
  },
});
const { searchInventory, getInventoryInMySizes } = require("../src/controllers/inventory.controller.js");

test("unknown category is a 400, not a database error", async () => {
  const res = mockRes();
  await searchInventory({ query: { category: "cars" }, store: { id: "s1" } }, res);
  assert.equal(res.statusCode, 400);

  const res2 = mockRes();
  await getInventoryInMySizes({ query: { category: "cars" }, store: { id: "s1" }, account: { sizes: ["9M/10.5W"] } }, res2);
  assert.equal(res2.statusCode, 400);
  assert.equal(queried, false);
});

test("valid category is passed through", async () => {
  const res = mockRes();
  await searchInventory({ query: { category: "sneakers" }, store: { id: "s1" } }, res);
  assert.equal(res.statusCode, 200);
});
