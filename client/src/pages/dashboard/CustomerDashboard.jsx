import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { searchAlertPath, canAlertSearch } from "../../lib/searchAlert.js";
import { cardFilterOptions } from "../../lib/cardFilter.js";
import ComingSoonGrid from "../../components/store/ComingSoonGrid.jsx";
import { useStoreInfo } from "../../lib/storeInfo.js";
import SearchSuggest from "../../components/store/SearchSuggest.jsx";
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
import AddToHomeScreen from "../../components/store/AddToHomeScreen.jsx";
import Button from "../../components/ui/Button.jsx";
import {
  ContainerToggle,
  CellToggle,
} from "../../components/ui/AnimatedToggleLayout.jsx";
import api from "../../lib/api.js";
import { CATEGORY_META, SIZES_BY_CATEGORY, SIZELESS_CATEGORIES, BETA_CATEGORIES, categoryLabel } from "../../lib/categories.js";
import BetaBadge from "../../components/ui/BetaBadge.jsx";
import SizeFilter from "../../components/dashboard/SizeFilter.jsx";
import BackToTop from "../../components/ui/BackToTop.jsx";
import LoadMore from "../../components/ui/LoadMore.jsx";
import useInfiniteList from "../../lib/useInfiniteList.js";

const TABS = [
  { key: "instock", label: "In stock" },
  { key: "browse", label: "Browse inventory" },
  // Only when the store turned its Coming soon page on
  { key: "coming", label: "Coming soon", comingSoonOnly: true },
  { key: "alerts", label: "Your alerts" },
];

// One batch; more load as the shopper scrolls (fills 2, 3 and 4 columns)
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

const PRICE_SORTS = [
  { value: "price_asc", label: "Price: low to high" },
  { value: "price_desc", label: "Price: high to low" },
];
// "" is the default: best match first while searching, otherwise newest
const sortOptions = (searching) =>
  searching
    ? [{ value: "", label: "Sort: Best match" }, { value: "newest", label: "Newest" }, ...PRICE_SORTS]
    : [{ value: "", label: "Sort: Newest" }, ...PRICE_SORTS];

// Adds the brand, condition and price filters and sort to an inventory
// request (filters: { brand, condition })
const addFilters = (params, { brand, condition }, priceKey, sort) => {
  if (brand) params.set("brand", brand);
  // Trading cards have their own kinds (sealed, raw, graded): ?card=
  if (condition) params.set(params.get("category") === "trading_cards" ? "card" : "condition", condition);
  if (sort) params.set("sort", sort);
  const range = PRICE_RANGES.find((r) => r.key === priceKey);
  if (range?.min != null) params.set("min_price", String(range.min));
  if (range?.max != null) params.set("max_price", String(range.max));
  return params;
};

