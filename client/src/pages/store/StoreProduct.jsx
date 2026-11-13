import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { LuBellRing, LuChevronRight, LuShoppingBag, LuCheck } from "react-icons/lu";
import StoreHeader from "../../components/store/StoreHeader.jsx";
import StoreFooter from "../../components/store/StoreFooter.jsx";
import { storeHomePath, useStoreCategories, categoryPath } from "../../lib/storeLinks.js";
import ProductTile from "../../components/store/ProductTile.jsx";
import Button from "../../components/ui/Button.jsx";
import api from "../../lib/api.js";
import { useStoreInfo } from "../../lib/storeInfo.js";
import { useSignedIn } from "../../lib/useSignedIn.js";
import { getSubdomain } from "../../lib/getSubdomain.js";
import { productIdFromParam, productPath, formatPrice } from "../../lib/productPath.js";
import { addToCart, useCart, checkoutPath, MAX_CART_ITEMS } from "../../lib/cart.js";
import { itemConditionLabel } from "../../lib/alertOptions.js";
import { categoryLabel } from "../../lib/categories.js";
import { applyPageMeta as setPageMeta } from "../../lib/pageMeta.js";
import NotFound from "../NotFound.jsx";

// A product's public page (/p/<id>-<name>): photos, sizes, price and
// details, open to everyone and to search engines. Anyone can add to the
// cart; checking out needs an account (lib/cart.js checkoutPath), then
// finishes on the store's own Shopify checkout.

const CONDITION_SCHEMA = {
  brand_new: "https://schema.org/NewCondition",
  sealed: "https://schema.org/NewCondition",
  pre_owned: "https://schema.org/UsedCondition",
};

const shorten = (text, max) => {
  const s = String(text || "").replace(/\s+/g, " ").trim();
  return s.length > max ? `${s.slice(0, max - 1).trimEnd()}…` : s;
};

// A fresh page for each product (photo and size picks start over)
export default function StoreProductPage() {
  const { slug } = useParams();
  const productId = productIdFromParam(slug);
  if (!productId) return <MissingProduct />;
  return <StoreProduct key={productId} productId={productId} />;
}

function MissingProduct() {
  useEffect(() => {
    setPageMeta({ title: "Page not found", description: "", canonical: null, index: false });
  }, []);
  return <NotFound />;
}

