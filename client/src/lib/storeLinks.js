import { useEffect, useState } from "react";
import api from "./api.js";
import { getSubdomain } from "./getSubdomain.js";

// Addresses on a store's shopper site, so every page links to the same
// (canonical) address search engines index — never a duplicate.

// The store's home page: "/" on <store>.syncstock.io (its canonical
// address). Locally there's no subdomain and "/" is Syncstock's own
// home, so the dev store's home is "/store".
export const storeHomePath = () => (getSubdomain() ? "/" : "/store");

// The categories with something listed, in Browse's order
// (GET /inventory/categories). The first one is what plain /browse shows.
// Fetched once per page load and shared.
let request = null;
export const getStoreCategories = () => {
  if (!request) {
    request = api
      .get("/inventory/categories")
      .then((res) => res.data.data || [])
      .catch((err) => {
        request = null;
        throw err;
      });
  }
  return request;
};

export function useStoreCategories() {
  const [categories, setCategories] = useState(null);
  useEffect(() => {
    let active = true;
    getStoreCategories()
      .then((data) => active && setCategories(data))
      .catch(() => active && setCategories([]));
    return () => {
      active = false;
    };
  }, []);
  return categories;
}

// A category's Browse page. The first category is plain /browse (that's
// what /browse shows), so it isn't listed under two addresses.
export const categoryPath = (key, categories) =>
  !key || key === categories?.[0]?.key ? "/browse" : `/browse?category=${encodeURIComponent(key)}`;
