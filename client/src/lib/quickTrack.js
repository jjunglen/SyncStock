import { useEffect, useState } from "react";
import api from "./api.js";
import { SIZES_BY_CATEGORY } from "./categories.js";

// "Track" on any product (store pages, the shopper dashboard and a
// product's page). Items with sizes open a size picker
// (components/store/TrackSizesModal.jsx) and track the sizes picked;
// items with no size are tracked in one tap. Alerts are made with
// POST /alerts and store_product_id, matched by the product's name.
//
// What's tracked (product name → sizes) is shared across the page, so
// every card's bell turns green after tracking it anywhere.

const norm = (name) => String(name || "").replace(/\s+/g, " ").trim().toLowerCase();

let tracked = null; // Map of product name → Set of sizes (null = no size), once loaded
let loading = null;
const listeners = new Set();
const publish = () => listeners.forEach((fn) => fn(tracked));

// The dashboard already loads the alerts list; it hands it over here
export const setTrackedAlerts = (alerts) => {
  tracked = new Map();
  for (const a of alerts || []) {
    const key = norm(a.product_name);
    if (!tracked.has(key)) tracked.set(key, new Set());
    tracked.get(key).add(a.size ?? null);
  }
  publish();
};

const markTracked = (item, sizes) => {
  tracked = new Map(tracked || []);
  const key = norm(item.product_name);
  const set = new Set(tracked.get(key) || []);
  (sizes.length ? sizes : [null]).forEach((s) => set.add(s));
  tracked.set(key, set);
  publish();
};

// Pages showing the alerts list (the dashboard's Your alerts) reload it
// when a bell adds one. Returns the unsubscribe function.
const trackListeners = new Set();
export const onTracked = (fn) => {
  trackListeners.add(fn);
  return () => {
    trackListeners.delete(fn);
  };
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

// The shared map, kept current. Loads the shopper's alerts once, only
// when signed in.
function useTrackedMap(signedIn) {
  const [map, setMap] = useState(tracked);
  useEffect(() => {
    listeners.add(setMap);
    if (signedIn && !tracked) loadTracked();
    return () => {
      listeners.delete(setMap);
    };
  }, [signedIn]);
  return map;
}

// For the cards on screen: isTracked(item)
export function useTracked(signedIn) {
  const map = useTrackedMap(signedIn);
  return (item) => !!map?.has(norm(item.product_name));
}

// The sizes of this item already tracked (a Set; null = no size)
export function useTrackedSizes(item) {
  const map = useTrackedMap(true);
  return map?.get(norm(item.product_name)) || new Set();
}

let mySizes = null;
// The shopper's saved sizes (all categories)
export const getMySizes = () => {
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

// Whether tracking this item means picking sizes
export const hasSizeChoice = (item) =>
  (SIZES_BY_CATEGORY[item.category || "sneakers"] || []).length > 0 || !!item.size;

// Tracks these sizes ([] for an item with no size). Resolves
// { sizes: [...] } (the sizes newly tracked) or { already: true }.
// Rejects with a message to show.
export async function trackSizes(item, sizes) {
  try {
    const res = await api.post("/alerts", {
      store_product_id: item.shopify_product_id,
      category: item.category || "sneakers",
      sizes,
      image_url: item.image_urls?.[0] || item.image_url || null,
      notify_email: true,
      notify_inapp: true,
    });
    const created = (res.data.created || []).filter(Boolean);
    markTracked(item, created.length ? created : sizes);
    trackListeners.forEach((fn) => fn());
    return { sizes: created };
  } catch (err) {
    const message = err.response?.data?.message || "";
    if (/already have an active alert/i.test(message)) {
      markTracked(item, sizes);
      return { already: true };
    }
    throw new Error(message || "Couldn't track that. Try again.", { cause: err });
  }
}

// One tap, no picker: the item's own size (or none)
export const quickTrack = (item) => trackSizes(item, item.size ? [item.size] : []);

// Signed out: sign up (or log in), then the dashboard opens the size
// picker for it (?track=)
export const trackSignupPath = (item) =>
  `/store/signup?redirect=${encodeURIComponent(`/store/dashboard?track=${item.id}`)}`;

// "We'll tell you when size 10, 10.5 is in"
export const trackedMessage = (result) =>
  result.already
    ? "You're already tracking this"
    : result.sizes?.length
      ? `Done. We'll tell you when size ${result.sizes.join(", ")} is in stock or drops in price.`
      : "Done. We'll tell you when it's back or drops in price.";
