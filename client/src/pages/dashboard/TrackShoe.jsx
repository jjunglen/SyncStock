import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { LuSearch, LuCircleCheck, LuCircleX, LuFootprints } from "react-icons/lu";
import DashboardNavbar from "../../components/layout/DashboardNavbar.jsx";
import Button from "../../components/ui/Button.jsx";
import api from "../../lib/api.js";
import { CONDITION_OPTIONS, EMPTY_CARD_PREFS, isSealedOnly, savedCardPrefs } from "../../lib/alertOptions.js";
import CardPrefsPicker from "../../components/dashboard/CardPrefsPicker.jsx";
import PriceRangeSlider from "../../components/ui/PriceRangeSlider.jsx";
import { PRICE_MIN, PRICE_MAX, pricesFromRange } from "../../lib/priceRange.js";
import SizePicker from "../../components/dashboard/SizePicker.jsx";
import TrackByName from "../../components/dashboard/TrackByName.jsx";
import Switch from "../../components/ui/Switch.jsx";
import { CATEGORY_META, SIZES_BY_CATEGORY, GS_SIZES } from "../../lib/categories.js";
import { categoryFromStockx, cardKindsFromStockx, isGradeSchool } from "../../lib/stockxCategory.js";

// What can be tracked here (trading cards have no sizes and aren't on
// StockX search). ?category=clothing opens in clothing mode.
const TRACKABLE = ["sneakers", "clothing"];

// One of the store's own products (/inventory/trackable) in the shape the
// page uses for StockX results. `store` marks it: its sizes come from the
// product, and the alert is tied to it so a restock always matches.
const fromStore = (item) => ({
  ...item,
  store: true,
  productId: `store-${item.product_id}`,
  styleId: item.sku,
});

