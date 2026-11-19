import { getSubdomain } from "./getSubdomain.js";

// On a store's shopper site, "Add to Home Screen" installs the store's
// own app: its name and logo (server controllers/appManifest.controller.js)
// instead of Syncstock's. Android reads the manifest; iPhone reads the
// apple-touch-icon and apple-mobile-web-app-title tags (index.html has
// Syncstock's as the default).
const API = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const setHead = (selector, create, attr, value) => {
  let el = document.head.querySelector(selector);
  if (!el) {
    el = create();
    document.head.appendChild(el);
  }
  if (el.getAttribute(attr) !== value) el.setAttribute(attr, value);
};

export const applyStoreApp = (info) => {
  const subdomain = getSubdomain();
  if (!subdomain || !info?.name) return;

  setHead(
    'link[rel="manifest"]',
    () => Object.assign(document.createElement("link"), { rel: "manifest" }),
    "href",
    `${API}/store/manifest?s=${encodeURIComponent(subdomain)}`,
  );
  setHead(
    'meta[name="apple-mobile-web-app-title"]',
    () => Object.assign(document.createElement("meta"), { name: "apple-mobile-web-app-title" }),
    "content",
    info.name,
  );
  // The logo on a square tile, made by the server
  // (…/store/logo/<id>?v=… → …/store/app-icon/<id>/192.png?v=…)
  const icon = info.logo_url?.replace(/\/store\/logo\/([^/?]+)/, "/store/app-icon/$1/192.png");
  if (icon && icon !== info.logo_url) {
    setHead(
      'link[rel="apple-touch-icon"]',
      () => Object.assign(document.createElement("link"), { rel: "apple-touch-icon" }),
      "href",
      icon,
    );
  }
};
