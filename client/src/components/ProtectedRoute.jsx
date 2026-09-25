import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import api from "../lib/api.js";
import { getSubdomain } from "../lib/getSubdomain.js";

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
        setStatus("ok");
      })
      .catch(() => {
        const redirectTarget = location.pathname + location.search;
        navigate(`${loginPath}?redirect=${encodeURIComponent(redirectTarget)}`);
        setStatus("unauthorized");
      });
  }, [location.pathname]);

  if (status !== "ok") return null;

  return children;
}
