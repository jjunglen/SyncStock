import { useEffect, useState } from "react";
import api from "./api.js";

// The logged-in merchant's own store (GET /store/mine): name, subdomain,
// plan, status. Looked up from their login, since the merchant dashboard
// runs on syncstock.io with no store subdomain in the address. Fetched
// once per page load and shared by the sidebar and settings pages.
let request = null;

export const getMyStore = () => {
  if (!request) {
    request = api
      .get("/store/mine")
      .then((res) => res.data.data)
      .catch((err) => {
        request = null; // let the next caller try again
        throw err;
      });
  }
  return request;
};

// enabled=false skips the request (the landing page's dashboard preview)
export function useMyStore(enabled = true) {
  const [store, setStore] = useState(null);
  useEffect(() => {
    if (!enabled) return undefined;
    let active = true;
    getMyStore()
      .then((data) => active && setStore(data))
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [enabled]);
  return store;
}

// The shopper-facing site for a store
export const storefrontUrl = (subdomain) =>
  window.location.hostname === "localhost"
    ? `${window.location.origin}/store/dashboard`
    : `https://${subdomain}.syncstock.io/store/dashboard`;
