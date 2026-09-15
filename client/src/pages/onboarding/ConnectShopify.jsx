import { useState } from "react";
import { LuStore } from "react-icons/lu";
import Button from "../../components/ui/Button.jsx";
import Spinner from "../../components/ui/Spinner.jsx";
import BlackHoleBackground from "../../components/ui/BlackHoleBackground.jsx";
import api from "../../lib/api.js";

export default function ConnectShopify() {
  const [shopDomain, setShopDomain] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    let cleaned = shopDomain.trim().toLowerCase();
    if (cleaned && !cleaned.includes(".")) {
      cleaned = `${cleaned}.myshopify.com`;
    }
    if (!cleaned.endsWith(".myshopify.com")) {
      setError(
        "Enter your Shopify store's domain, e.g. yourstore.myshopify.com",
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await api.post("/store/check-domain", { shop: cleaned });
      const { exists, subdomain } = res.data.data;

      if (exists && subdomain) {
        const protocol =
          window.location.hostname === "localhost" ? "http" : "https";
        const host =
          window.location.hostname === "localhost"
            ? "localhost:5173"
            : `${subdomain}.syncstock.io`;
        window.location.href = `${protocol}://${host}/login`;
        return;
      }

      window.location.href = `${import.meta.env.VITE_API_URL || "http://localhost:5000/api"}/store/shopify/connect?shop=${encodeURIComponent(cleaned)}`;
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Something went wrong. Please try again.",
      );
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg text-text relative overflow-hidden flex items-center justify-center px-4">
      <div className="absolute inset-0 opacity-40 pointer-events-none">
        <BlackHoleBackground />
      </div>

      <div className="relative z-10 w-full max-w-sm space-y-4 rounded-xl border border-border bg-surface p-6">
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-text-muted text-xs">
            <span>Getting started</span>
            <span>Step 1 of 4</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-muted">
            <div
              className="h-full rounded-full bg-primary transition-all duration-300"
              style={{ width: "25%" }}
            />
          </div>
        </div>

        <div className="flex flex-col items-center gap-3 py-6 text-center">
          <div className="flex size-14 items-center justify-center rounded-full bg-primary/10">
            <LuStore size={26} className="text-text" />
          </div>
          <div>
            <p className="font-semibold">
              Log in or connect your Shopify store
            </p>
            <p className="mt-1 text-text-muted text-sm">
              Already connected? We'll take you straight to sign in.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="text"
            value={shopDomain}
            onChange={(e) => setShopDomain(e.target.value)}
            placeholder="yourstore.myshopify.com"
            className="w-full bg-surface-muted border border-border rounded-xl px-4 py-3 text-text placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-white/10"
          />
          {error && <p className="text-danger text-xs">{error}</p>}

          <Button
            type="submit"
            variant="primary"
            fullWidth
            disabled={isSubmitting}
          >
            {isSubmitting ? <Spinner size={18} /> : "Continue"}
          </Button>
        </form>
      </div>
    </div>
  );
}
