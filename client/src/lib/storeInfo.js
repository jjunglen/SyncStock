import { useEffect, useState } from "react";
import api from "./api.js";
import { brandShades } from "./brandColors.js";

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
// (buttons) and accent (highlights like the "Brand New" badge). Each theme
// gets its own shade so it's always visible (lib/brandColors.js); App.css
// picks the shade for the current theme from these variables.
const BRAND_VARS = [
  "--brand-dark",
  "--brand-dark-text",
  "--brand-light",
  "--brand-light-text",
];

export const applyBranding = (info) => {
  const root = document.documentElement;
  const shades = brandShades(info?.brand_color);
  if (shades) {
    root.style.setProperty("--brand-dark", shades.dark.color);
    root.style.setProperty("--brand-dark-text", shades.dark.text);
    root.style.setProperty("--brand-light", shades.light.color);
    root.style.setProperty("--brand-light-text", shades.light.text);
    root.dataset.brand = "";
  } else {
    for (const name of BRAND_VARS) root.style.removeProperty(name);
    delete root.dataset.brand;
  }
};
