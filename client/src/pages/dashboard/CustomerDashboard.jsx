import { useState, useEffect, useCallback } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import {
  LuSearch,
  LuChevronDown,
  LuLayoutDashboard,
  LuBell,
  LuPlus,
} from "react-icons/lu";
import DashboardNavbar from "../../components/layout/DashboardNavbar.jsx";
import ProductCard from "../../components/dashboard/ProductCard.jsx";
import ProductModal from "../../components/dashboard/ProductModal.jsx";
import AlertCard from "../../components/dashboard/AlertCard.jsx";
import Button from "../../components/ui/Button.jsx";
import {
  ContainerToggle,
  CellToggle,
} from "../../components/ui/AnimatedToggleLayout.jsx";
import api from "../../lib/api.js";
import { CATEGORY_META, SIZES_BY_CATEGORY } from "../../lib/categories.js";

const TABS = [
  { key: "instock", label: "In stock" },
  { key: "browse", label: "Browse inventory" },
  { key: "alerts", label: "Your alerts" },
];

const PAGE_SIZE = 24;

// Price filter options — the laboratory's items run $8 to $1,500,
// most around $90
const PRICE_RANGES = [
  { key: "", label: "Any price" },
  { key: "0-100", label: "Under $100", max: 100 },
  { key: "100-200", label: "$100 – $200", min: 100, max: 200 },
  { key: "200-300", label: "$200 – $300", min: 200, max: 300 },
  { key: "300-500", label: "$300 – $500", min: 300, max: 500 },
  { key: "500-", label: "$500+", min: 500 },
];

const SORTS = [
  { value: "newest", label: "Newest" },
  { value: "price_asc", label: "Price: low to high" },
  { value: "price_desc", label: "Price: high to low" },
];

// Adds the brand and price filters and sort to an inventory request
const addFilters = (params, brand, priceKey, sort) => {
  if (brand) params.set("brand", brand);
  if (sort && sort !== "newest") params.set("sort", sort);
  const range = PRICE_RANGES.find((r) => r.key === priceKey);
  if (range?.min != null) params.set("min_price", String(range.min));
  if (range?.max != null) params.set("max_price", String(range.max));
  return params;
};

