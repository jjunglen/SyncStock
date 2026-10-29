import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import api from "../lib/api.js";
import { getSubdomain } from "../lib/getSubdomain.js";
import { IN_SHOPIFY_ADMIN } from "../lib/shopifyAdmin.js";

// loginPath: customer pages pass "/store/login" so shoppers get the
// store's login, not the merchant one.
// requireMerchant: merchant pages — a logged-in shopper is sent to
// their store dashboard instead (the API also refuses them the data)
export default function ProtectedRoute({
  children,
  loginPath = "/login",
  requireMerchant = false,
}) {
  const [status, setStatus] = useState("checking"); // "checking" | "ok" | "unauthorized"
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    api
      .get("/auth/me")
      .then((res) => {
        if (requireMerchant && !res.data.data?.is_merchant) {
          const onStore = getSubdomain() || import.meta.env.DEV;
          navigate(onStore ? "/store/dashboard" : "/", { replace: true });
          return;
        }
        const step = res.data.data?.merchant_onboarding_step;
        if (requireMerchant && step && step !== "complete") {
          navigate("/onboarding/setup", { replace: true });
          return;
        }
        setStatus("ok");
      })
      .catch(() => {
        // Inside the Shopify admin there's no login page: Shopify signs
        // the merchant in, so no account yet means setup isn't finished
        if (IN_SHOPIFY_ADMIN) {
          navigate("/onboarding/setup", { replace: true });
          return;
        }
        const redirectTarget = location.pathname + location.search;
        navigate(`${loginPath}?redirect=${encodeURIComponent(redirectTarget)}`);
        setStatus("unauthorized");
      });
  }, [location.pathname]);

  if (status !== "ok") return null;

  return children;
}
