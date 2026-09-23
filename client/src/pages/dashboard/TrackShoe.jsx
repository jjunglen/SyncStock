import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { LuSearch, LuCircleCheck, LuCircleX } from "react-icons/lu";
import DashboardNavbar from "../../components/layout/DashboardNavbar.jsx";
import Button from "../../components/ui/Button.jsx";
import api from "../../lib/api.js";

const sizeOptions = [
  "3.5M/5W",
  "4M/5.5W",
  "4.5M/6W",
  "5M/6.5W",
  "5.5M/7W",
  "6M/7.5W",
  "6.5M/8W",
  "7M/8.5W",
  "7.5M/9W",
  "8M/9.5W",
  "8.5M/10W",
  "9M/10.5W",
  "9.5M/11W",
  "10M/11.5W",
  "10.5M/12W",
  "11M/12.5W",
  "11.5M/13W",
  "12M/13.5W",
  "12.5M/14W",
  "13M/14.5W",
  "13.5M/15W",
  "14M/15.5W",
  "14.5M/16W",
  "15M",
  "16M",
  "17M",
];

export default function TrackShoe() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [selectedShoe, setSelectedShoe] = useState(null);
  const [searching, setSearching] = useState(false);
  const [size, setSize] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [emailNotif, setEmailNotif] = useState(true);
  const [inAppNotif, setInAppNotif] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [mySizes, setMySizes] = useState([]);

  const navigate = useNavigate();

  useEffect(() => {
    api
      .get("/auth/me")
      .then((res) => setMySizes(res.data.data.sizes || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    const timeout = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await api.get(
          `/stockx/search?q=${encodeURIComponent(query)}`,
        );
        setResults(res.data.data || []);
      } catch (err) {
        console.error("Search failed", err);
      } finally {
        setSearching(false);
      }
    }, 600);
    return () => clearTimeout(timeout);
  }, [query]);

  const handleSubmit = async () => {
    if (!selectedShoe || !size) return;
    setSubmitting(true);
    setError("");
    setSuccess(false);

    try {
      await api.post("/alerts", {
        product_name: selectedShoe.title,
        sku: selectedShoe.styleId,
        size,
        max_price: maxPrice ? parseFloat(maxPrice) : null,
        notify_email: emailNotif,
        notify_inapp: inAppNotif,
        stockx_product_id: selectedShoe.productId,
        stockx_url_key: selectedShoe.urlKey,
      });

      setSuccess(true);
      setSelectedShoe(null);
      setQuery("");
      setSize("");
      setMaxPrice("");
      setResults([]);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Failed to create alert. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg text-text pb-24 lg:pb-0">
      <DashboardNavbar />

      <div className="pt-24 px-4 md:px-10">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-primary/10 flex items-center justify-center rounded-full shrink-0">
            <LuSearch className="text-text" size={18} />
          </div>
          <div>
            <p className="text-base font-medium">Track a new shoe</p>
            <p className="text-xs text-text-muted">
              We'll notify you the moment it hits the store
            </p>
          </div>
        </div>

        {success && (
          <div className="mb-4 bg-live/10 border border-live/30 text-live text-sm rounded-xl px-4 py-3 flex items-center justify-between">
            <span>Alert created! We'll notify you when it drops.</span>
            <button
              onClick={() => navigate("/store/dashboard?tab=alerts")}
              className="underline text-sm ml-4"
            >
              View alerts
            </button>
          </div>
        )}
        {error && (
          <div className="mb-4 bg-danger/10 border border-danger/30 text-danger text-sm rounded-xl px-4 py-3">
            {error}
          </div>
        )}

        <div className="flex flex-col md:flex-row gap-0 max-w-6xl mx-auto pb-10">
          <div className="w-full md:w-1/2 md:pr-8 md:border-r border-border">
            <div className="relative mb-2">
              <LuSearch
                className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted"
                size={16}
              />
              <input
                type="text"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setSelectedShoe(null);
                  setSuccess(false);
                  setError("");
                }}
                placeholder="Search by name or SKU..."
                className="w-full bg-surface-muted border border-border rounded-xl pl-11 pr-10 py-3 text-sm text-text focus:outline-none focus:ring-2 focus:ring-white/10"
              />
              {query && (
                <button
                  onClick={() => {
                    setQuery("");
                    setSelectedShoe(null);
                    setResults([]);
                  }}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-text-muted hover:text-text"
                >
                  <LuCircleX size={16} />
                </button>
              )}
            </div>

            {query && !searching && (
              <p className="text-sm text-text-muted mb-4">
                Tap a shoe to set an alert
              </p>
            )}
            {searching && (
              <p className="text-text-muted text-xs py-4">Searching...</p>
            )}

            {!searching && results.length > 0 && (
              <div className="flex flex-col gap-2">
                {results.map((shoe) => (
                  <div
                    key={shoe.productId}
                    onClick={() => {
                      setSelectedShoe(shoe);
                      setSuccess(false);
                      setError("");
                      if (mySizes.length > 0 && !size) setSize(mySizes[0]);
                    }}
                    className={`flex items-center gap-4 p-3 rounded-xl border cursor-pointer transition-colors ${
                      selectedShoe?.productId === shoe.productId
                        ? "border-primary bg-surface"
                        : "border-border bg-surface hover:border-white/20"
                    }`}
                  >
                    {shoe.image_url ? (
                      <img
                        src={shoe.image_url}
                        alt={shoe.title}
                        className="w-16 h-16 rounded-lg object-contain bg-white shrink-0"
                        onError={(e) => {
                          e.target.style.display = "none";
                        }}
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-lg bg-surface-muted shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {shoe.title}
                      </p>
                      <p className="text-xs text-text-muted">{shoe.styleId}</p>
                    </div>
                    {selectedShoe?.productId === shoe.productId && (
                      <LuCircleCheck
                        className="text-primary shrink-0"
                        size={20}
                      />
                    )}
                  </div>
                ))}
              </div>
            )}

            {!searching && query && results.length === 0 && (
              <div className="text-center py-16">
                <p className="text-text-muted text-sm">
                  No results for "{query}"
                </p>
              </div>
            )}
          </div>

          <div className="w-full border-t md:border-t-0 border-border md:w-1/2 md:pl-8 mt-8 md:mt-0">
            {selectedShoe ? (
              <>
                <div className="bg-surface mt-6 md:mt-0 border border-border rounded-xl p-4 mb-6">
                  <p className="text-sm font-medium mb-1">
                    {selectedShoe.title}
                  </p>
                  <p className="text-xs text-text-muted">
                    {selectedShoe.styleId}
                  </p>
                </div>

                <p className="text-sm font-medium mb-4">
                  Set your alert preferences
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
                  <div>
                    <label className="text-xs text-text-muted block mb-1.5">
                      Size
                    </label>
                    <select
                      value={size}
                      onChange={(e) => setSize(e.target.value)}
                      className="w-full bg-surface-muted border border-border rounded-lg px-3 py-2.5 text-sm text-text focus:outline-none"
                    >
                      <option value="">Select your size</option>
                      {sizeOptions.map((s) => (
                        <option value={s} key={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-text-muted block mb-1.5">
                      Max price (optional)
                    </label>
                    <input
                      type="number"
                      value={maxPrice}
                      onChange={(e) => setMaxPrice(e.target.value)}
                      placeholder="e.g. 350"
                      className="w-full bg-surface-muted border border-border rounded-lg px-3 py-2.5 text-sm text-text focus:outline-none"
                    />
                  </div>
                </div>

                <div className="flex gap-6 mb-5">
                  <label className="flex items-center gap-2 text-sm text-text-muted cursor-pointer">
                    <input
                      type="checkbox"
                      checked={emailNotif}
                      onChange={(e) => setEmailNotif(e.target.checked)}
                    />
                    Email
                  </label>
                  <label className="flex items-center gap-2 text-sm text-text-muted cursor-pointer">
                    <input
                      type="checkbox"
                      checked={inAppNotif}
                      onChange={(e) => setInAppNotif(e.target.checked)}
                    />
                    In-app
                  </label>
                </div>

                <Button
                  variant="primary"
                  fullWidth
                  disabled={!size || submitting}
                  onClick={handleSubmit}
                >
                  {submitting ? "Creating alert..." : "Set alert"}
                </Button>
              </>
            ) : (
              <div className="text-center py-16">
                <p className="text-text-muted text-sm">
                  Select a shoe from the results to set an alert
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
