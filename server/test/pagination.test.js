const test = require("node:test");
const assert = require("node:assert/strict");
const { getPagination, buildMeta } = require("../src/utils/pagination.js");

test("getPagination defaults and caps", () => {
  assert.deepEqual(getPagination({}), { page: 1, limit: 20, offset: 0 });
  assert.deepEqual(getPagination({ page: "3", limit: "10" }), { page: 3, limit: 10, offset: 20 });
  assert.deepEqual(getPagination({ page: "-2", limit: "999" }), { page: 1, limit: 50, offset: 0 });
  assert.deepEqual(getPagination({ page: "abc", limit: "-5" }), { page: 1, limit: 20, offset: 0 });
});

test("buildMeta", () => {
  assert.deepEqual(buildMeta(41, 2, 20), { total: 41, page: 2, limit: 20, totalPages: 3 });
  assert.equal(buildMeta(0, 1, 20).totalPages, 0);
});
