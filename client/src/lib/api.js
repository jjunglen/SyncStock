import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api",
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  const onboardingToken = sessionStorage.getItem("onboarding_token");
  if (onboardingToken) {
    config.headers["X-Onboarding-Token"] = onboardingToken;
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
