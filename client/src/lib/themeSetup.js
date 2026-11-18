import { useState } from "react";
import api from "./api.js";
import useLiveRefresh from "./useLiveRefresh.js";
import { IN_SHOPIFY_ADMIN, shopifyIdToken, openInWholeWindow } from "./shopifyAdmin.js";

// Whether SyncStock's floating button and section are on the store's live
// Shopify theme (GET /store/theme-setup, server/src/services/themeSetup.service.js).
// Checked again when the merchant comes back to the tab — e.g. from the
// theme editor after clicking Save — and every few minutes.
// data: { status, links } or null while loading / if it failed.
//   status: null (never checked) | { access: false }
//         | { access: true, theme_name, button_on, sections, banner_on_home }
export function useThemeSetup() {
  const [data, setData] = useState(null);
  useLiveRefresh(() => {
    api
      .get("/store/theme-setup")
      .then((res) => setData(res.data.data))
      .catch(() => {});
  }, 5 * 60 * 1000);
  return data;
}

// Shopify's approval screen for read-only theme access, in the whole
// window. Inside the Shopify admin, Shopify's session token says which
// store; on the website, the merchant's login does.
export const allowThemeAccess = async () => {
  if (IN_SHOPIFY_ADMIN) {
    const token = await shopifyIdToken();
    if (token) openInWholeWindow(`${api.defaults.baseURL}/store/shopify/reauthorize?id_token=${encodeURIComponent(token)}`);
    return;
  }
  window.location.href = `${api.defaults.baseURL}/store/shopify/allow-themes`;
};

// Theme editor links open in a new tab (the merchant clicks Save there,
// then comes back and the status updates)
export const openThemeEditor = (href) => window.open(href, "_blank", "noopener,noreferrer");
