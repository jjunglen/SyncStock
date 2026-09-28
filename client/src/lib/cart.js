import { useSyncExternalStore } from "react";
import { getSubdomain } from "./getSubdomain.js";

// The shopper's Syncstock cart: items they want to check out together.
// Kept in this browser per store; at checkout the server rechecks stock
// and hands everything to Shopify as one cart (redirect.controller.js).
export const MAX_CART_ITEMS = 10;

const storageKey = () => `syncstock_cart:${getSubdomain() || "local"}`;
const listeners = new Set();

const read = () => {
  try {
    const parsed = JSON.parse(localStorage.getItem(storageKey()) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

// useSyncExternalStore needs the same array back until something changes
let snapshot = read();

const write = (items) => {
  snapshot = items;
  try {
    localStorage.setItem(storageKey(), JSON.stringify(items));
  } catch {
    // Storage blocked — the cart still works until the page reloads
  }
  listeners.forEach((listener) => listener());
};

const subscribe = (listener) => {
  listeners.add(listener);
  // Another tab changed the cart
  const onStorage = (e) => {
    if (e.key !== storageKey()) return;
    snapshot = read();
    listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
};

// Just what the cart panel shows; the server looks up the rest by id
const toCartItem = (item) => ({
  id: item.id,
  product_name: item.product_name,
  size: item.size || null,
  price: item.price,
  image_url: item.image_urls?.[0] || item.image_url || null,
});

export const addToCart = (item) => {
  if (snapshot.some((i) => i.id === item.id) || snapshot.length >= MAX_CART_ITEMS) return false;
  write([...snapshot, toCartItem(item)]);
  return true;
};

export const removeFromCart = (ids) => {
  const drop = new Set([].concat(ids));
  write(snapshot.filter((i) => !drop.has(i.id)));
};

export const clearCart = () => write([]);

export function useCart() {
  return useSyncExternalStore(subscribe, () => snapshot);
}
