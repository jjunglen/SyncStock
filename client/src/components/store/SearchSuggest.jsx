import { useEffect, useId, useState } from "react";
import { LuSearch, LuTag } from "react-icons/lu";
import api from "../../lib/api.js";

// The store's search box, with suggestions while typing: matching product
// names and brands from what's listed (GET /inventory/suggest). Picking a
// product searches for it; picking a brand hands it to onPickBrand (the
// page's brand filter). Arrow keys move through the list, Enter picks,
// Escape closes. The page still searches as the shopper types, as before.

// Shopify's image server resizes: a small thumbnail for the list
const thumbnail = (url) =>
  url && url.includes("cdn.shopify.com") ? `${url}${url.includes("?") ? "&" : "?"}width=96` : url;

const DELAY_MS = 200;

export default function SearchSuggest({ value, onChange, onPickBrand, category, placeholder }) {
  const [suggestions, setSuggestions] = useState({ products: [], brands: [] });
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  // The text a suggestion just filled in: no suggestions for it
  const [picked, setPicked] = useState(null);
  const listId = useId();

  const q = value.trim();
  const wanted = q.replace(/[^a-z0-9]/gi, "").length >= 2 && q !== picked;

  useEffect(() => {
    if (!wanted) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      const params = new URLSearchParams({ q });
      if (category) params.set("category", category);
      api
        .get(`/inventory/suggest?${params.toString()}`, { signal: controller.signal })
        .then((res) => {
          setSuggestions(res.data.data || { products: [], brands: [] });
          setActive(-1);
        })
        .catch(() => {});
    }, DELAY_MS);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [q, wanted, category]);

  // One list: brands first (a whole brand is the broader pick), then products
  const options = [
    ...(onPickBrand ? suggestions.brands.map((b) => ({ kind: "brand", label: b.brand, count: b.count })) : []),
    ...suggestions.products.map((p) => ({ kind: "product", label: p.name, image: p.image_url })),
  ];
  const showing = open && wanted && options.length > 0;

  const pick = (option) => {
    setOpen(false);
    setActive(-1);
    if (option.kind === "brand") {
      onPickBrand(option.label);
    } else {
      setPicked(option.label);
      onChange(option.label);
    }
  };

  const onKeyDown = (e) => {
    if (e.key === "Escape") {
      setOpen(false);
      return;
    }
    if (!wanted || !options.length) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setActive((i) => (i + 1) % options.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => (i <= 0 ? options.length - 1 : i - 1));
    } else if (e.key === "Enter" && showing && active >= 0) {
      e.preventDefault();
      pick(options[active]);
    }
  };

  return (
    <div className="relative flex-1 min-w-[200px]">
      <LuSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={16} aria-hidden="true" />
      <input
        type="search"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={showing}
        aria-controls={listId}
        aria-activedescendant={showing && active >= 0 ? `${listId}-${active}` : undefined}
        autoComplete="off"
        value={value}
        onChange={(e) => {
          setPicked(null);
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        aria-label="Search"
        className="w-full bg-surface border border-border rounded-lg pl-9 pr-4 py-2.5 text-sm text-text placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-text/10"
      />
      {showing && (
        <ul
          id={listId}
          role="listbox"
          aria-label="Suggestions"
          // At least as wide as the box, wider when it's narrow, so names fit
          className="absolute left-0 top-full mt-1 z-30 min-w-full w-[26rem] max-w-[calc(100vw-2rem)] bg-surface border border-border rounded-lg shadow-lg py-1 max-h-[26rem] overflow-y-auto"
        >
          {options.map((option, i) => (
            <li
              key={`${option.kind}-${option.label}`}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === active}
              // Before the box loses focus, so the pick still lands
              onMouseDown={(e) => {
                e.preventDefault();
                pick(option);
              }}
              onMouseEnter={() => setActive(i)}
              className={`flex items-center gap-3 px-3 py-2 text-sm cursor-pointer ${
                i === active ? "bg-text/5 text-text" : "text-text-muted"
              }`}
            >
              {option.kind === "brand" ? (
                <>
                  <span className="w-8 h-8 shrink-0 rounded-md bg-text/5 flex items-center justify-center">
                    <LuTag size={14} aria-hidden="true" />
                  </span>
                  <span className="truncate">
                    <span className="text-text">{option.label}</span> · all {option.count} in stock
                  </span>
                </>
              ) : (
                <>
                  {option.image ? (
                    <img src={thumbnail(option.image)} alt="" className="w-8 h-8 shrink-0 rounded-md object-cover bg-white" />
                  ) : (
                    <span className="w-8 h-8 shrink-0 rounded-md bg-text/5" />
                  )}
                  <span className="truncate text-text">{option.label}</span>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
