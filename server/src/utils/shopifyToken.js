const { appCredentials } = require("./shopifyApps.js");

// Shopify's expiring offline tokens. Newer apps only get access tokens
// that last about an hour, plus a refresh token (90 days) that trades for
// a fresh pair — and is itself replaced every time. Everything that calls
// Shopify gets its token from here, so it's renewed as needed.
// Stores with no expiry on file have an older token that never expires
// (The Laboratory on the original app) and use it as is.

// Renew a few minutes early so a token can't expire mid-request
const EARLY_MS = 5 * 60 * 1000;

const expiresAt = (seconds) => (seconds ? new Date(Date.now() + Number(seconds) * 1000) : null);

// Store fields from Shopify's token response (code exchange or refresh)
const tokenFields = (body) => ({
  shopify_access_token: body.access_token,
  shopify_refresh_token: body.refresh_token || null,
  shopify_token_expires_at: expiresAt(body.expires_in),
  shopify_refresh_expires_at: expiresAt(body.refresh_token_expires_in),
});

// One renewal per store at a time — two at once would each spend the
// same refresh token
const inFlight = new Map();

const refresh = async (store) => {
  const { clientId, secret } = appCredentials(store.shopify_app || "custom");
  const resp = await fetch(`https://${store.shopify_domain}/admin/oauth/access_token`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: secret,
      grant_type: "refresh_token",
      refresh_token: store.shopify_refresh_token,
    }),
  });
  const body = await resp.json().catch(() => ({}));
  if (!body.access_token) {
    throw new Error(
      `Shopify token refresh failed for ${store.shopify_domain} (${resp.status} ${body.error || ""}) — the merchant may need to reconnect`,
    );
  }
  await store.update(tokenFields(body));
  return body.access_token;
};

// A working access token for the store
const getAccessToken = async (store) => {
  const expires = store.shopify_token_expires_at;
  if (!expires || new Date(expires).getTime() - EARLY_MS > Date.now()) {
    return store.shopify_access_token;
  }
  if (!store.shopify_refresh_token) {
    throw new Error(`Shopify token expired for ${store.shopify_domain} and there's no refresh token — reconnect the store`);
  }
  if (!inFlight.has(store.id)) {
    inFlight.set(
      store.id,
      refresh(store).finally(() => inFlight.delete(store.id)),
    );
  }
  const token = await inFlight.get(store.id);
  // Another caller's renewal saved the new tokens through a different
  // copy of this store — pick them up so this copy doesn't renew again
  // with a refresh token that's already been replaced
  if (store.shopify_access_token !== token) {
    await store.reload({
      attributes: ["shopify_access_token", "shopify_refresh_token", "shopify_token_expires_at", "shopify_refresh_expires_at"],
    });
  }
  return token;
};

module.exports = { getAccessToken, tokenFields };
