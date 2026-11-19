import { useEffect, useState } from "react";
import api from "./api.js";
import { SIZES_BY_CATEGORY } from "./categories.js";

// One-tap "Track" on any product (store pages, the shopper dashboard and
// a product's page): an alert for this product in the shopper's saved
// sizes for its category, or the size on the card when none of their
// sizes fit it. The server matches the product's own sizes
// (POST /alerts with store_product_id).
//
// Which products are already tracked is shared across the page, so every
// card's button shows "Tracking" after one tap anywhere.

const norm = (name) => String(name || "").replace(/\s+/g, " ").trim().toLowerCase();

let trackedNames = null; // Set of product names, once loaded
let loading = null;
const listeners = new Set();
const publish = () => listeners.forEach((fn) => fn(trackedNames));

// The dashboard already loads the alerts list; it hands it over here
export const setTrackedAlerts = (alerts) => {
  trackedNames = new Set((alerts || []).map((a) => norm(a.product_name)));
  publish();
};

const markTracked = (item) => {
  trackedNames = new Set(trackedNames || []);
  trackedNames.add(norm(item.product_name));
  publish();
};

// Pages showing the alerts list (the dashboard's Your alerts) reload it
// when a bell adds one. Returns the unsubscribe function.
const trackListeners = new Set();
export const onTracked = (fn) => {
  trackListeners.add(fn);
  return () => trackListeners.delete(fn);
};

const loadTracked = () => {
  if (!loading) {
    loading = api
      .get("/alerts")
      .then((res) => setTrackedAlerts(res.data.data.alerts || []))
      .catch(() => {
        loading = null;
      });
  }
  return loading;
};

// isTracked(item) for the cards on screen. Loads the shopper's alerts
// once, only when signed in.
export function useTracked(signedIn) {
  const [names, setNames] = useState(trackedNames);
  useEffect(() => {
    listeners.add(setNames);
    if (signedIn && !trackedNames) loadTracked();
    return () => listeners.delete(setNames);
  }, [signedIn]);
  return (item) => !!names?.has(norm(item.product_name));
}

let mySizes = null;
const getMySizes = () => {
  if (!mySizes) {
    mySizes = api
      .get("/auth/me")
      .then((res) => res.data.data.sizes || [])
      .catch((err) => {
        mySizes = null;
        throw err;
      });
  }
  return mySizes;
};

// options.size: track just this size (the size picked on a product page)
// Resolves { sizes: [...] } (the sizes now tracked; [] for items with no
// size) or { already: true }. Rejects with a message to show.
export async function quickTrack(item, { size } = {}) {
  const category = item.category || "sneakers";
  const chart = SIZES_BY_CATEGORY[category] || [];
  const saved =
    !size && chart.length ? (await getMySizes().catch(() => [])).filter((s) => chart.includes(s)) : [];
  const sizes = size ? [size] : saved.length ? saved : item.size ? [item.size] : [];

  const body = {
    store_product_id: item.shopify_product_id,
    category,
    sizes,
    image_url: item.image_urls?.[0] || item.image_url || null,
    notify_email: true,
    notify_inapp: true,
  };

  const send = async (payload) => {
    try {
      const res = await api.post("/alerts", payload);
      markTracked(item);
      trackListeners.forEach((fn) => fn());
      return { sizes: (res.data.created || []).filter(Boolean) };
    } catch (err) {
      const message = err.response?.data?.message || "";
      if (/already have an active alert/i.test(message)) {
        markTracked(item);
        return { already: true };
      }
      throw Object.assign(new Error(message || "Couldn't track that. Try again."), { serverMessage: message });
    }
  };

  try {
    return await send(body);
  } catch (err) {
    // None of their saved sizes come in this product: the card's own size
    const sizeMismatch = /one of this item's sizes/i.test(err.serverMessage || "");
    if (sizeMismatch && item.size && !(sizes.length === 1 && sizes[0] === item.size)) {
      return send({ ...body, sizes: [item.size] });
    }
    throw err;
  }
}

// Signed out: sign up (or log in), then the dashboard tracks it (?track=)
export const trackSignupPath = (item) =>
  `/store/signup?redirect=${encodeURIComponent(`/store/dashboard?track=${item.id}`)}`;

// "Tracking size 10, 10.5" / "Tracking this item"
export const trackedMessage = (result) =>
  result.already
    ? "You're already tracking this"
    : result.sizes?.length
      ? `Tracking size ${result.sizes.join(", ")}. We'll tell you when it restocks or drops in price.`
      : "Tracking this item. We'll tell you when it restocks or drops in price.";
