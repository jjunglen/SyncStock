import { useEffect, useState } from "react";
import { LuX, LuTrash2, LuShoppingBag } from "react-icons/lu";
import Button from "../ui/Button.jsx";
import Spinner from "../ui/Spinner.jsx";
import api from "../../lib/api.js";
import { useCart, removeFromCart, clearCart } from "../../lib/cart.js";

// Slide-over cart. Checkout asks the server for one Shopify cart link
// with every item (each tagged, so each sale counts); if something sold
// out meanwhile, it's removed here and the shopper checks again.
export default function CartDrawer({ open, onClose, storeName }) {
  const items = useCart();
  const [checkingOut, setCheckingOut] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (!open) return;
    const handleEsc = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [open, onClose]);

  // A notice is about the last checkout attempt — clear it on reopen
  useEffect(() => {
    if (open) setNotice("");
  }, [open]);

  if (!open) return null;

  const total = items.reduce((sum, i) => sum + (parseFloat(i.price) || 0), 0);

  const handleCheckout = async () => {
    setCheckingOut(true);
    setNotice("");
    try {
      const res = await api.post("/redirect/cart", {
        inventory_ids: items.map((i) => i.id),
      });
      const { url, unavailable } = res.data.data;
      if (url) {
        // Shopify has the items now — this cart's job is done
        clearCart();
        window.location.assign(url);
        return;
      }
      const gone = items.filter((i) => unavailable.includes(i.id));
      removeFromCart(unavailable);
      setNotice(
        gone.length === 1
          ? `${gone[0].product_name} just sold out, so we took it out. Check your cart and try again.`
          : `${gone.length} items just sold out, so we took them out. Check your cart and try again.`,
      );
    } catch (err) {
      setNotice(err.response?.data?.message || "Couldn't start checkout. Try again in a moment.");
    }
    setCheckingOut(false);
  };

  return (
    <div className="fixed inset-0 z-[60] flex justify-end">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <aside
        role="dialog"
        aria-label="Your cart"
        className="relative z-10 flex h-full w-full max-w-md flex-col border-l border-border bg-surface"
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-4 shrink-0">
          <p className="text-sm font-medium text-text">
            Your cart{items.length > 0 ? ` (${items.length})` : ""}
          </p>
          <button onClick={onClose} className="text-text-muted hover:text-text" aria-label="Close cart">
            <LuX size={22} />
          </button>
        </div>

        {items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
            <LuShoppingBag size={28} className="text-text-muted" aria-hidden="true" />
            <p className="text-sm text-text-muted">
              {notice || "Your cart is empty. Add items from any product to check out together."}
            </p>
          </div>
        ) : (
          <>
            <ul className="flex-1 divide-y divide-border overflow-y-auto">
              {items.map((item) => (
                <li key={item.id} className="flex items-center gap-3 px-5 py-3">
                  <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-white">
                    {item.image_url && (
                      <img src={item.image_url} alt="" className="h-full w-full object-contain p-1" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-text">{item.product_name}</p>
                    <p className="text-xs text-text-muted">
                      {[item.size, item.price && `$${parseFloat(item.price).toFixed(0)}`]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </div>
                  <button
                    onClick={() => removeFromCart(item.id)}
                    className="shrink-0 p-1 text-text-muted transition-colors hover:text-danger"
                    aria-label={`Remove ${item.product_name}`}
                  >
                    <LuTrash2 size={18} />
                  </button>
                </li>
              ))}
            </ul>

            <div className="space-y-3 border-t border-border px-5 py-4 shrink-0">
              {notice && <p className="text-xs text-warn">{notice}</p>}
              <div className="flex items-center justify-between text-sm">
                <span className="text-text-muted">Subtotal</span>
                <span className="font-semibold text-text">${total.toFixed(0)}</span>
              </div>
              <Button variant="primary" fullWidth disabled={checkingOut} onClick={handleCheckout}>
                {checkingOut ? <Spinner size={18} /> : `Checkout on ${storeName || "the store"}`}
              </Button>
              <p className="text-center text-xs text-text-muted">
                Stock is checked again, then you'll finish on {storeName || "the store"}'s checkout.
              </p>
            </div>
          </>
        )}
      </aside>
    </div>
  );
}
