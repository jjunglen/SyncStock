const { shopifyGraphql } = require("../utils/shopifyGraphql.js");

// SyncStock as a Shopify sales channel (public app only). The store's
// "channel connection" lives in Shopify: it links the store to its
// SyncStock account (the shopper site) through the channel specification
// in shopify-app/extensions/channel-config. Merchants connect and
// disconnect it themselves on the channel page (App Store 5.7.12).
// https://shopify.dev/docs/apps/build/sales-channels/channel-connections

const SPECIFICATION = "syncstock-us";
// Permissions the channel needs: read_product_listings to create the
// connection and read what's published to it; the unauthenticated one
// so checkout links can carry SyncStock's storefront token (sales
// credit); write_resource_feedbacks to tell merchants in Shopify why a
// product can't show (productFeedback). Also in store.controller.js
// (appScopes) and shopify-app/shopify.app.public.toml.
const CHANNEL_SCOPES = ["read_product_listings", "unauthenticated_read_product_listings", "write_resource_feedbacks"];

// Stores on the public app are sales-channel stores: what shoppers see is
// what the merchant published to SyncStock. The Lab (custom app) isn't.
const isChannelStore = (store) => store?.shopify_app === "public";

// Added to every shopper-facing inventory query: sales-channel stores show
// only what's published to SyncStock; the Lab shows everything as before
// (its in-store-only items included)
const shopperVisible = (store) => (isChannelStore(store) ? { published: true } : {});

// The app's handle (for "published to SyncStock" product searches) and
// the permissions the merchant has granted
const appInstallation = async (store) => {
  const data = await shopifyGraphql(store, `{ currentAppInstallation { app { handle } accessScopes { handle } } }`);
  const inst = data.currentAppInstallation;
  return { appHandle: inst.app.handle, scopes: inst.accessScopes.map((s) => s.handle) };
};

const hasChannelScope = (scopes) => CHANNEL_SCOPES.every((scope) => scopes.includes(scope));

// This store's SyncStock connection, or null when disconnected
const getConnection = async (store) => {
  const data = await shopifyGraphql(
    store,
    `{ channels(first: 10) { nodes { id handle accountId accountName specificationHandle } } }`,
  );
  return data.channels.nodes.find((c) => c.specificationHandle === SPECIFICATION) || null;
};

const userError = (errors) => {
  if (!errors?.length) return null;
  const err = new Error(errors.map((e) => e.message).join("; "));
  err.userFacing = true;
  return err;
};

// Connects the store (its SyncStock account is the store itself). Safe to
// repeat: an existing connection is returned as is.
const connect = async (store) => {
  const existing = await getConnection(store);
  if (existing) return existing;
  const data = await shopifyGraphql(
    store,
    `mutation ($input: ChannelCreateInput!) {
      channelCreate(input: $input) { channel { id handle accountId accountName specificationHandle } userErrors { field message } }
    }`,
    {
      input: {
        specificationHandle: SPECIFICATION,
        accountId: store.id,
        accountName: `${store.name} (${store.subdomain}.syncstock.io)`,
      },
    },
  );
  const err = userError(data.channelCreate.userErrors);
  if (err) throw err;
  return data.channelCreate.channel;
};

const disconnect = async (store) => {
  const existing = await getConnection(store);
  if (!existing) return null;
  const data = await shopifyGraphql(
    store,
    `mutation ($id: ID!) { channelDelete(id: $id) { deletedId userErrors { field message } } }`,
    { id: existing.id },
  );
  const err = userError(data.channelDelete.userErrors);
  if (err) throw err;
  return data.channelDelete.deletedId;
};

// The publishing section: how many products are published to SyncStock,
// out of how many, and published ones SyncStock can't show (no photo).
const PROBLEM_SAMPLE = 50;
const publishing = async (store, appHandle) => {
  const published = `published_status:${appHandle}-published`;
  const data = await shopifyGraphql(
    store,
    `query ($published: String!, $first: Int!) {
      published: productsCount(query: $published) { count }
      total: productsCount { count }
      sample: products(first: $first, query: $published, sortKey: UPDATED_AT, reverse: true) {
        nodes { id legacyResourceId title featuredMedia { id } }
      }
    }`,
    { published, first: PROBLEM_SAMPLE },
  );
  return {
    published_count: data.published.count,
    total_count: data.total.count,
    no_photo: data.sample.nodes
      .filter((p) => !p.featuredMedia)
      .map((p) => ({ id: p.legacyResourceId, title: p.title })),
    // For the bulk editor link (up to 50 published products)
    sample_ids: data.sample.nodes.map((p) => p.legacyResourceId),
    // Shopify's products list, filtered to what's published to SyncStock
    // (bulk editing is available from there)
    products_filter: published,
  };
};