export default function CustomerDashboard() {
  // The store's settings (its Coming soon page)
  const storeInfo = useStoreInfo();
  const location = useLocation();
  const navigate = useNavigate();
  // The tab lives in the address (?tab=), so a refresh stays on it.
  // A Coming soon link after the store turned that page off: In stock.
  const askedTab = new URLSearchParams(location.search).get("tab");
  const tab =
    TABS.some((t) => t.key === askedTab) && !(askedTab === "coming" && storeInfo && !storeInfo.coming_soon)
      ? askedTab
      : "instock";
  const [selectedItem, setSelectedItem] = useState(null);

  // Categories this store carries (only those get a tab)
  const [categories, setCategories] = useState([]);
  const [category, setCategory] = useState(
    () => new URLSearchParams(location.search).get("category") || "sneakers",
  );

  const [mySizes, setMySizes] = useState([]);

  const [browseQuery, setBrowseQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [selectedSizes, setSelectedSizes] = useState([]);
  // As a string so picking sizes only refetches when the picks change
  const sizeKey = selectedSizes.join(",");

  // Brand + price filters apply to both In stock and Browse
  const [brandFilter, setBrandFilter] = useState("");
  const [priceFilter, setPriceFilter] = useState("");
  const [conditionFilter, setConditionFilter] = useState("");
  // Brand and condition together, so requests and effects take one value
  const filters = useMemo(() => ({ brand: brandFilter, condition: conditionFilter }), [brandFilter, conditionFilter]);
  const [brandOptions, setBrandOptions] = useState([]);
  const [sort, setSort] = useState("");
  const filtersActive = !!(brandFilter || priceFilter || conditionFilter);

  const [alerts, setAlerts] = useState([]);
  const [loadingAlerts, setLoadingAlerts] = useState(true);

  useEffect(() => {
    // Signed in: also counts what's in the shopper's sizes (In stock tab)
    api
      .get("/inventory/categories/mine")
      .catch(() => api.get("/inventory/categories"))
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

  // Tab and category are kept in the address, so a refresh (or the link)
  // opens the same view. In stock and the first category are the defaults.
  const setAddress = (changes) => {
    const params = new URLSearchParams(location.search);
    for (const [key, value] of Object.entries(changes)) {
      if (value) params.set(key, value);
      else params.delete(key);
    }
    const search = params.toString();
    navigate(`${location.pathname}${search ? `?${search}` : ""}`, { replace: true });
  };
  const changeTab = (key) => setAddress({ tab: key === "instock" ? "" : key });

  const changeCategory = (key) => {
    setCategory(key);
    setAddress({ category: key });
    setSelectedSizes([]);
    setBrandFilter("");
    setPriceFilter("");
    setConditionFilter("");
  };

  // A filter change starts both lists over (useInfiniteList)
  const changeBrand = (value) => {
    setBrandFilter(value);
  };
  const changeCondition = (value) => {
    setConditionFilter(value);
  };
  const changePrice = (value) => {
    setPriceFilter(value);
  };
  const changeSort = (value) => {
    setSort(value);
  };
  const clearFilters = () => {
    changeBrand("");
    changePrice("");
    changeCondition("");
  };

  useEffect(() => {
    api
      .get("/auth/me")
      .then((res) => setMySizes(res.data.data.sizes || []))
      .catch((err) => console.error("Failed to load account:", err));
  }, []);

  // Each list loads a batch at a time as the shopper scrolls; a new
  // search, filter or category starts it over. Only the list on screen is
  // fetched, so a search sends one request, not two.
  const inStock = useInfiniteList(
    (page) => {
      const params = addFilters(
        new URLSearchParams({ category, page: String(page), limit: String(PAGE_SIZE) }),
        filters,
        priceFilter,
        sort,
      );
      if (debouncedQuery) params.set("q", debouncedQuery);
      return `/inventory/my-sizes?${params.toString()}`;
    },
    { enabled: tab === "instock" },
  );
  const browse = useInfiniteList(
    (page) => {
      const params = new URLSearchParams({ category, page: String(page), limit: String(PAGE_SIZE) });
      if (debouncedQuery) params.set("q", debouncedQuery);
      if (sizeKey) params.set("size", sizeKey); // one or more, comma-separated
      addFilters(params, filters, priceFilter, sort);
      return `/inventory/search?${params.toString()}`;
    },
    { enabled: tab === "browse" },
  );

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

  // Debounce raw typing into debouncedQuery
  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedQuery(browseQuery), 300);
    return () => clearTimeout(timeout);
  }, [browseQuery]);

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

  // Keep stock current while the page is open: refresh every 30 seconds
  // while it's on screen, and right away when the shopper comes back to
  // it, so a restock shows without reloading the page
  const selectedItemId = selectedItem?.id;
  const refreshNow = useRef(null);
  useEffect(() => {
    refreshNow.current = () => {
      // Just the list on screen (the batches loaded so far)
      if (tab === "instock") inStock.refresh();
      if (tab === "browse") browse.refresh();
      loadAlerts();
      if (selectedItemId) {
        api
          .get(`/inventory/${selectedItemId}`)
          .then((res) => setSelectedItem((open) => (open?.id === selectedItemId ? res.data.data : open)))
          .catch(() => {});
      }
    };
  });
  useEffect(() => {
    const refresh = () => document.visibilityState === "visible" && refreshNow.current();
    const timer = setInterval(refresh, 30 * 1000);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, []);

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
  const mySizesHere = mySizes.filter((s) => categorySizes.includes(s));
  // Cards and "other": no saved sizes, so everything listed shows
  const sizeless = SIZELESS_CATEGORIES.includes(category);
  const currentLabel = categoryLabel(category, categories.find((c) => c.key === category)?.name);
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
          <span className="flex items-center gap-1.5">
            {categoryLabel(c.key, c.name)}
            {BETA_CATEGORIES.includes(c.key) && <BetaBadge size="xs" />}
          </span>
          {vertical && (
            <span className={`text-xs ${category === c.key ? "text-primary-text/70" : "text-text-muted"}`}>{tab === "instock" && c.in_your_sizes != null ? c.in_your_sizes : c.count}</span>
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

  // Condition: only where the category has both brand new and pre-owned
  const categoryInfo = categories.find((c) => c.key === category);
  // (trading cards: the kinds the store has — lib/cardFilter.js)
  const conditionChoices = category === "trading_cards"
    ? cardFilterOptions(categoryInfo?.card_kinds)
    : categoryInfo?.conditions?.brand_new > 0 && categoryInfo.conditions.pre_owned > 0
      ? [
          { value: "", label: "Any condition" },
          { value: "brand_new", label: "Brand new" },
          { value: "pre_owned", label: "Pre-owned" },
        ]
      : null;

  const brandAndPriceFilters = (
    <>
      {filterSelect("Brand", brandFilter, changeBrand, [
        { value: "", label: "All brands" },
        ...brandChoices.map((b) => ({
          value: b.brand,
          label: b.count ? `${b.brand} (${b.count})` : b.brand,
        })),
      ])}
      {conditionChoices && filterSelect("Condition", conditionFilter, changeCondition, conditionChoices)}
      {filterSelect(
        "Price",
        priceFilter,
        changePrice,
        PRICE_RANGES.map((r) => ({ value: r.key, label: r.label })),
      )}
      {filterSelect("Sort", !debouncedQuery && sort === "newest" ? "" : sort, changeSort, sortOptions(!!debouncedQuery))}
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
  // with suggestions while typing (a brand sets the brand filter)
  const searchBox = (placeholder) => (
    <SearchSuggest
      value={browseQuery}
      onChange={setBrowseQuery}
      category={category}
      placeholder={placeholder}
      onPickBrand={(picked) => {
        setBrowseQuery("");
        changeBrand(picked);
      }}
    />
  );

  // The server found no exact matches and returned the closest ones
  const closeMatchNote = (meta) =>
    meta?.match === "close" && debouncedQuery ? (
      <p className="text-sm text-text-muted mb-4">
        No exact matches for <span className="text-text">“{debouncedQuery}”</span>. Showing close matches.
      </p>
    ) : null;

  // Nothing in stock for the search: offer an alert for it (Track an
  // item, opened with the search running)
  const noSearchResults = (
    <div className="text-center py-16">
      <p className="text-text-muted text-sm mb-4">
        Nothing in stock matches <span className="text-text">“{debouncedQuery}”</span> right now
      </p>
      {canAlertSearch(debouncedQuery, category) && (
        <Button to={searchAlertPath(debouncedQuery, category, true)} variant="primary" className="mb-4">
          <span className="flex items-center justify-center gap-2">
            <LuBell size={16} /> Alert me when it&apos;s in
          </span>
        </Button>
      )}
      <p>
        <button onClick={() => setBrowseQuery("")} className="text-sm text-text-muted hover:text-text underline">
          Clear search
        </button>
      </p>
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
    <SizeFilter value={selectedSizes} onChange={setSelectedSizes} sizes={categorySizes} mySizes={mySizesHere} />
  );

  return (
    <div className="min-h-screen bg-bg text-text pb-20">
      <DashboardNavbar />
      <BackToTop />

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
          {TABS.filter((t) => !t.comingSoonOnly || storeInfo?.coming_soon).map((t) => (
            <button
              key={t.key}
              onClick={() => changeTab(t.key)}
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
          <AddToHomeScreen />
          {tab === "instock" && (
            <>
              <div className="flex items-center justify-between flex-wrap gap-4 mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <LuLayoutDashboard size={18} className="text-text" />
                  </div>
                  <div>
                    <p className="text-base font-medium">
                      {sizeless ? `${currentLabel} in stock` : `${currentLabel} in your sizes`}
                    </p>
                    {!sizeless && (
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

              {!inStock.loading && closeMatchNote(inStock.meta)}

              {inStock.loading ? (
                <p className="text-text-muted text-sm">Loading...</p>
              ) : inStock.items.length === 0 && debouncedQuery ? (
                noSearchResults
              ) : inStock.items.length === 0 && filtersActive ? (
                noMatches
              ) : inStock.items.length === 0 ? (
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
                    {inStock.items.map((item) => (
                      <CellToggle
                        key={item.id}
                        onClick={() => setSelectedItem(item)}
                      >
                        <ProductCard item={item} onOpen={() => setSelectedItem(item)} />
                      </CellToggle>
                    ))}
                  </ContainerToggle>

                  {inStock.hasMore && <LoadMore onMore={inStock.loadMore} loading={inStock.loadingMore} />}
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
                      {browse.meta
                        ? `${browse.meta.total} in stock right now`
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

              {!browse.loading && closeMatchNote(browse.meta)}

              {browse.loading ? (
                <p className="text-text-muted text-sm">Loading...</p>
              ) : browse.items.length === 0 && debouncedQuery ? (
                noSearchResults
              ) : browse.items.length === 0 && filtersActive ? (
                noMatches
              ) : browse.items.length === 0 ? (
                <div className="text-center py-16">
                  <p className="text-text-muted text-sm">No results found</p>
                </div>
              ) : (
                <>
                  <ContainerToggle>
                    {browse.items.map((item) => (
                      <CellToggle
                        key={item.id}
                        onClick={() => setSelectedItem(item)}
                      >
                        <ProductCard item={item} onOpen={() => setSelectedItem(item)} />
                      </CellToggle>
                    ))}
                  </ContainerToggle>

                  {browse.hasMore && <LoadMore onMore={browse.loadMore} loading={browse.loadingMore} />}
                </>
              )}
            </>
          )}

          {tab === "coming" && storeInfo?.coming_soon && (
            <ComingSoonGrid category={category} signedIn otherName={storeInfo.other_category_name} />
          )}

          {tab === "alerts" && (() => {
            // The selected category's alerts. An alert in a category this
            // store no longer shows appears under every tab, so it's never
            // out of reach.
            const tabbed = new Set(categories.map((c) => c.key));
            const shownAlerts = alerts.filter((a) => (a.category || "sneakers") === category || !tabbed.has(a.category || "sneakers"));
            const label = categoryLabel(category, categories.find((c) => c.key === category)?.name);
            const trackPath = ["sneakers", "clothing"].includes(category) ? `/store/track?category=${category}` : "/store/track";
            return (
            <>
              <div className="flex items-center justify-between flex-wrap gap-4 mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <LuBell size={18} className="text-text" />
                  </div>
                  <div>
                    <p className="text-base font-medium">
                      <span className="text-text font-semibold">
                        {shownAlerts.length}
                      </span>{" "}
                      {shownAlerts.length === 1 ? "item" : "items"} tracked
                      {categories.length > 1 && <span className="text-text-muted"> in {label}</span>}
                    </p>
                    <p className="text-xs text-text-muted">
                      We'll notify you the second they drop
                    </p>
                  </div>
                </div>
                <Link
                  to={trackPath}
                  className="flex items-center gap-2 bg-primary/10 text-text text-sm px-4 py-2.5 rounded-lg hover:bg-primary/15 transition-colors"
                >
                  <LuPlus size={16} /> Track a new item
                </Link>
              </div>

              {loadingAlerts ? (
                <p className="text-text-muted text-sm">Loading...</p>
              ) : shownAlerts.length === 0 ? (
                <div className="text-center py-16">
                  <p className="text-text-muted text-sm mb-4">
                    {categories.length > 1 ? `No ${label} alerts yet` : "No alerts yet"}
                  </p>
                  <Button to={trackPath} variant="primary">Track your first item</Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 items-start">
                  {shownAlerts.map((alert) => (
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
            );
          })()}
          </div>
        </div>
      </div>
    </div>
  );
}