export default function TrackShoe() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [storeResults, setStoreResults] = useState([]);
  const [selectedShoe, setSelectedShoe] = useState(null);
  const [searching, setSearching] = useState(false);
  const [sizes, setSizes] = useState([]);
  const [priceRange, setPriceRange] = useState([PRICE_MIN, PRICE_MAX]);
  const [condition, setCondition] = useState("either");
  // Trading cards: raw or graded, and how good (CardPrefsPicker)
  const [cardPrefs, setCardPrefs] = useState(EMPTY_CARD_PREFS);
  // The shopper's saved card preferences (Profile → Your sizes); each
  // card alert starts from them
  const [myCardPrefs, setMyCardPrefs] = useState(null);
  const [emailNotif, setEmailNotif] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [mySizes, setMySizes] = useState([]);
  // The store's "other" category (name + size chart), if it has one
  const [otherCategory, setOtherCategory] = useState(null);
  const [searchParams] = useSearchParams();
  const [category, setCategory] = useState(() =>
    TRACKABLE.includes(searchParams.get("category")) ? searchParams.get("category") : "sneakers",
  );
  // Sizes only make sense for their category — clear them on a switch
  const switchCategory = (next) => {
    if (next === category) return;
    setCategory(next);
    setSizes([]);
  };

  const navigate = useNavigate();
  const formRef = useRef(null);

  // On phones the form sits below the results — bring it into view once
  // a shoe is picked (after it renders). Side by side on larger screens.
  const showFormOnPhones = () => {
    if (!window.matchMedia("(max-width: 767px)").matches) return;
    requestAnimationFrame(() =>
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }),
    );
  };

  useEffect(() => {
    api
      .get("/auth/me")
      .then((res) => {
        setMySizes(res.data.data.sizes || []);
        const saved = savedCardPrefs(res.data.data);
        setMyCardPrefs(saved);
        if (saved) setCardPrefs(saved);
      })
      .catch(() => {});
    api
      .get("/inventory/categories")
      .then((res) => setOtherCategory((res.data.data || []).find((c) => c.key === "other") || null))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!query.trim()) return; // cleared where the search box changes
    // The store's own products and StockX, side by side — one failing
    // still shows the other
    const timeout = setTimeout(async () => {
      setSearching(true);
      const q = encodeURIComponent(query);
      const [store, stockx] = await Promise.allSettled([
        api.get(`/inventory/trackable?q=${q}`),
        api.get(`/stockx/search?q=${q}`),
      ]);
      setStoreResults(store.status === "fulfilled" ? (store.value.data.data || []).map(fromStore) : []);
      setResults(stockx.status === "fulfilled" ? stockx.value.data.data || [] : []);
      if (store.status === "rejected") console.error("Store search failed", store.reason);
      if (stockx.status === "rejected") console.error("StockX search failed", stockx.reason);
      setSearching(false);
    }, 600);
    return () => clearTimeout(timeout);
  }, [query]);

  // Trading cards have no sizes: the card picker replaces them
  const isCard = !!selectedShoe && category === "trading_cards";
  // Sealed product or singles: from the store's listings, or StockX's title
  const cardKinds = selectedShoe?.store ? selectedShoe.card_kinds : cardKindsFromStockx(selectedShoe);
  // A store product with no sizes (one variant) needs no size picked
  const sizeless = isCard || (!!selectedShoe?.store && selectedShoe.sizes.length === 0);
  // A grade-school StockX shoe only comes in youth sizes
  const gsShoe = !!selectedShoe && !selectedShoe.store && category === "sneakers" && isGradeSchool(selectedShoe);
  const canSubmit = sizeless || sizes.length > 0;

  const handleSubmit = async () => {
    if (!selectedShoe || !canSubmit) return;
    setSubmitting(true);
    setError("");
    setSuccess(false);

    try {
      const res = await api.post("/alerts", {
        category,
        product_name: selectedShoe.title,
        sku: selectedShoe.styleId,
        sizes: isCard ? [] : sizes,
        ...pricesFromRange(priceRange),
        condition_preference: isCard ? "either" : condition,
        ...(isCard && { card_prefs: cardPrefs, card_type: isSealedOnly(cardKinds) ? "sealed" : null }),
        notify_email: emailNotif,
        // The phone app is coming soon; website notifications stay on
        notify_inapp: true,
        ...(selectedShoe.store
          ? { store_product_id: selectedShoe.product_id }
          : { stockx_product_id: selectedShoe.productId, stockx_url_key: selectedShoe.urlKey }),
        image_url: selectedShoe.image_url || null,
      });

      const made = (res.data.created || []).filter(Boolean);
      const skipped = res.data.skipped || [];
      setSuccess(
        made.length > 1 || skipped.length > 0
          ? `${made.length === 1 ? "Alert" : `${made.length} alerts`} created for size${made.length === 1 ? "" : "s"} ${made.join(", ")}.${skipped.length ? ` Already tracking ${skipped.join(", ")}.` : ""}`
          : true,
      );
      setSelectedShoe(null);
      setQuery("");
      setSizes([]);
      setPriceRange([PRICE_MIN, PRICE_MAX]);
      setCondition("either");
      setCardPrefs(myCardPrefs || EMPTY_CARD_PREFS);
      setResults([]);
      setStoreResults([]);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Failed to create alert. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  // A result row (store products and StockX alike)
  const renderResult = (shoe) => (
    <div
      key={shoe.productId}
      onClick={() => {
        setSelectedShoe(shoe);
        showFormOnPhones();
        setSuccess(false);
        setError("");
        setCardPrefs(myCardPrefs || EMPTY_CARD_PREFS);
        if (shoe.store) {
          // The store's product: its own sizes, starting with the
          // shopper's saved sizes it comes in
          if (TRACKABLE.includes(shoe.category) || ["other", "trading_cards"].includes(shoe.category)) setCategory(shoe.category);
          const offered = shoe.sizes.map((s) => s.size);
          setSizes(mySizes.filter((s) => offered.includes(s)));
          return;
        }
        // A hoodie switches to clothing sizes on its own
        const itemCategory = categoryFromStockx(shoe) || (category === "trading_cards" ? "sneakers" : category);
        const switching = itemCategory !== category || !!selectedShoe?.store;
        if (itemCategory !== category) setCategory(itemCategory);
        if (switching) setSizes([]);
        // Start with the shopper's saved sizes for this type (for a GS
        // shoe, only the youth ones)
        const offered = itemCategory === "sneakers" && isGradeSchool(shoe) ? GS_SIZES : SIZES_BY_CATEGORY[itemCategory];
        const savedForType = mySizes.filter((s) => offered.includes(s));
        if (switching || offered !== SIZES_BY_CATEGORY[itemCategory]) setSizes(savedForType);
        else if (sizes.length === 0) setSizes(savedForType);
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
        <p className="text-xs text-text-muted truncate">
          {shoe.store ? [shoe.styleId, shoe.in_stock ? "In stock" : "Sold out"].filter(Boolean).join(" · ") : shoe.styleId}
        </p>
      </div>
      {selectedShoe?.productId === shoe.productId && (
        <LuCircleCheck
          className="text-primary shrink-0"
          size={20}
        />
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-bg text-text pb-24 lg:pb-0">
      <DashboardNavbar />

      <div className="pt-24 px-4 md:px-10">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-primary/10 flex items-center justify-center rounded-full shrink-0">
            <LuSearch className="text-text" size={18} />
          </div>
          <div>
            <p className="text-base font-medium">Track a new item</p>
            <p className="text-xs text-text-muted">
              We'll notify you the moment it hits the store
            </p>
          </div>
        </div>

        {success && (
          <div className="mb-4 bg-live/10 border border-live/30 text-live text-sm rounded-xl px-4 py-3 flex items-center justify-between">
            <span>{typeof success === "string" ? success : "Alert created! We'll notify you when it drops."}</span>
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
                  if (!e.target.value.trim()) {
                    setResults([]);
                    setStoreResults([]);
                  }
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
                    setStoreResults([]);
                  }}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-text-muted hover:text-text"
                >
                  <LuCircleX size={16} />
                </button>
              )}
            </div>

            {query && !searching && (
              <p className="text-sm text-text-muted mb-4">
                Tap an item to set an alert
              </p>
            )}
            {searching && (
              <p className="text-text-muted text-xs py-4">Searching...</p>
            )}

            {!searching && storeResults.length > 0 && (
              <div className="mb-5">
                <p className="text-xs font-medium text-text-muted uppercase tracking-wider mb-2">In this store</p>
                <div className="flex flex-col gap-2">{storeResults.map(renderResult)}</div>
              </div>
            )}

            {!searching && results.length > 0 && (
              <div>
                {storeResults.length > 0 && (
                  <p className="text-xs font-medium text-text-muted uppercase tracking-wider mb-2">Everything else</p>
                )}
                <div className="flex flex-col gap-2">{results.map(renderResult)}</div>
              </div>
            )}

            {!searching && query && results.length === 0 && storeResults.length === 0 && (
              <div className={`text-center ${otherCategory ? "py-6" : "py-16"}`}>
                <p className="text-text-muted text-sm">
                  No results for "{query}"
                </p>
              </div>
            )}

            {!searching && otherCategory && query.trim() && (
              <TrackByName key={query} query={query} other={otherCategory} />
            )}
          </div>

          <div
            ref={formRef}
            className="w-full border-t md:border-t-0 border-border md:w-1/2 md:pl-8 mt-8 md:mt-0 scroll-mt-20"
          >
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

                {isCard ? null : selectedShoe.store ? (
                  <div>
                    <p className="text-xs font-medium text-text-muted uppercase tracking-wider mb-2">Sizes</p>
                    {sizeless ? (
                      <p className="text-sm text-text-muted">One size — we'll let you know when it's back.</p>
                    ) : (
                      <div role="group" aria-label="Sizes" className="flex flex-wrap gap-2">
                        {selectedShoe.sizes.map(({ size, in_stock: inStock }) => {
                          const picked = sizes.includes(size);
                          return (
                            <button
                              key={size}
                              type="button"
                              aria-pressed={picked}
                              onClick={() => setSizes(picked ? sizes.filter((s) => s !== size) : [...sizes, size])}
                              className={`rounded-xl border px-3 py-2 text-sm transition-colors ${
                                picked ? "bg-primary text-primary-text border-primary font-semibold" : "border-border bg-surface hover:border-text/30"
                              }`}
                            >
                              {size}
                              {inStock && <span className={`ml-1.5 text-[10px] ${picked ? "opacity-80" : "text-live"}`}>in stock</span>}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ) : (
                  <div>
                    <p className="text-xs font-medium text-text-muted uppercase tracking-wider mb-2">Type</p>
                    <div role="radiogroup" aria-label="Type" className="grid grid-cols-2 gap-1 p-1 mb-4 border border-text/15 rounded-xl bg-surface-muted">
                      {TRACKABLE.map((key) => (
                        <button
                          key={key}
                          type="button"
                          role="radio"
                          aria-checked={category === key}
                          onClick={() => switchCategory(key)}
                          className={`rounded-lg px-2 py-2 text-sm font-medium transition-colors ${
                            category === key ? "bg-primary text-primary-text" : "text-text-muted hover:text-text"
                          }`}
                        >
                          {CATEGORY_META[key].label}
                        </button>
                      ))}
                    </div>
                    <p className="text-xs font-medium text-text-muted uppercase tracking-wider mb-2">Sizes</p>
                    <SizePicker
                      value={sizes}
                      onChange={setSizes}
                      category={category}
                      mySizes={mySizes.filter((s) => (SIZES_BY_CATEGORY[category] || []).includes(s))}
                      options={gsShoe ? GS_SIZES : null}
                    />
                    {gsShoe && (
                      <p className="mt-2 text-xs text-text-muted">Grade school (GS) — youth sizes 3.5Y–7Y only.</p>
                    )}
                  </div>
                )}

                <PriceRangeSlider value={priceRange} onChange={setPriceRange} />

                {isCard ? (
                  <div>
                    {myCardPrefs && (
                      <p className="mb-3 rounded-lg bg-primary/10 px-3 py-2 text-xs text-text">
                        Starting from your card preferences — change them here for this card only.
                      </p>
                    )}
                    <CardPrefsPicker value={cardPrefs} onChange={setCardPrefs} kinds={cardKinds} />
                  </div>
                ) : (
                <div>
                  <p className="text-xs font-medium text-text-muted uppercase tracking-wider mb-2">Condition</p>
                  <div role="radiogroup" aria-label="Condition" className="grid grid-cols-3 gap-1 p-1 border border-text/15 rounded-xl bg-surface-muted">
                    {CONDITION_OPTIONS.map((o) => (
                      <button
                        key={o.value}
                        type="button"
                        role="radio"
                        aria-checked={condition === o.value}
                        onClick={() => setCondition(o.value)}
                        className={`px-2 py-2 rounded-lg text-xs sm:text-sm leading-tight transition-colors ${
                          condition === o.value
                            ? "bg-primary text-primary-text font-semibold shadow-sm"
                            : "text-text hover:bg-text/10"
                        }`}
                      >
                        {o.label}
                      </button>
                    ))}
                  </div>
                </div>
                )}

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
                  disabled={!canSubmit || submitting}
                  onClick={handleSubmit}
                >
                  {submitting
                    ? sizes.length > 1 ? "Creating alerts..." : "Creating alert..."
                    : sizeless
                      ? "Set alert"
                      : sizes.length > 1
                      ? `Set alerts for ${sizes.length} sizes`
                      : sizes.length === 1
                        ? `Set alert for size ${sizes[0]}`
                        : "Choose a size to set an alert"}
                </Button>
              </div>
            ) : (
              <div className="text-center py-16">
                <LuFootprints size={28} className="mx-auto mb-3 text-text-muted/60" aria-hidden="true" />
                <p className="text-text-muted text-sm">
                  Select an item from the results to set an alert
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
