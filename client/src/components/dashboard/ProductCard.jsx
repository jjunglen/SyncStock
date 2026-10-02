import { useState } from "react";
import { LuInfo, LuX } from "react-icons/lu";
import { useLayout } from "../ui/AnimatedToggleLayout.jsx";

function conditionLabel(condition) {
  if (condition === "brand_new") return "Brand New";
  if (condition === "pre_owned") return "Pre-Owned";
  return null;
}

// Clicks on the card open the product; these stay inside the card
const keepInCard = (e) => e.stopPropagation();

// "Details" button — only when the product has a Shopify description
function DetailsButton({ open, onToggle, large }) {
  return (
    <button
      type="button"
      onClick={(e) => {
        keepInCard(e);
        onToggle();
      }}
      aria-expanded={open}
      className={`inline-flex items-center gap-1 rounded-lg font-medium transition-colors ${
        large
          ? "text-base px-3 py-1.5 bg-neutral-100 text-neutral-600 hover:text-neutral-900"
          : "text-xs px-2.5 py-1 bg-text/5 text-text-muted hover:text-text"
      }`}
    >
      <LuInfo size={large ? 16 : 13} aria-hidden="true" />
      Details
    </button>
  );
}

// Slides up over the card with the product's description from Shopify
function DetailsPanel({ item, open, onClose }) {
  return (
    <div
      onClick={keepInCard}
      aria-hidden={!open}
      className={`absolute inset-0 z-10 flex flex-col bg-surface/95 backdrop-blur-sm text-text transition-transform duration-300 ease-out ${
        open ? "translate-y-0" : "translate-y-full pointer-events-none"
      }`}
    >
      <div className="flex items-start justify-between gap-2 px-3 pt-3 pb-2 border-b border-border">
        <p className="text-xs font-semibold leading-tight line-clamp-2">{item.product_name}</p>
        <button
          type="button"
          onClick={(e) => {
            keepInCard(e);
            onClose();
          }}
          tabIndex={open ? 0 : -1}
          aria-label="Close details"
          className="shrink-0 p-1 -m-1 text-text-muted hover:text-text"
        >
          <LuX size={16} />
        </button>
      </div>
      <p className="flex-1 overflow-y-auto px-3 py-2.5 text-sm leading-relaxed whitespace-pre-line">
        {item.description}
      </p>
    </div>
  );
}

export default function ProductCard({ item }) {
  const layout = useLayout();
  const [detailsOpen, setDetailsOpen] = useState(false);
  const hasDetails = !!item.description;
  const toggleDetails = () => setDetailsOpen((open) => !open);

  if (layout === "list") {
    return (
      <div className="relative">
        <div className="relative w-full aspect-[4/3] md:aspect-[2/1] bg-white overflow-hidden">
          {item.image_url ? (
            <img
              src={item.image_url}
              alt={item.product_name}
              className="w-full h-full object-contain p-6 md:p-10 transition-transform duration-300 group-hover:scale-[1.03]"
            />
          ) : (
            <div className="w-full h-full bg-neutral-200" />
          )}
          {conditionLabel(item.condition) && (
            <span
              className={`absolute top-3 left-3 text-base font-medium px-2.5 py-1 rounded-full ${item.condition === "brand_new" ? "bg-accent text-accent-text" : "bg-black/70 text-white"}`}
            >
              {conditionLabel(item.condition)}
            </span>
          )}
          {item.size && (
            <span className="absolute top-3 right-3 text-base px-2.5 py-1 rounded-full font-medium bg-black/70 text-white">
            {item.size}
          </span>
          )}
        </div>
        <div className="flex items-center justify-between gap-4 bg-white px-4 py-3">
          <p className="text-lg text-neutral-500 truncate">
            {item.product_name}
          </p>
          <div className="flex items-center gap-3 shrink-0">
            {hasDetails && <DetailsButton open={detailsOpen} onToggle={toggleDetails} large />}
            <span className="text-lg font-medium text-neutral-900">
              ${parseFloat(item.price).toFixed(0)}
            </span>
          </div>
        </div>
        {hasDetails && <DetailsPanel item={item} open={detailsOpen} onClose={() => setDetailsOpen(false)} />}
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="relative w-full h-44 md:h-52 bg-white rounded-t-xl overflow-hidden">
        {item.image_url ? (
          <img
            src={item.image_url}
            alt={item.product_name}
            className="w-full h-full object-contain p-2"
          />
        ) : (
          <div className="w-full h-full bg-surface-muted" />
        )}
        {conditionLabel(item.condition) && (
          <span
            className={`absolute top-2 left-2 text-[10px] font-medium px-2 py-0.5 rounded-full ${item.condition === "brand_new" ? "bg-accent text-accent-text" : "bg-black/60 text-white"}`}
          >
            {conditionLabel(item.condition)}
          </span>
        )}
        {item.size && (
          <span className="absolute top-2 right-2 text-[10px] px-2 py-0.5 rounded-full font-medium bg-black/60 text-white">
          {item.size}
        </span>
        )}
      </div>
      <div className="p-3">
        <p className="text-xs md:text-sm font-medium text-text leading-tight line-clamp-2 mb-2 min-h-[2.5rem]">
          {item.product_name}
        </p>
        <div className="flex items-center justify-between gap-2">
          <span className="text-lg font-semibold text-text">
            ${parseFloat(item.price).toFixed(0)}
          </span>
          {hasDetails ? (
            <DetailsButton open={detailsOpen} onToggle={toggleDetails} />
          ) : (
            <span className="text-xs font-medium bg-text/5 text-text-muted px-2.5 py-1 rounded-lg">
              View →
            </span>
          )}
        </div>
      </div>
      {hasDetails && <DetailsPanel item={item} open={detailsOpen} onClose={() => setDetailsOpen(false)} />}
    </div>
  );
}
