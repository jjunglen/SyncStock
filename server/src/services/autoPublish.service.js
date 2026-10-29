const { shopifyGraphql } = require("../utils/shopifyGraphql.js");
const channel = require("./channel.service.js");

// Automatic publishing (sales-channel stores, opt-in on the channel page).
// Stores that list through tools like Copyt never tick "SyncStock" on new
// products themselves, so SyncStock can do it for them:
//   off          — the merchant picks what's published (default)
//   online_store — publish what's live on the Online Store, unpublish what
//                  comes off it (the store's website and SyncStock match)
//   all_active   — publish every active product, in-store-only items too
// SyncStock only publishes to / unpublishes from its OWN channel. Shopify
// then sends product_listings webhooks, which show or hide the item for
// shoppers and send alerts (webhook.controller.js).
// Needs read_publications + write_publications, asked for only when the
// merchant turns this on (PUBLISHING_SCOPES — never at install).

const MODES = ["off", "online_store", "all_active"];
const PUBLISHING_SCOPES = ["read_publications", "write_publications"];

// The setting lives on Shopify, on SyncStock's own app installation
// (app-owned metafield — no extra permission, no database column)
const NAMESPACE = "syncstock";
const KEY = "auto_publish";
const CACHE_MS = 5 * 60 * 1000;
const modeCache = new Map(); // store id → { mode, at }

const getMode = async (store) => {
  if (!channel.isChannelStore(store)) return "off";
  const hit = modeCache.get(store.id);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.mode;
  const data = await shopifyGraphql(
    store,
    `{ currentAppInstallation { metafield(namespace: "${NAMESPACE}", key: "${KEY}") { value } } }`,
  );
  const value = data.currentAppInstallation.metafield?.value;
  const mode = MODES.includes(value) ? value : "off";
  modeCache.set(store.id, { mode, at: Date.now() });
  return mode;
};

const setMode = async (store, mode) => {
  if (!MODES.includes(mode)) throw Object.assign(new Error("Unknown setting"), { userFacing: true });
  const inst = await shopifyGraphql(store, `{ currentAppInstallation { id } }`);
  const data = await shopifyGraphql(
    store,
    `mutation ($metafields: [MetafieldsSetInput!]!) { metafieldsSet(metafields: $metafields) { userErrors { message } } }`,
    {
      metafields: [
        { ownerId: inst.currentAppInstallation.id, namespace: NAMESPACE, key: KEY, type: "single_line_text_field", value: mode },
      ],
    },
  );
  const errors = data.metafieldsSet.userErrors;
  if (errors.length) throw Object.assign(new Error(errors.map((e) => e.message).join("; ")), { userFacing: true });
  modeCache.set(store.id, { mode, at: Date.now() });
  return mode;
};

const hasPublishingScopes = (scopes) => PUBLISHING_SCOPES.every((s) => scopes.includes(s));

// Should SyncStock carry this product? product: { status, published_at }
// in the webhook shape ("active", or ACTIVE from GraphQL)
const wanted = (mode, product) => {
  const active = String(product.status || "").toLowerCase() === "active";
  if (mode === "all_active") return active;
  if (mode === "online_store") return active && !!product.published_at;
  return null; // off: the merchant decides
};

// SyncStock's own publication: the one whose channel is our connection
const publicationIds = new Map();
const ownPublicationId = async (store) => {
  if (publicationIds.has(store.id)) return publicationIds.get(store.id);
  const data = await shopifyGraphql(
    store,
    `{ publications(first: 50) { nodes { id channels(first: 5) { nodes { specificationHandle } } } } }`,
  );
  const own = data.publications.nodes.find((p) =>
    (p.channels?.nodes || []).some((c) => c.specificationHandle === channel.SPECIFICATION),
  );
  if (!own) throw new Error("SyncStock's channel isn't connected");
  publicationIds.set(store.id, own.id);
  return own.id;
};

const productGid = (id) => `gid://shopify/Product/${id}`;

const setPublished = async (store, productId, publish) => {
  const publicationId = await ownPublicationId(store);
  const field = publish ? "publishablePublish" : "publishableUnpublish";
  const data = await shopifyGraphql(
    store,
    `mutation ($id: ID!, $input: [PublicationInput!]!) { ${field}(id: $id, input: $input) { userErrors { message } } }`,
    { id: productGid(productId), input: [{ publicationId }] },
  );
  const errors = data[field].userErrors;
  if (errors.length) throw new Error(errors.map((e) => e.message).join("; "));
};

// One product changed (product webhook): publish or unpublish it to match
// the setting. isPublished: whether it's published to SyncStock now.
const applyToProduct = async (store, product, isPublished) => {
  if (!channel.isChannelStore(store)) return null;
  try {
    const mode = await getMode(store);
    const want = wanted(mode, product);
    if (want === null || want === isPublished) return null;
    await setPublished(store, product.id, want);
    return want ? "published" : "unpublished";
  } catch (error) {
    console.error(`Auto-publish failed for product ${product.id} on ${store.shopify_domain}:`, error.message);
    return null;
  }
};

// The whole catalog (turning the setting on, and nightly): every product
// brought in line with the setting. Returns counts.
const reconcileStore = async (store) => {
  const mode = await getMode(store);
  if (mode === "off") return { published: 0, unpublished: 0, mode };
  const published = await channel.publishedProductIds(store);
  let done = { published: 0, unpublished: 0, mode };
  let cursor = null;
  for (let page = 0; page < 400; page++) {
    const data = await shopifyGraphql(
      store,
      `query ($cursor: String) {
        products(first: 250, after: $cursor) { pageInfo { hasNextPage endCursor } nodes { legacyResourceId status publishedAt isGiftCard } }
      }`,
      { cursor },
    );
    for (const p of data.products.nodes) {
      if (p.isGiftCard) continue;
      const id = String(p.legacyResourceId);
      const want = wanted(mode, { status: p.status, published_at: p.publishedAt });
      const isPublished = published.has(id);
      if (want === isPublished) continue;
      try {
        await setPublished(store, id, want);
        done = { ...done, [want ? "published" : "unpublished"]: done[want ? "published" : "unpublished"] + 1 };
      } catch (error) {
        console.error(`Auto-publish failed for product ${id} on ${store.shopify_domain}:`, error.message);
      }
    }
    if (!data.products.pageInfo.hasNextPage) break;
    cursor = data.products.pageInfo.endCursor;
  }
  return done;
};

module.exports = {
  MODES,
  PUBLISHING_SCOPES,
  getMode,
  setMode,
  hasPublishingScopes,
  wanted,
  applyToProduct,
  reconcileStore,
};
