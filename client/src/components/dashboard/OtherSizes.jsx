import { useEffect, useState } from "react";
import { LuBell, LuChevronDown } from "react-icons/lu";
import Button from "../ui/Button.jsx";
import Spinner from "../ui/Spinner.jsx";
import api from "../../lib/api.js";
import { SIZES_BY_CATEGORY } from "../../lib/categories.js";

// "Need a different size?" in the product popup. Shows every size for
// this product: ones in stock open that listing; any other size can get
// an alert, so a shopper who finds a shoe in the wrong size can still
// track it in theirs.
export default function OtherSizes({ item, alerts = [], onOpenItem, onAlertCreated }) {
  const allSizes = SIZES_BY_CATEGORY[item.category] || [];
  const [open, setOpen] = useState(false);
  const [inStock, setInStock] = useState(null); // size -> inventory id
  const [picked, setPicked] = useState(null);
  const [saving, setSaving] = useState(false);
  const [justAlerted, setJustAlerted] = useState([]);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!open || inStock) return;
    api
      .get(`/inventory/${item.id}/sizes`)
      .then((res) => {
        const bySize = {};
        for (const variant of res.data.data || []) {
          // Prefer the listing in the same condition as the one open
          if (!bySize[variant.size] || variant.condition === item.condition) {
            bySize[variant.size] = variant.id;
          }
        }
        setInStock(bySize);
      })
      .catch(() => setInStock({}));
  }, [open, inStock, item.id, item.condition]);

  if (allSizes.length === 0 || !item.size) return null;

  const name = item.product_name.toLowerCase();
  const alerted = new Set([
    ...alerts
      .filter((a) => a.active && a.product_name?.toLowerCase() === name)
      .map((a) => a.size),
    ...justAlerted,
  ]);

  const handleAlert = async () => {
    setSaving(true);
    setMessage("");
    try {
      await api.post("/alerts", {
        product_name: item.product_name,
        category: item.category,
        size: picked,
        sku: item.sku || null,
        image_url: item.image_urls?.[0] || item.image_url || null,
        notify_email: true,
        notify_inapp: true,
      });
      setMessage(`Alert set — we'll let you know when size ${picked} lands.`);
      onAlertCreated?.();
    } catch (err) {
      // Already tracking this size counts as done, not an error
      if (!err.response?.data?.message?.includes("already")) {
        setMessage("Couldn't set that alert. Try again.");
        setSaving(false);
        return;
      }
      setMessage(`You're already tracking size ${picked}.`);
    }
    setJustAlerted((prev) => [...prev, picked]);
    setPicked(null);
    setSaving(false);
  };

  return (
    <div className="mt-5 border-t border-border pt-4">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center justify-between text-sm text-text"
      >
        <span>Need a different size?</span>
        <LuChevronDown
          size={16}
          className={`text-text-muted transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="mt-3">
          {inStock === null ? (
            <div className="flex justify-center py-4">
              <Spinner size={18} />
            </div>
          ) : (
            <>
              <p className="text-xs text-text-muted mb-3">
                Sizes in stock open that listing. Pick any other size to get an alert when it lands.
              </p>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {allSizes.map((size) => {
                  const current = size === item.size;
                  const stockId = inStock[size];
                  const hasAlert = alerted.has(size);
                  const selected = picked === size;
                  return (
                    <button
                      key={size}
                      disabled={current || (hasAlert && !stockId)}
                      onClick={() => {
                        setMessage("");
                        if (stockId) onOpenItem?.(stockId);
                        else setPicked(selected ? null : size);
                      }}
                      className={`flex flex-col items-center rounded-lg border px-1 py-2 text-xs transition-colors ${
                        current
                          ? "border-text/40 bg-text/5 text-text"
                          : selected
                            ? "border-primary bg-primary/10 text-text"
                            : "border-border text-text hover:border-text/30 disabled:text-text-muted disabled:hover:border-border"
                      }`}
                    >
                      <span className="font-medium">{size}</span>
                      <span
                        className={`mt-0.5 flex items-center gap-1 text-[10px] ${stockId && !current ? "text-live" : "text-text-muted"}`}
                      >
                        {current ? (
                          "Viewing"
                        ) : stockId ? (
                          "In stock"
                        ) : hasAlert ? (
                          <>
                            <LuBell size={10} /> Alert on
                          </>
                        ) : (
                          " "
                        )}
                      </span>
                    </button>
                  );
                })}
              </div>

              {picked && (
                <Button
                  variant="primary"
                  fullWidth
                  className="mt-3"
                  disabled={saving}
                  onClick={handleAlert}
                >
                  {saving ? (
                    <Spinner size={18} />
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      <LuBell size={16} /> Alert me when size {picked} is in
                    </span>
                  )}
                </Button>
              )}
              {message && <p className="mt-3 text-center text-xs text-live">{message}</p>}
            </>
          )}
        </div>
      )}
    </div>
  );
}
