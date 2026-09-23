import { useState, useEffect } from "react";
import { LuX, LuExternalLink, LuBell } from "react-icons/lu";
import Button from "../ui/Button";
import Spinner from "../ui/Spinner";
import api from "../../lib/api";

function conditionalLabel(condition) {
    if (condition === "brand_new") return "Brand New";
    if (condition === "pre_owned") return "Pre-Owned";

    return null;

}

export default function ProductModal({ item, onClose, onAlertCreated }) {
    const [isSubmittingAlert, setIsSubmittingAlert ] = useState(null);
    const [alertSet, setAlertSet] = useState(false);

    useEffect(() => {
        const handleEsc = (event) => event.key === "Escape" && onClose();
        windown.addEventListener("keydown", handleEsc);
        return () => window.removeEventListener("keydown", handleEsc);

    }, [onClose]);

    const isInStock = item.available > 0;

    const handleBuyNow = () => {
        const params = new URLSearchParams({ inventory_id: item.id });
        window.open(`${import.meta.env.VITE_API_URL || "http://localhost:5000/api"}/redirect?${params.toString()}`, "_blank");
    }

    const handleSetAlert = async () => {
        setIsSubmittingAlert(true);
        try {
            await api.post("/alerts", {
            product_name: item.product_name,
            size: item.size,
            sku: item.sku || null,
            notify_email: true,
            notify_inapp: true,
            });
            setAlertSet(true);
            onAlertCreated?.();
        } catch (err) {
            console.error("Failed to create alert:", err);
        } finally {
            setIsSubmittingAlert(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-0 md:p-4">
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-surface border border-border rounded-t-2xl md:rounded-2xl w-full md:max-w-lg max-h-[92vh] flex flex-col z-10 overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
                <p className="text-sm font-medium text-text truncate pr-4">{item.product_name}</p>
                <button onClick={onClose} className="text-text-muted hover:text-text shrink-0">
                    <LuX size={22} />
                </button>
                </div>

                <div className="overflow-y-auto flex-1">
                <div className="bg-white h-64 md:h-72 flex items-center justify-center">
                    {item.image_url ? (
                    <img src={item.image_url} alt={item.product_name} className="w-full h-full object-contain p-4" />
                    ) : (
                    <div className="w-full h-full bg-surface-muted" />
                    )}
                </div>

                <div className="p-5">
                    <div className="flex gap-2 flex-wrap mb-3">
                    {conditionLabel(item.condition) && (
                        <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-white/5 text-text-muted">
                        {conditionLabel(item.condition)}
                        </span>
                    )}
                    <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-surface-muted text-text">{item.size}</span>
                    {!isInStock && (
                        <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-warn/10 text-warn">Not in stock</span>
                    )}
                    </div>

                    <h2 className="text-base md:text-lg font-semibold text-text mb-1">{item.product_name}</h2>
                    {item.sku && <p className="text-xs text-text-muted mb-4">{item.sku}</p>}

                    <p className="text-2xl font-bold text-text mb-5">${parseFloat(item.price).toFixed(0)}</p>

                    {isInStock ? (
                    <>
                        <Button variant="primary" fullWidth onClick={handleBuyNow}>
                        <span className="flex items-center justify-center gap-2">
                            Buy now <LuExternalLink size={16} />
                        </span>
                        </Button>
                        <p className="text-xs text-text-muted text-center mt-3">
                        You'll be redirected to complete your purchase
                        </p>
                    </>
                    ) : alertSet ? (
                    <div className="text-center py-2">
                        <p className="text-sm text-live font-medium">Alert set — we'll notify you when it's back</p>
                    </div>
                    ) : (
                    <Button variant="primary" fullWidth disabled={isSubmittingAlert} onClick={handleSetAlert}>
                        <span className="flex items-center justify-center gap-2">
                        {isSubmittingAlert ? <Spinner size={18} /> : <><LuBell size={16} /> Set alert for this size</>}
                        </span>
                    </Button>
                    )}
                </div>
                </div>
            </div>
        </div>
    )
}