import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { fetchMe, isLoggedOut } from "../lib/fetchMe.js";
import { getSubdomain } from "../lib/getSubdomain.js";
import { IN_SHOPIFY_ADMIN } from "../lib/shopifyAdmin.js";
import Button from "./ui/Button.jsx";

// loginPath: customer pages pass "/store/login" so shoppers get the
// store's login, not the merchant one.
// requireMerchant: merchant pages — a logged-in shopper is sent to
// their store dashboard instead (the API also refuses them the data)
export default function ProtectedRoute({
  children,
  loginPath = "/login",
  requireMerchant = false,
}) {
  // "checking" | "ok" | "unauthorized" | "error" (server couldn't answer)
  const [status, setStatus] = useState("checking");
  const [attempt, setAttempt] = useState(0);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    let active = true;
    fetchMe()
      .then((res) => {
        if (!active) return;
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
      .catch((err) => {
        if (!active) return;
        // The server or network failed — the login may be fine, so
        // don't send them to log in again
        if (!isLoggedOut(err)) {
          setStatus("error");
          return;
        }
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
    return () => {
      active = false;
    };
  }, [location.pathname, attempt]);

  if (status === "error") {
    return (
      <div className="min-h-screen bg-bg text-text flex flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="text-sm text-text-muted">We couldn't reach SyncStock just now. You're still logged in.</p>
        <Button
          variant="primary"
          size="sm"
          onClick={() => {
            setStatus("checking");
            setAttempt((n) => n + 1);
          }}
        >
          Try again
        </Button>
      </div>
    );
  }

  if (status !== "ok") return null;

  return children;
}
