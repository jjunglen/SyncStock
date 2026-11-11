import { LuRuler, LuBellRing, LuLayers, LuMail } from "react-icons/lu";
import Section from "./Section.jsx";
import ProductCard from "../dashboard/ProductCard.jsx";
import AlertCard from "../dashboard/AlertCard.jsx";

// "What your shoppers see": the real shopper components (the In stock
// grid, an alert, the restock email) drawn with sample data, so it always
// matches the product. Can't be clicked (inert) and fetches nothing.

const IMG = {
  bapeWhite: "https://cdn.shopify.com/s/files/1/0702/0399/8482/files/1c0031e3-575e-4f89-b01b-cf612f1dec6d.png?v=1793138362",
  j4: "https://cdn.shopify.com/s/files/1/0702/0399/8482/files/cc4be9aa-763a-4fc1-a0b9-4c6bb56504ca.png?v=1792791332",
  yeezyBlackRed: "https://cdn.shopify.com/s/files/1/0702/0399/8482/files/4af84fca-40d9-46f9-838d-e91df7d7a59e.png?v=1793400929",
  etb: "https://cdn.shopify.com/s/files/1/0702/0399/8482/files/bd77c45c-d20e-4d96-98e1-21ca450d985b.webp?v=1793462899",
};

const ITEMS = [
  { id: 1, product_name: "A Bathing Ape Bape Sta Low Crazy White", price: "325.00", size: "10M/11.5W", condition: "brand_new", image_url: IMG.bapeWhite },
  { id: 2, product_name: "adidas Yeezy Boost 350 V2 Black Red", price: "185.00", size: "10M/11.5W", condition: "pre_owned", image_url: IMG.yeezyBlackRed },
  { id: 3, product_name: "Pokémon 30th Celebration Elite Trainer Box", price: "140.00", condition: "sealed", image_url: IMG.etb },
];

const ALERT = {
  id: "sample",
  product_name: "Air Jordan 4 Retro OG SP Nigel Sylvester",
  image_url: IMG.j4,
  size: "10M/11.5W",
  active: true,
  category: "sneakers",
  condition_preference: "brand_new",
  max_price: "900",
};

const POINTS = [
  {
    icon: LuRuler,
    title: "Their size, in stock",
    text: "Shoppers save their sizes once. Their home page shows only what's in stock in those sizes — sneakers, clothing and trading cards.",
  },
  {
    icon: LuBellRing,
    title: "Alerts the moment it lands",
    text: "They track sold-out items and get an email or push notification the second it's back in their size, with a link straight to checkout.",
  },
  {
    icon: LuLayers,
    title: "Your store, your brand",
    text: "Every store gets its own shopper site at yourstore.syncstock.io, in your logo and colors, with checkout on your Shopify store.",
  },
];

export default function ShopperPreviewSection() {
  return (
    <Section id="shoppers">
      <div className="max-w-6xl mx-auto">
        <div className="max-w-2xl mx-auto text-center">
          <p className="text-xs font-medium uppercase tracking-wider text-text-muted">For your shoppers</p>
          <h2 className="mt-3 font-display text-3xl font-semibold sm:text-5xl text-balance">What your shoppers see</h2>
          <p className="mt-4 text-base sm:text-lg text-text-muted text-balance">
            Your customers get a fast, simple site that knows their size and tells them the moment the item they want is back.
          </p>
        </div>

        <div
          inert
          role="img"
          aria-label="Preview of a store's shopper site with sample items: items in the shopper's size, a restock alert and the back-in-stock email"
          className="mt-10 sm:mt-14 grid gap-4 lg:grid-cols-[1fr_320px] select-none"
        >
          {/* The shopper's In stock tab */}
          <div className="rounded-2xl bg-border/50 p-2">
            <div className="overflow-hidden rounded-xl border border-border bg-bg">
              <div className="flex items-center gap-2 border-b border-border bg-surface px-4 py-2.5">
                {["bg-danger/70", "bg-warn/70", "bg-live/70"].map((c) => (
                  <span key={c} className={`h-2.5 w-2.5 rounded-full ${c}`} />
                ))}
                <span className="ml-3 truncate rounded-md border border-border bg-bg px-3 py-1 text-xs text-text-muted">
                  yourstore.syncstock.io
                </span>
                <span className="ml-auto shrink-0 rounded-full border border-border px-2.5 py-0.5 text-[11px] font-medium text-text-muted">
                  Sample data
                </span>
              </div>
              <div className="p-4 sm:p-6 text-left">
                <p className="text-lg font-semibold">In stock in your sizes</p>
                <div className="mt-2 mb-4 flex flex-wrap gap-2">
                  {["10M/11.5W", "L"].map((s) => (
                    <span key={s} className="rounded-full border border-border px-3 py-1 text-xs">
                      {s}
                    </span>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {ITEMS.map((item, i) => (
                    <div key={item.id} className={`overflow-hidden rounded-xl border border-border bg-surface ${i === 2 ? "hidden sm:block" : ""}`}>
                      <ProductCard item={item} />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* An alert and the email it sends */}
          <div className="flex flex-col gap-4 text-left">
            <AlertCard alert={ALERT} onDelete={() => {}} onUpdated={() => {}} />
            <div className="rounded-xl border border-border bg-surface p-4">
              <p className="flex items-center gap-2 text-xs text-text-muted">
                <LuMail size={14} aria-hidden="true" /> Your Store · just now
              </p>
              <p className="mt-2 text-[11px] font-semibold uppercase tracking-wider text-live">Back in stock · your size</p>
              <p className="mt-1 text-sm font-semibold leading-snug">Air Jordan 4 Nigel Sylvester is back in 10M</p>
              <div className="mt-3 rounded-lg bg-primary py-2 text-center text-sm font-semibold text-primary-text">Shop now</div>
            </div>
          </div>
        </div>

        <div className="mt-10 sm:mt-14 grid gap-8 sm:grid-cols-3 text-center">
          {POINTS.map(({ icon: Icon, title, text }) => (
            <div key={title} className="flex flex-col items-center">
              <Icon size={20} className="text-text" aria-hidden="true" />
              <h3 className="mt-3 text-base font-semibold">{title}</h3>
              <p className="mt-1 max-w-xs text-sm text-text-muted">{text}</p>
            </div>
          ))}
        </div>
      </div>
    </Section>
  );
}