// Every product published to SyncStock, as Shopify product IDs (strings)
// — the catalog sync uses it to mark what shoppers may see
const publishedProductIds = async (store) => {
  const { appHandle } = await appInstallation(store);
  const ids = new Set();
  let cursor = null;
  for (let page = 0; page < 400; page++) {
    const data = await shopifyGraphql(
      store,
      `query ($q: String!, $cursor: String) {
        products(first: 250, after: $cursor, query: $q) { pageInfo { hasNextPage endCursor } nodes { legacyResourceId } }
      }`,
      { q: `published_status:${appHandle}-published`, cursor },
    );
    for (const p of data.products.nodes) ids.add(String(p.legacyResourceId));
    if (!data.products.pageInfo.hasNextPage) return ids;
    cursor = data.products.pageInfo.endCursor;
  }
  throw new Error("Too many published products to list");
};

// SyncStock's storefront access token for this store: checkout links
// carry it (access_token=…), so Shopify credits the order to the SyncStock
// channel (App Store 5.7.16). One token per store, reused — found on
// Shopify by its title, created the first time. Kept in memory after.
const TOKEN_TITLE = "SyncStock checkout";
const storefrontTokens = new Map();
const storefrontToken = async (store) => {
  if (storefrontTokens.has(store.id)) return storefrontTokens.get(store.id);
  const data = await shopifyGraphql(store, `{ shop { storefrontAccessTokens(first: 50) { nodes { accessToken title } } } }`);
  let token = data.shop.storefrontAccessTokens.nodes.find((t) => t.title === TOKEN_TITLE)?.accessToken;
  if (!token) {
    const created = await shopifyGraphql(
      store,
      `mutation ($input: StorefrontAccessTokenInput!) {
        storefrontAccessTokenCreate(input: $input) { storefrontAccessToken { accessToken } userErrors { message } }
      }`,
      { input: { title: TOKEN_TITLE } },
    );
    const err = userError(created.storefrontAccessTokenCreate.userErrors);
    if (err) throw err;
    token = created.storefrontAccessTokenCreate.storefrontAccessToken.accessToken;
  }
  storefrontTokens.set(store.id, token);
  return token;
};

// The cart-link addition that credits the sale to SyncStock, or "" (the
// Lab, or Shopify not answering — the link still works, just without
// the channel credit)
const salesCreditParam = async (store) => {
  if (!isChannelStore(store)) return "";
  try {
    return `&access_token=${encodeURIComponent(await storefrontToken(store))}`;
  } catch (error) {
    console.error(`No storefront token for ${store.shopify_domain}:`, error.message);
    return "";
  }
};

// Product feedback (App Store 5.7.3): for a product published to SyncStock,
// tells Shopify whether SyncStock can show it. Shopify shows "needs
// action" and the reason on the product in the merchant's admin.
// product: webhook shape ({ id, updated_at, images, gift_card }).
const feedbackFor = (product) => {
  const messages = [];
  if (product.gift_card) messages.push("Gift cards can't be listed on SyncStock.");
  if (!product.images?.[0]?.src) messages.push("Add a product photo: SyncStock only shows products that have one.");
  return messages.length ? { state: "REQUIRES_ACTION", messages } : { state: "ACCEPTED", messages: [] };
};
const sendProductFeedback = async (store, product) => {
  if (!isChannelStore(store) || !product?.id) return null;
  const { state, messages } = feedbackFor(product);
  const now = new Date().toISOString();
  try {
    const data = await shopifyGraphql(
      store,
      `mutation ($feedbackInput: [ProductResourceFeedbackInput!]!) {
        bulkProductResourceFeedbackCreate(feedbackInput: $feedbackInput) { userErrors { message } }
      }`,
      {
        feedbackInput: [
          {
            productId: `gid://shopify/Product/${product.id}`,
            state,
            messages,
            feedbackGeneratedAt: now,
            productUpdatedAt: product.updated_at || now,
          },
        ],
      },
    );
    const errors = data.bulkProductResourceFeedbackCreate.userErrors;
    if (errors.length) throw new Error(errors.map((e) => e.message).join("; "));
    return state;
  } catch (error) {
    console.error(`Product feedback failed for ${product.id} on ${store.shopify_domain}:`, error.message);
    return null;
  }
};

module.exports = {
  feedbackFor,
  sendProductFeedback,
  SPECIFICATION,
  CHANNEL_SCOPES,
  isChannelStore,
  shopperVisible,
  publishedProductIds,
  storefrontToken,
  salesCreditParam,
  appInstallation,
  hasChannelScope,
  getConnection,
  connect,
  disconnect,
  publishing,
};
