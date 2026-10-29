const { shopifyGraphql } = require("../utils/shopifyGraphql.js");

// SyncStock as a Shopify sales channel (public app only). The store's
// "channel connection" lives in Shopify: it links the store to its
// SyncStock account (the shopper site) through the channel specification
// in shopify-app/extensions/channel-config. Merchants connect and
// disconnect it themselves on the channel page (App Store 5.7.12).
// https://shopify.dev/docs/apps/build/sales-channels/channel-connections

const SPECIFICATION = "syncstock-us";
// Needed to create the connection and read what's published to it
const CHANNEL_SCOPE = "read_product_listings";

// The app's handle (for "published to SyncStock" product searches) and
// the permissions the merchant has granted
const appInstallation = async (store) => {
  const data = await shopifyGraphql(store, `{ currentAppInstallation { app { handle } accessScopes { handle } } }`);
  const inst = data.currentAppInstallation;
  return { appHandle: inst.app.handle, scopes: inst.accessScopes.map((s) => s.handle) };
};

const hasChannelScope = (scopes) => scopes.includes(CHANNEL_SCOPE);

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
    // Shopify's products list, filtered to what's published to SyncStock
    // (bulk editing is available from there)
    products_filter: published,
  };
};

module.exports = {
  SPECIFICATION,
  CHANNEL_SCOPE,
  appInstallation,
  hasChannelScope,
  getConnection,
  connect,
  disconnect,
  publishing,
};
