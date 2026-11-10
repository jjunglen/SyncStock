import { Link } from "react-router-dom";
import { productPath, formatPrice } from "../../lib/productPath.js";

// A product on the store's public pages (home, Browse): photo, size,
// name and price, linking to the product's own page (/p/…), so shoppers
// and search engines can reach every product without an account
export default function ProductTile({ item, className = "" }) {
  return (
    <Link
      to={productPath(item)}
      className={`group block overflow-hidden rounded-xl border border-border bg-linear-to-b from-card to-card-end hover:border-text/20 transition-colors ${className}`}
    >
      <div className="relative h-32 sm:h-40 bg-white">
        <img
          src={item.image_url}
          alt={item.product_name}
          loading="lazy"
          className="h-full w-full object-contain p-3 transition-transform duration-300 group-hover:scale-[1.03]"
        />
        {item.size && (
          <span className="absolute top-2 right-2 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-medium text-white">
            {item.size}
          </span>
        )}
      </div>
      <div className="p-3">
        <p className="text-xs font-medium truncate">{item.product_name}</p>
        <p className="text-sm font-semibold mt-1">{formatPrice(item.price)}</p>
      </div>
    </Link>
  );
}
