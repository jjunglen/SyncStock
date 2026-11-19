import { Link } from "react-router-dom";
import { productPath, formatPrice } from "../../lib/productPath.js";
import TrackButton from "./TrackButton.jsx";

// A product on the store's public pages (home, Browse): photo, size,
// name and price, linking to the product's own page (/p/…), so shoppers
// and search engines can reach every product without an account.
// Photos are square (stores shoot 500x500), shown whole on white.
// Pass signedIn (from useSignedIn) to add the one-tap Track bell; the
// moving strip on the home page leaves it out.
export default function ProductTile({ item, className = "", signedIn }) {
  return (
    <div
      className={`group relative overflow-hidden rounded-xl border border-border bg-linear-to-b from-card to-card-end hover:border-text/20 transition-colors ${className}`}
    >
      <Link to={productPath(item)} className="block">
        <div className="relative aspect-square bg-white">
          <img
            src={item.image_url}
            alt={item.product_name}
            loading="lazy"
            className="h-full w-full object-contain p-1 transition-transform duration-300 group-hover:scale-[1.03]"
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
      {signedIn !== undefined && item.shopify_product_id && (
        // Over the photo's top-left corner (a box the photo's size; the size
        // badge is top-right),
        // outside the link so a tap tracks instead of opening the product
        <div className="pointer-events-none absolute inset-x-0 top-0 aspect-square">
          <TrackButton item={item} signedIn={signedIn} className="pointer-events-auto absolute top-2 left-2" />
        </div>
      )}
    </div>
  );
}