function StoreProduct({ productId }) {
  const store = useStoreInfo();
  const categories = useStoreCategories();
  const signedIn = useSignedIn();
  const cart = useCart();

  const [data, setData] = useState(null);
  const [status, setStatus] = useState("loading");
  const [chosenId, setChosenId] = useState(null);
  const [photo, setPhoto] = useState(0);

  useEffect(() => {
    let active = true;
    api
      .get(`/inventory/product/${productId}`)
      .then((res) => {
        if (!active) return;
        setData(res.data.data);
        setStatus("ok");
      })
      .catch(() => active && setStatus("missing"));
    return () => {
      active = false;
    };
  }, [productId]);

  const item = data?.item;
  const storeName = store?.name;
  const canonical = item ? `https://${getSubdomain() || "www"}.syncstock.io${productPath(item)}` : null;

  // Title, description and address for search results and link previews
  useEffect(() => {
    if (!item) return;
    const where = storeName ? ` at ${storeName}` : "";
    const sizesInStock = (data.sizes || []).filter((s) => s.in_stock && s.size).map((s) => s.size);
    const sizeText = sizesInStock.length ? ` Size ${sizesInStock.slice(0, 6).join(", ")} in stock.` : " Sold out.";
    setPageMeta({
      title: `${item.product_name}${storeName ? ` — ${storeName}` : ""}`,
      description: shorten(
        `${item.product_name}${item.price ? `, ${formatPrice(item.price)}` : ""}${where}.${sizeText} Get a restock alert the moment your size is back.`,
        160,
      ),
      canonical,
      index: true,
    });
  }, [item, data, storeName, canonical]);

  if (status === "missing") return <MissingProduct />;

  if (status === "loading" || !item) {
    return (
      <div className="min-h-screen bg-bg text-text">
        <StoreHeader />
        <p className="pt-32 text-center text-sm text-text-muted">Loading...</p>
      </div>
    );
  }

  const chosen = data.sizes.find((s) => s.id === (chosenId || item.id)) || data.sizes[0];
  const inStock = data.sizes.some((s) => s.in_stock);
  const photos = item.image_urls?.length ? item.image_urls : [item.image_url].filter(Boolean);
  const condition = itemConditionLabel(item);
  const alertTarget = `/store/dashboard?item=${chosen?.id || item.id}`;
  const alertLink = signedIn ? alertTarget : `/store/signup?redirect=${encodeURIComponent(alertTarget)}`;
  const inCart = cart.some((c) => c.id === chosen?.id);
  const cartFull = cart.length >= MAX_CART_ITEMS;
  const handleAdd = () => {
    if (!chosen) return;
    addToCart({ ...item, id: chosen.id, size: chosen.size, price: chosen.price ?? item.price });
  };

  const schema = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: item.product_name,
    image: photos.slice(0, 6),
    ...(item.description && { description: shorten(item.description, 1000) }),
    ...(item.sku && { sku: item.sku }),
    ...(item.brand && { brand: { "@type": "Brand", name: item.brand } }),
    ...(item.price && {
      offers: {
        "@type": "Offer",
        url: canonical,
        priceCurrency: "USD",
        price: Number(item.price).toFixed(2),
        availability: inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
        ...(CONDITION_SCHEMA[item.condition] && { itemCondition: CONDITION_SCHEMA[item.condition] }),
        // The same store as its home page's OnlineStore (pages/StoreLanding.jsx)
        ...(storeName && {
          seller: {
            "@type": "OnlineStore",
            name: storeName,
            ...(getSubdomain() && { "@id": `https://${getSubdomain()}.syncstock.io/#store` }),
          },
        }),
      },
    }),
  };
  const site = `https://${getSubdomain() || "www"}.syncstock.io`;
  const breadcrumbs = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { name: storeName || "Store", item: `${site}/` },
      { name: categoryLabel(item.category, store?.other_category_name), item: `${site}${categoryPath(item.category, categories)}` },
      { name: item.product_name, item: canonical },
    ].map((crumb, i) => ({ "@type": "ListItem", position: i + 1, ...crumb })),
  };

  return (
    <div className="min-h-screen bg-bg text-text">
      <StoreHeader storeName={storeName} />

      <main className="pt-24 px-4 md:px-10 max-w-6xl mx-auto">
        <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1 text-xs text-text-muted mb-6">
          <Link to={storeHomePath()} className="hover:text-text">{storeName || "Store"}</Link>
          <LuChevronRight size={12} aria-hidden="true" />
          <Link to="/browse" className="hover:text-text">Shop</Link>
          <LuChevronRight size={12} aria-hidden="true" />
          <Link to={categoryPath(item.category, categories)} className="hover:text-text">
            {categoryLabel(item.category, store?.other_category_name)}
          </Link>
        </nav>

        <div className="grid gap-8 md:grid-cols-2">
          {/* Photos */}
          <div>
            <div className="aspect-square overflow-hidden rounded-2xl border border-border bg-white">
              <img src={photos[photo] || item.image_url} alt={item.product_name} className="h-full w-full object-contain p-6" />
            </div>
            {photos.length > 1 && (
              <div className="mt-3 flex gap-2 overflow-x-auto">
                {photos.map((src, i) => (
                  <button
                    key={src}
                    type="button"
                    onClick={() => setPhoto(i)}
                    aria-label={`Photo ${i + 1}`}
                    aria-pressed={photo === i}
                    className={`h-16 w-16 shrink-0 overflow-hidden rounded-lg border bg-white ${photo === i ? "border-text" : "border-border"}`}
                  >
                    <img src={src} alt="" loading="lazy" className="h-full w-full object-contain p-1" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Details */}
          <div>
            {item.brand && <p className="text-xs font-medium uppercase tracking-wider text-text-muted">{item.brand}</p>}
            <h1 className="mt-1 font-display text-2xl sm:text-3xl font-semibold text-balance">{item.product_name}</h1>
            <p className="mt-3 text-2xl font-semibold">{formatPrice(chosen?.price || item.price)}</p>
            <p className="mt-1 text-sm text-text-muted">
              {[condition, item.sku && `SKU ${item.sku}`].filter(Boolean).join(" · ")}
            </p>

            {data.sizes.some((s) => s.size) && (
              <div className="mt-6">
                <p className="text-sm font-medium mb-2">{inStock ? "Size" : "Sizes (sold out)"}</p>
                <div className="flex flex-wrap gap-2">
                  {data.sizes.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setChosenId(s.id)}
                      aria-pressed={chosen?.id === s.id}
                      className={`rounded-lg border px-3 py-2 text-sm transition-colors ${
                        chosen?.id === s.id ? "border-text bg-text/5 font-medium" : "border-border hover:border-text/40"
                      } ${s.in_stock ? "" : "text-text-muted line-through decoration-text-muted/60"}`}
                    >
                      {s.size || "One size"}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-6 flex flex-col gap-3 sm:max-w-sm">
              {chosen?.in_stock ? (
                inCart ? (
                  <Button to={checkoutPath(signedIn)} rel="nofollow" variant="primary" fullWidth>
                      <span className="flex items-center justify-center gap-2"><LuCheck size={16} /> In your cart · Check out ({cart.length})</span>
                    </Button>
                ) : (
                  <Button variant="primary" fullWidth onClick={handleAdd} disabled={cartFull}>
                    <span className="flex items-center justify-center gap-2"><LuShoppingBag size={16} /> {cartFull ? `Cart full (${MAX_CART_ITEMS} items)` : "Add to cart"}</span>
                  </Button>
                )
              ) : (
                <p className="rounded-lg bg-text/5 px-4 py-3 text-sm text-text-muted">
                  {chosen?.size ? `Size ${chosen.size} is sold out.` : "Sold out."} Get an alert and you'll hear the moment it's back.
                </p>
              )}
              <Button to={alertLink} rel="nofollow" variant={chosen?.in_stock ? "secondary" : "primary"} fullWidth>
                  <span className="flex items-center justify-center gap-2"><LuBellRing size={16} /> Get an alert for your size</span>
                </Button>
              {signedIn === false && (
                <p className="text-xs text-text-muted">
                  You'll make a free account at checkout. It also saves your sizes, so you hear about restocks and price drops by email or push.
                </p>
              )}
            </div>

            {item.description && (
              <div className="mt-8 border-t border-border pt-6">
                <h2 className="text-sm font-semibold mb-2">Details</h2>
                <p className="text-sm text-text-muted leading-relaxed whitespace-pre-line">{item.description}</p>
              </div>
            )}
          </div>
        </div>

        {/* The same item in other sizes (stores that list each pair on its own) */}
        {data.others?.length > 0 && (
          <section className="mt-14">
            <h2 className="font-display text-xl font-semibold mb-4">Other sizes in stock</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
              {data.others.map((other) => (
                <ProductTile key={other.id} item={other} />
              ))}
            </div>
          </section>
        )}

        <div className="mt-14 text-center">
          <Link to={categoryPath(item.category, categories)} className="text-sm text-text-muted hover:text-text underline">
            Browse more {categoryLabel(item.category, store?.other_category_name).toLowerCase()} at {storeName || "this store"}
          </Link>
        </div>

        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema).replace(/</g, "\\u003c") }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs).replace(/</g, "\\u003c") }} />
      </main>
      <div className="mt-20">
        <StoreFooter storeName={storeName} />
      </div>
    </div>
  );
}