export default function CustomerDashboard() {
  const location = useLocation();
  const navigate = useNavigate();
  const [tab, setTab] = useState("instock");
  const [selectedItem, setSelectedItem] = useState(null);

  // Categories this store carries (only those get a tab)
  const [categories, setCategories] = useState([]);
  const [category, setCategory] = useState(
    () => new URLSearchParams(location.search).get("category") || "sneakers",
  );

  const [inStockItems, setInStockItems] = useState([]);
  const [inStockMeta, setInStockMeta] = useState(null);
  const [inStockPage, setInStockPage] = useState(1);
  const [loadingInStock, setLoadingInStock] = useState(true);
  const [mySizes, setMySizes] = useState([]);

  const [browseItems, setBrowseItems] = useState([]);
  const [browseMeta, setBrowseMeta] = useState(null);
  const [browsePage, setBrowsePage] = useState(1);
  const [loadingBrowse, setLoadingBrowse] = useState(true);
  const [browseQuery, setBrowseQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [selectedSize, setSelectedSize] = useState("All sizes");

  // Brand + price filters apply to both In stock and Browse
  const [brandFilter, setBrandFilter] = useState("");
  const [priceFilter, setPriceFilter] = useState("");
  const [brandOptions, setBrandOptions] = useState([]);
  const [sort, setSort] = useState("newest");
  const filtersActive = !!(brandFilter || priceFilter);

  const [alerts, setAlerts] = useState([]);
  const [loadingAlerts, setLoadingAlerts] = useState(true);

  useEffect(() => {
    api
      .get("/inventory/categories")
      .then((res) => {
        const list = res.data.data || [];
        setCategories(list);
        // Stay on the current category only if this store carries it
        if (list.length > 0 && !list.some((c) => c.key === category)) {
          setCategory(list[0].key);
        }
      })
      .catch((err) => console.error("Failed to load categories:", err));
    // Runs once — `category` is only read to validate the initial value
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const changeCategory = (key) => {
    setCategory(key);
    setInStockPage(1);
    setBrowsePage(1);
    setSelectedSize("All sizes");
    setBrandFilter("");
    setPriceFilter("");
  };

  // A filter change starts both lists from page 1
  const changeBrand = (value) => {
    setBrandFilter(value);
    setInStockPage(1);
    setBrowsePage(1);
  };
  const changePrice = (value) => {
    setPriceFilter(value);
    setInStockPage(1);
    setBrowsePage(1);
  };
  const changeSort = (value) => {
    setSort(value);
    setInStockPage(1);
    setBrowsePage(1);
  };
  const clearFilters = () => {
    changeBrand("");
    changePrice("");
  };

  useEffect(() => {
    api
      .get("/auth/me")
      .then((res) => setMySizes(res.data.data.sizes || []))
      .catch((err) => console.error("Failed to load account:", err));
  }, []);

  const fetchInStock = useCallback((page, cat, brand, price, order, query) => {
    setLoadingInStock(true);
    const params = addFilters(
      new URLSearchParams({ category: cat, page: String(page), limit: String(PAGE_SIZE) }),
      brand,
      price,
      order,
    );
    if (query) params.set("q", query);
    api
      .get(`/inventory/my-sizes?${params.toString()}`)
      .then((res) => {
        setInStockItems(res.data.data || []);
        setInStockMeta(res.data.meta || null);
      })
      .catch((err) => console.error("Failed to load in-stock items:", err))
      .finally(() => setLoadingInStock(false));
  }, []);

  useEffect(() => {
    fetchInStock(inStockPage, category, brandFilter, priceFilter, sort, debouncedQuery);
  }, [inStockPage, category, brandFilter, priceFilter, sort, debouncedQuery, fetchInStock]);

  // Brands to offer: in your sizes on In stock, everything on Browse
  useEffect(() => {
    if (tab === "alerts") return;
    const params = new URLSearchParams({ category });
    if (tab === "instock") params.set("scope", "my-sizes");
    api
      .get(`/inventory/brands?${params.toString()}`)
      .then((res) => setBrandOptions(res.data.data || []))
      .catch((err) => console.error("Failed to load brands:", err));
  }, [tab, category]);

  const fetchBrowse = useCallback((page, query, size, cat, brand, price, order) => {
    setLoadingBrowse(true);
    const params = new URLSearchParams({
      category: cat,
      page: String(page),
      limit: String(PAGE_SIZE),
    });
    if (query) params.set("q", query);
    if (size && size !== "All sizes") params.set("size", size);
    addFilters(params, brand, price, order);

    api
      .get(`/inventory/search?${params.toString()}`)
      .then((res) => {
        setBrowseItems(res.data.data || []);
        setBrowseMeta(res.data.meta || null);
      })
      .catch((err) => console.error("Failed to load inventory:", err))
      .finally(() => setLoadingBrowse(false));
  }, []);

  // Debounce raw typing into debouncedQuery
  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedQuery(browseQuery), 300);
    return () => clearTimeout(timeout);
  }, [browseQuery]);

  // A real filter change (query or size) always resets to page 1
  useEffect(() => {
    setBrowsePage(1);
    setInStockPage(1);
  }, [debouncedQuery, selectedSize]);

  // Single source of truth: any change to page, query, or size
  // triggers exactly one fetch — Previous/Next just changes browsePage
  // and this picks it up the same way a filter change does.
  useEffect(() => {
    fetchBrowse(browsePage, debouncedQuery, selectedSize, category, brandFilter, priceFilter, sort);
  }, [browsePage, debouncedQuery, selectedSize, category, brandFilter, priceFilter, sort, fetchBrowse]);

  const loadAlerts = useCallback(() => {
    api
      .get("/alerts")
      .then((res) => setAlerts(res.data.data.alerts || []))
      .catch((err) => console.error("Failed to load alerts:", err))
      .finally(() => setLoadingAlerts(false));
  }, []);

  useEffect(() => {
    loadAlerts();
  }, [loadAlerts]);

  // "Need a different size?" in the popup opens that size's listing
  const openItem = (id) => {
    api
      .get(`/inventory/${id}`)
      .then((res) => setSelectedItem(res.data.data))
      .catch((err) => console.error("Failed to load item:", err));
  };

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const itemId = params.get("item");
    if (!itemId) return;

    api
      .get(`/inventory/${itemId}`)
      .then((res) => setSelectedItem(res.data.data))
      .catch((err) => console.error("Failed to load item from link:", err));
  }, [location.search]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tabParam = params.get("tab");
    if (tabParam && TABS.some((t) => t.key === tabParam)) {
      setTab(tabParam);
    }
  }, [location.search]);

  const closeModal = () => {
    setSelectedItem(null);
    const params = new URLSearchParams(location.search);
    params.delete("item");
    params.delete("alert");
    const newSearch = params.toString();
    navigate(`/store/dashboard${newSearch ? `?${newSearch}` : ""}`, {
      replace: true,
    });
  };

  const handleDeleteAlert = async (alertId) => {
    try {
      await api.delete(`/alerts/${alertId}`);
      setAlerts((prev) => prev.filter((a) => a.id !== alertId));
    } catch (err) {
      console.error("Failed to delete alert:", err);
    }
  };

  const categorySizes = SIZES_BY_CATEGORY[category] || [];
  const availableSizes = ["All sizes", ...categorySizes];
  const mySizesHere = mySizes.filter((s) => categorySizes.includes(s));
  const isCards = category === "trading_cards";
  const showSwitcher = categories.length > 1;

  // One switch, laid out vertically in the left column on desktop and
  // as a full-width row under the tabs on phones
  const categorySwitch = (vertical) => (
    <div
      role="tablist"
      aria-label="Category"
      className={`flex ${vertical ? "flex-col" : ""} gap-1 p-1 border border-text/15 rounded-lg bg-surface-muted`}
    >
      {categories.map((c) => (
        <button
          key={c.key}
          role="tab"
          aria-selected={category === c.key}
          onClick={() => changeCategory(c.key)}
          className={`flex items-center gap-2 text-sm px-3 py-2 rounded-md transition-colors ${vertical ? "justify-between text-left" : "flex-1 justify-center text-center leading-tight"} ${
            category === c.key
              ? "bg-primary text-primary-text font-semibold shadow-sm"
              : "text-text hover:bg-text/10"
          }`}
        >
          {CATEGORY_META[c.key]?.label || c.key}
          {vertical && (
            <span className={`text-xs ${category === c.key ? "text-primary-text/70" : "text-text-muted"}`}>{c.count}</span>
          )}
        </button>
      ))}
    </div>
  );

  const selectClass =
    "w-full appearance-none text-sm border border-border bg-surface text-text-muted pl-4 pr-9 py-2.5 rounded-lg focus:outline-none cursor-pointer";

  // The chosen brand stays listed even if this tab has none of it
  const brandChoices =
    brandFilter && !brandOptions.some((b) => b.brand === brandFilter)
      ? [{ brand: brandFilter, count: 0 }, ...brandOptions]
      : brandOptions;

  // On phones the dropdowns stretch to share each row; from sm up they
  // sit at their natural width
  const filterWidth = "flex-1 min-w-[8.5rem] sm:flex-none sm:min-w-0";

  const filterSelect = (label, value, onChange, options) => (
    <div className={`relative ${filterWidth}`}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={label}
        className={`${selectClass} ${value ? "text-text border-text/30" : ""}`}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <LuChevronDown
        className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none"
        size={14}
      />
    </div>
  );

  const brandAndPriceFilters = (
    <>
      {filterSelect("Brand", brandFilter, changeBrand, [
        { value: "", label: "All brands" },
        ...brandChoices.map((b) => ({
          value: b.brand,
          label: b.count ? `${b.brand} (${b.count})` : b.brand,
        })),
      ])}
      {filterSelect(
        "Price",
        priceFilter,
        changePrice,
        PRICE_RANGES.map((r) => ({ value: r.key, label: r.label })),
      )}
      {filterSelect("Sort", sort === "newest" ? "" : sort, (v) => changeSort(v || "newest"), [
        { value: "", label: "Sort: Newest" },
        ...SORTS.slice(1).map((o) => ({ value: o.value, label: o.label })),
      ])}
      {filtersActive && (
        <button
          onClick={clearFilters}
          className="text-sm text-text-muted hover:text-text underline whitespace-nowrap"
        >
          Clear filters
        </button>
      )}
    </>
  );

  // One search box for both tabs (it keeps its text when switching)
  const searchBox = (placeholder) => (
    <div className="relative flex-1 min-w-[200px]">
      <LuSearch
        className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
        size={16}
      />
      <input
        type="search"
        value={browseQuery}
        onChange={(e) => setBrowseQuery(e.target.value)}
        placeholder={placeholder}
        aria-label="Search"
        className="w-full bg-surface border border-border rounded-lg pl-9 pr-4 py-2.5 text-sm text-text placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-text/10"
      />
    </div>
  );

  // The server found no exact matches and returned the closest ones
  const closeMatchNote = (meta) =>
    meta?.match === "close" && debouncedQuery ? (
      <p className="text-sm text-text-muted mb-4">
        No exact matches for <span className="text-text">“{debouncedQuery}”</span>. Showing close matches.
      </p>
    ) : null;

  const noSearchResults = (
    <div className="text-center py-16">
      <p className="text-text-muted text-sm mb-3">
        Nothing matches <span className="text-text">“{debouncedQuery}”</span>
      </p>
      <button onClick={() => setBrowseQuery("")} className="text-sm text-text underline">
        Clear search
      </button>
    </div>
  );

  const noMatches = (
    <div className="text-center py-16">
      <p className="text-text-muted text-sm mb-3">Nothing matches these filters</p>
      <button onClick={clearFilters} className="text-sm text-text underline">
        Clear filters
      </button>
    </div>
  );

  const sizeFilter = categorySizes.length > 0 && (
    <div className="relative">
      <select
        value={selectedSize}
        onChange={(e) => setSelectedSize(e.target.value)}
        aria-label="Size"
        className="w-full appearance-none text-sm border border-border bg-surface text-text-muted pl-4 pr-9 py-2.5 rounded-lg focus:outline-none cursor-pointer"
      >
        {availableSizes.map((size) => (
          <option key={size} value={size}>
            {size}
          </option>
        ))}
      </select>
      <LuChevronDown
        className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none"
        size={14}
      />
    </div>
  );

  return (
    <div className="min-h-screen bg-bg text-text pb-20">
      <DashboardNavbar />

      {selectedItem && (
        <ProductModal
          key={selectedItem.id}
          item={selectedItem}
          onClose={closeModal}
          alerts={alerts}
          onAlertCreated={loadAlerts}
          onOpenItem={openItem}
        />
      )}

      <div className="pt-16">
        <div className="flex border-b border-border px-4 md:px-10 overflow-x-auto">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`text-sm py-4 mr-6 border-b-2 whitespace-nowrap transition-colors ${
                tab === t.key
                  ? "text-text border-primary font-medium"
                  : "text-text-muted border-transparent"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {showSwitcher && (
          <div className="lg:hidden px-4 md:px-10 pt-4">{categorySwitch(false)}</div>
        )}

        <div className="px-4 md:px-10 py-6 max-w-6xl mx-auto lg:flex lg:gap-8">
          {showSwitcher && (
            <aside className="hidden lg:flex flex-col gap-6 w-48 shrink-0">
              {categorySwitch(true)}
              {tab === "browse" && sizeFilter && (
                <div>
                  <p className="text-xs text-text-muted mb-2">Size</p>
                  {sizeFilter}
                </div>
              )}
            </aside>
          )}

          <div className="flex-1 min-w-0">
          {tab === "instock" && (
            <>
              <div className="flex items-center justify-between flex-wrap gap-4 mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <LuLayoutDashboard size={18} className="text-text" />
                  </div>
                  <div>
                    <p className="text-base font-medium">
                      {isCards
                        ? "Trading cards in stock"
                        : `${CATEGORY_META[category]?.label || "Items"} in your sizes`}
                    </p>
                    {!isCards && (
                    <div className="flex gap-2 mt-1 flex-wrap">
                      {mySizesHere.length > 0 ? (
                        mySizesHere.map((size) => (
                          <span
                            key={size}
                            className="text-xs bg-surface border border-border text-text-muted py-1 px-2.5 rounded-full"
                          >
                            {size}
                          </span>
                        ))
                      ) : (
                        <Link
                          to="/store/profile"
                          className="text-xs text-text-muted hover:text-text underline"
                        >
                          No {CATEGORY_META[category]?.sizeName} sizes saved yet — add them
                        </Link>
                      )}
                    </div>
                    )}
                  </div>
                </div>
                {category !== "trading_cards" && (
                <Link
                  to={`/store/track?category=${category}`}
                  className="flex items-center gap-2 bg-primary/10 text-text text-sm px-4 py-2.5 rounded-lg hover:bg-primary/15 transition-colors"
                >
                  <LuPlus size={16} /> Track a new item
                </Link>
                )}
              </div>

              <div className="flex items-center gap-3 mb-6 flex-wrap">
                {searchBox("Search your sizes")}
                {brandAndPriceFilters}
              </div>

              {!loadingInStock && closeMatchNote(inStockMeta)}

              {loadingInStock ? (
                <p className="text-text-muted text-sm">Loading...</p>
              ) : inStockItems.length === 0 && debouncedQuery ? (
                noSearchResults
              ) : inStockItems.length === 0 && filtersActive ? (
                noMatches
              ) : inStockItems.length === 0 ? (
                <div className="text-center py-16">
                  <p className="text-text-muted text-sm mb-2">
                    Nothing in stock in your size right now
                  </p>
                  <p className="text-text-muted text-xs">
                    Set an alert to get notified when something drops
                  </p>
                </div>
              ) : (
                <>
                  <ContainerToggle>
                    {inStockItems.map((item) => (
                      <CellToggle
                        key={item.id}
                        onClick={() => setSelectedItem(item)}
                      >
                        <ProductCard item={item} />
                      </CellToggle>
                    ))}
                  </ContainerToggle>

                  {inStockMeta && inStockMeta.totalPages > 1 && (
                    <div className="flex items-center justify-between mt-6">
                      <button
                        disabled={inStockPage <= 1}
                        onClick={() => setInStockPage((p) => p - 1)}
                        className="text-sm text-text-muted hover:text-text disabled:opacity-30"
                      >
                        Previous
                      </button>
                      <span className="text-xs text-text-muted">
                        Page {inStockMeta.page} of {inStockMeta.totalPages}
                      </span>
                      <button
                        disabled={inStockPage >= inStockMeta.totalPages}
                        onClick={() => setInStockPage((p) => p + 1)}
                        className="text-sm text-text-muted hover:text-text disabled:opacity-30"
                      >
                        Next
                      </button>
                    </div>
                  )}
                </>
              )}
            </>
          )}

          {tab === "browse" && (
            <>
              <div className="flex items-center justify-between flex-wrap gap-4 mb-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <LuSearch size={18} className="text-text" />
                  </div>
                  <div>
                    <p className="text-base font-medium">Browse inventory</p>
                    <p className="text-xs text-text-muted">
                      {browseMeta
                        ? `${browseMeta.total} in stock right now`
                        : ""}
                    </p>
                  </div>
                </div>
                {category !== "trading_cards" && (
                <Link
                  to={`/store/track?category=${category}`}
                  className="flex items-center gap-2 bg-primary/10 text-text text-sm px-4 py-2.5 rounded-lg hover:bg-primary/15 transition-colors"
                >
                  <LuPlus size={16} /> Track a new item
                </Link>
                )}
              </div>

              <div className="flex items-center gap-3 mb-6 flex-wrap">
                {searchBox("Search inventory")}
                {sizeFilter && (
                  <div className={`${filterWidth} ${showSwitcher ? "lg:hidden" : ""}`}>{sizeFilter}</div>
                )}
                {brandAndPriceFilters}
              </div>

              {!loadingBrowse && closeMatchNote(browseMeta)}

              {loadingBrowse ? (
                <p className="text-text-muted text-sm">Loading...</p>
              ) : browseItems.length === 0 && debouncedQuery ? (
                noSearchResults
              ) : browseItems.length === 0 && filtersActive ? (
                noMatches
              ) : browseItems.length === 0 ? (
                <div className="text-center py-16">
                  <p className="text-text-muted text-sm">No results found</p>
                </div>
              ) : (
                <>
                  <ContainerToggle>
                    {browseItems.map((item) => (
                      <CellToggle
                        key={item.id}
                        onClick={() => setSelectedItem(item)}
                      >
                        <ProductCard item={item} />
                      </CellToggle>
                    ))}
                  </ContainerToggle>

                  {browseMeta && browseMeta.totalPages > 1 && (
                    <div className="flex items-center justify-between mt-6">
                      <button
                        disabled={browsePage <= 1}
                        onClick={() => setBrowsePage((p) => p - 1)}
                        className="text-sm text-text-muted hover:text-text disabled:opacity-30"
                      >
                        Previous
                      </button>
                      <span className="text-xs text-text-muted">
                        Page {browseMeta.page} of {browseMeta.totalPages}
                      </span>
                      <button
                        disabled={browsePage >= browseMeta.totalPages}
                        onClick={() => setBrowsePage((p) => p + 1)}
                        className="text-sm text-text-muted hover:text-text disabled:opacity-30"
                      >
                        Next
                      </button>
                    </div>
                  )}
                </>
              )}
            </>
          )}

          {tab === "alerts" && (
            <>
              <div className="flex items-center justify-between flex-wrap gap-4 mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <LuBell size={18} className="text-text" />
                  </div>
                  <div>
                    <p className="text-base font-medium">
                      <span className="text-text font-semibold">
                        {alerts.length}
                      </span>{" "}
                      shoes tracked
                    </p>
                    <p className="text-xs text-text-muted">
                      We'll notify you the second they drop
                    </p>
                  </div>
                </div>
                <Link
                  to="/store/track"
                  className="flex items-center gap-2 bg-primary/10 text-text text-sm px-4 py-2.5 rounded-lg hover:bg-primary/15 transition-colors"
                >
                  <LuPlus size={16} /> Track a new item
                </Link>
              </div>

              {loadingAlerts ? (
                <p className="text-text-muted text-sm">Loading...</p>
              ) : alerts.length === 0 ? (
                <div className="text-center py-16">
                  <p className="text-text-muted text-sm mb-4">No alerts yet</p>
                  <Link to="/store/track">
                    <Button variant="primary">Track your first shoe</Button>
                  </Link>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 items-start">
                  {alerts.map((alert) => (
                    <AlertCard
                      key={alert.id}
                      alert={alert}
                      onDelete={handleDeleteAlert}
                      onUpdated={(updated) =>
                        setAlerts((prev) => prev.map((a) => (a.id === updated.id ? updated : a)))
                      }
                    />
                  ))}
                </div>
              )}
            </>
          )}
          </div>
        </div>
      </div>
    </div>
  );
}
