import axios from "axios";
import { getSubdomain } from "./getSubdomain";
import { IN_SHOPIFY_ADMIN, shopifyIdToken } from "./shopifyAdmin.js";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api",
  withCredentials: true,
  headers: {
    "ngrok-skip-browser-warning": "true",
  },
});

api.interceptors.request.use(async (config) => {
  // Inside the Shopify admin, Shopify's session token is the login
  if (IN_SHOPIFY_ADMIN) {
    const token = await shopifyIdToken();
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }

  // Guarded: inside the Shopify admin's frame a browser may block storage
  // (App Store 1.1.1) — that must never stop every request
  let onboardingToken = null;
  try {
    onboardingToken = sessionStorage.getItem("onboarding_token");
  } catch {
    // storage blocked: no setup link to send
  }
  if (onboardingToken) {
    config.headers["X-Onboarding-Token"] = onboardingToken;
  }

  const subdomain = getSubdomain();
  if (subdomain) {
    config.headers["X-Store-Subdomain"] = subdomain;
  }

  if (import.meta.env.DEV) {
    const devStore = import.meta.env.VITE_DEV_STORE;
    if (devStore) {
      config.headers["X-Dev-Store"] = devStore;
    }
  }

  return config;
});

export default api;
