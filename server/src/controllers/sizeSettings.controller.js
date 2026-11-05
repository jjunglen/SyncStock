const { Inventory } = require("../models/index.js");
const { shopifyGraphql, gid } = require("../utils/shopifyGraphql.js");
const { syncCatalog } = require("../services/catalogSync.service.js");
const { otherCategoryName, OTHER_NAME_MAX } = require("../utils/storeSettings.js");
const { otherSizeChart } = require("../services/otherSizeChart.service.js");
const {
  otherSizeSettings,
  classifyOption,
  cleanSizeList,
  MAX_SIZES,
  MAX_SIZE_LENGTH,
  MAX_LABEL_LENGTH,
} = require("../utils/otherSizes.js");

// Size settings page (merchant): the "other" category's name and its size
// chart — which Shopify options are sizes, and the sizes shoppers pick
// from (utils/otherSizes.js).

const MAX_PRODUCTS_READ = 500;
// Shopify's name for a product with no options
const NO_OPTIONS = /^title$/i;

// The options the store's "other" products use in Shopify ("Length",
// "Color"…), with how many products use each and every value — what the
// merchant ticks, and what "Fill from my products" adds
const optionsInUse = async (store) => {
  const rows = await Inventory.findAll({
    where: { store_id: store.id, category: "other" },
    attributes: ["shopify_product_id", "size"],
    group: ["shopify_product_id", "size"],
    raw: true,
  });
  const productIds = [...new Set(rows.map((r) => r.shopify_product_id))].slice(0, MAX_PRODUCTS_READ);
  const options = new Map(); // name → { products, values }
  const add = (name, value) => {
    if (!name || NO_OPTIONS.test(name)) return;
    if (!options.has(name)) options.set(name, { name, products: new Set(), values: [] });
    const o = options.get(name);
    if (value && !o.values.includes(value)) o.values.push(value);
    return o;
  };

  try {
    for (let i = 0; i < productIds.length; i += 100) {
      const ids = productIds.slice(i, i + 100).map((id) => gid("Product", id));
      const data = await shopifyGraphql(
        store,
        `query ($ids: [ID!]!) { nodes(ids: $ids) { ... on Product { legacyResourceId options { name optionValues { name } } } } }`,
        { ids },
      );
      for (const node of data.nodes || []) {
        for (const opt of node?.options || []) {
          const o = add(opt.name);
          if (!o) continue;
          o.products.add(node.legacyResourceId);
          for (const v of opt.optionValues || []) add(opt.name, v.name);
        }
      }
    }
  } catch (error) {
    // Shopify unreachable: offer the sizes SyncStock already has
    console.error(`Size settings: couldn't read options for ${store.shopify_domain}:`, error.message);
    const o = add("Size");
    for (const r of rows) {
      if (!r.size) continue;
      o.products.add(r.shopify_product_id);
      add("Size", r.size);
    }
  }

  return {
    products: productIds.length,
    options: [...options.values()]
      .map((o) => ({
        name: o.name,
        products: o.products.size,
        values: o.values.slice(0, MAX_SIZES),
        // What SyncStock reads it as until the merchant picks: size | color | null
        detected: classifyOption(o.name, o.values),
      }))
      .filter((o) => o.products > 0)
      .sort((a, b) => b.products - a.products),
  };
};

// automatic: no chart saved yet — the sizes shown are built from the
// store's products (otherSizeChart.service.js) until the merchant saves
const settingsFor = async (store) => {
  const s = await otherSizeChart(store);
  return {
    other_category_name: otherCategoryName(store),
    label: s.label,
    sizes: s.sizes,
    automatic: s.automatic,
    option_names: s.option_names,
    limits: { name: OTHER_NAME_MAX, label: MAX_LABEL_LENGTH, sizes: MAX_SIZES, size: MAX_SIZE_LENGTH },
  };
};

// GET /api/store/size-settings (store admin)
const getSizeSettings = async (req, res) => {
  try {
    const inUse = await optionsInUse(req.store);
    return res.status(200).json({ success: true, data: { ...(await settingsFor(req.store)), ...inUse } });
  } catch (error) {
    console.error("Get size settings error:", error.message);
    return res.status(500).json({ success: false, message: "Couldn't load size settings" });
  }
};

// PUT /api/store/size-settings (store admin)
// { other_category_name?, label?, sizes?: [..], option_names?: [..] }
// Changing which options are sizes re-reads the catalog in the background,
// so products pick up their sizes.
const updateSizeSettings = async (req, res) => {
  try {
    const body = req.body || {};
    const current = otherSizeSettings(req.store);
    const next = { ...current };
    const changes = {};

    if (body.other_category_name !== undefined) {
      const name = String(body.other_category_name ?? "").replace(/\s+/g, " ").trim();
      if (name.length > OTHER_NAME_MAX) {
        return res.status(400).json({ success: false, message: `Keep the name to ${OTHER_NAME_MAX} characters` });
      }
      changes.other_category_name = name || null;
    }
    if (body.label !== undefined) {
      const label = String(body.label ?? "").replace(/\s+/g, " ").trim();
      if (label.length > MAX_LABEL_LENGTH) {
        return res.status(400).json({ success: false, message: `Keep the size label to ${MAX_LABEL_LENGTH} characters` });
      }
      next.label = label || null;
    }
    if (body.sizes !== undefined) {
      if (!Array.isArray(body.sizes)) return res.status(400).json({ success: false, message: "Sizes must be a list" });
      next.sizes = cleanSizeList(body.sizes);
    }
    if (body.option_names !== undefined) {
      if (!Array.isArray(body.option_names)) {
        return res.status(400).json({ success: false, message: "Pick which options are sizes" });
      }
      next.option_names = [...new Set(body.option_names.map((n) => String(n ?? "").trim()).filter(Boolean))].slice(0, 10);
    }

    const optionsChanged = JSON.stringify(next.option_names) !== JSON.stringify(current.option_names);
    changes.size_settings = { ...(req.store.size_settings || {}), other: next };
    await req.store.update(changes);

    if (optionsChanged) {
      syncCatalog(req.store)
        .then(({ products }) => console.log(`Size options changed for ${req.store.shopify_domain}: ${products} products re-read`))
        .catch((error) => console.error(`Re-read after size options failed for ${req.store.shopify_domain}:`, error.message));
    }
    return res.status(200).json({ success: true, data: { ...(await settingsFor(req.store)), resyncing: optionsChanged } });
  } catch (error) {
    console.error("Update size settings error:", error.message);
    return res.status(500).json({ success: false, message: "Couldn't save size settings" });
  }
};

module.exports = { getSizeSettings, updateSizeSettings };
