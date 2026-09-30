import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { LuSearch, LuCircleCheck, LuCircleX, LuFootprints } from "react-icons/lu";
import DashboardNavbar from "../../components/layout/DashboardNavbar.jsx";
import Button from "../../components/ui/Button.jsx";
import api from "../../lib/api.js";
import { CONDITION_OPTIONS } from "../../lib/alertOptions.js";
import PriceRangeSlider from "../../components/ui/PriceRangeSlider.jsx";
import { PRICE_MIN, PRICE_MAX, pricesFromRange } from "../../lib/priceRange.js";
import SizePicker from "../../components/dashboard/SizePicker.jsx";
import Switch from "../../components/ui/Switch.jsx";

export default function TrackShoe() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [selectedShoe, setSelectedShoe] = useState(null);
  const [searching, setSearching] = useState(false);
  const [size, setSize] = useState(null);
  const [priceRange, setPriceRange] = useState([PRICE_MIN, PRICE_MAX]);
  const [condition, setCondition] = useState("either");
  const [emailNotif, setEmailNotif] = useState(true);
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
        ...pricesFromRange(priceRange),
        condition_preference: condition,
        notify_email: emailNotif,
        // The phone app is coming soon; website notifications stay on
        notify_inapp: true,
        stockx_product_id: selectedShoe.productId,
        stockx_url_key: selectedShoe.urlKey,
        image_url: selectedShoe.image_url || null,
      });

      setSuccess(true);
      setSelectedShoe(null);
      setQuery("");
      setSize(null);
      setPriceRange([PRICE_MIN, PRICE_MAX]);
      setCondition("either");
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
                className="w-full bg-surface-muted border border-border rounded-xl pl-11 pr-10 py-3 text-sm text-text focus:outline-none focus:ring-2 focus:ring-text/10"
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
                        : "border-border bg-surface hover:border-text/20"
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
                      <div className="w-16 h-16 rounded-lg bg-surface-muted shrink-0 flex items-center justify-center">
                        <LuFootprints size={20} className="text-text-muted/60" aria-hidden="true" />
                      </div>
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
              <div className="mt-6 md:mt-0 space-y-6">
                {/* The shoe: photo above the title */}
                <div className="bg-surface border border-border rounded-xl overflow-hidden">
                  <div className="bg-white h-48 md:h-56 flex items-center justify-center">
                    {selectedShoe.image_url ? (
                      <img
                        src={selectedShoe.image_url}
                        alt={selectedShoe.title}
                        className="h-full w-full object-contain p-4"
                      />
                    ) : (
                      <LuFootprints size={40} className="text-neutral-300" aria-hidden="true" />
                    )}
                  </div>
                  <div className="p-4">
                    <p className="text-base font-semibold">{selectedShoe.title}</p>
                    <p className="text-xs text-text-muted mt-0.5">
                      {[
                        selectedShoe.styleId,
                        selectedShoe.productAttributes?.colorway,
                        selectedShoe.productAttributes?.retailPrice &&
                          `Retail $${selectedShoe.productAttributes.retailPrice}`,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </div>
                </div>

                <div>
                  <p className="text-xs font-medium text-text-muted uppercase tracking-wider mb-2">Size</p>
                  <SizePicker value={size} onChange={setSize} mySizes={mySizes} />
                </div>

                <PriceRangeSlider value={priceRange} onChange={setPriceRange} />

                <div>
                  <p className="text-xs font-medium text-text-muted uppercase tracking-wider mb-2">Condition</p>
                  <div role="radiogroup" aria-label="Condition" className="grid grid-cols-3 border border-border rounded-xl overflow-hidden bg-surface">
                    {CONDITION_OPTIONS.map((o) => (
                      <button
                        key={o.value}
                        type="button"
                        role="radio"
                        aria-checked={condition === o.value}
                        onClick={() => setCondition(o.value)}
                        className={`px-2 py-2.5 text-xs sm:text-sm leading-tight transition-colors ${
                          condition === o.value
                            ? "bg-primary/10 text-text font-medium"
                            : "text-text-muted hover:text-text hover:bg-text/5"
                        }`}
                      >
                        {o.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-xs font-medium text-text-muted uppercase tracking-wider mb-2">Notify me by</p>
                  <div className="border border-border rounded-xl bg-surface divide-y divide-border">
                    <label className="flex items-center justify-between gap-4 px-4 py-3 cursor-pointer">
                      <span className="text-sm">Email</span>
                      <Switch size="sm" checked={emailNotif} onChange={setEmailNotif} label="Email notifications" />
                    </label>
                    <div className="flex items-center justify-between gap-4 px-4 py-3">
                      <span className="text-sm text-text-muted">
                        In app <span className="text-xs">(coming soon…)</span>
                      </span>
                      <Switch size="sm" checked={false} onChange={() => {}} disabled label="In app notifications, coming soon" />
                    </div>
                  </div>
                </div>

                <Button
                  variant="primary"
                  size="lg"
                  fullWidth
                  disabled={!size || submitting}
                  onClick={handleSubmit}
                >
                  {submitting ? "Creating alert..." : size ? `Set alert for size ${size}` : "Choose a size to set an alert"}
                </Button>
              </div>
            ) : (
              <div className="text-center py-16">
                <LuFootprints size={28} className="mx-auto mb-3 text-text-muted/60" aria-hidden="true" />
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
