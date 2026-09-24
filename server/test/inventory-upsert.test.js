const test = require("node:test");
const assert = require("node:assert/strict");
const { Sequelize } = require("sequelize");
const { stubModule } = require("./helpers.js");

// Real Sequelize/postgres query generator, but the query is captured
// instead of sent — no database needed.
const sequelize = new Sequelize("postgres://u:p@localhost:1/db", { dialect: "postgres", logging: false });
let sql = "";
sequelize.query = async (q) => ((sql = typeof q === "string" ? q : q.query), [[{}], 1]);
stubModule("src/config/database.js", { sequelize });
const Inventory = require("../src/models/Inventory.js");

test("upserting two sizes of the same product keeps both rows", async () => {
  await Inventory.upsert({
    store_id: "7c0b1c1e-0000-4000-8000-000000000001",
    shopify_product_id: "111",
    shopify_variant_id: "222",
    product_name: "Jordan 1",
    size: "10M/11.5W",
  });
  const conflict = sql.match(/ON CONFLICT \(([^)]+)\)/)?.[1] ?? "";
  // Each variant (size) is its own row, so the conflict target must include
  // the variant id — otherwise size 11 overwrites size 10 of the same product.
  assert.match(conflict, /shopify_variant_id/, `upsert conflicts on (${conflict})`);
});
