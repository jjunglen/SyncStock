import { useEffect, useState } from "react";
import api from "./api.js";

// The current store's public info (GET /store): name, logo, brand color,
// categories shown. Fetched once per page load and shared, since the
// header, navbar and branding all need it.
let request = null;

export const getStoreInfo = () => {
  if (!request) {
    request = api
      .get("/store")
      .then((res) => res.data.data)
      .catch((err) => {
        request = null; // let the next caller try again
        throw err;
      });
  }
  return request;
};

export function useStoreInfo() {
  const [info, setInfo] = useState(null);
  useEffect(() => {
    let active = true;
    getStoreInfo()
      .then((data) => active && setInfo(data))
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);
  return info;
}

// The merchant's brand color becomes the shopper site's main color
// (buttons) and accent (highlights like the "Brand New" badge) in both
// light and dark mode, with black or white text picked by the server
// for contrast.
export const applyBranding = (info) => {
  const root = document.documentElement.style;
  if (info?.brand_color) {
    root.setProperty("--color-primary", info.brand_color);
    root.setProperty("--color-primary-text", info.brand_text_color || "#ffffff");
    root.setProperty("--color-accent", info.brand_color);
    root.setProperty("--color-accent-text", info.brand_text_color || "#ffffff");
  } else {
    for (const name of ["--color-primary", "--color-primary-text", "--color-accent", "--color-accent-text"]) {
      root.removeProperty(name);
    }
  }
};
