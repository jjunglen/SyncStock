import { LuQrCode, LuInstagram, LuHandCoins, LuMail, LuShoppingBag, LuBellRing } from "react-icons/lu";
import Section from "./Section.jsx";
import InStoreSign from "../store/InStoreSign.jsx";
import BetaBadge from "../ui/BetaBadge.jsx";

// "More ways to grow": five features beyond alerts, each with a small
// picture of the real thing, drawn with sample data (Store settings has
// the working versions). Inert: nothing here can be clicked.

const IMG = {
  bape: "https://cdn.shopify.com/s/files/1/0702/0399/8482/files/1c0031e3-575e-4f89-b01b-cf612f1dec6d.png?v=1793138362",
  j4: "https://cdn.shopify.com/s/files/1/0702/0399/8482/files/cc4be9aa-763a-4fc1-a0b9-4c6bb56504ca.png?v=1792791332",
};

function Card({ icon: Icon, title, beta, text, children, className = "" }) {
  return (
    <div className={`flex flex-col overflow-hidden rounded-2xl border border-border bg-surface ${className}`}>
      <div inert aria-hidden="true" className="flex min-h-56 items-center justify-center bg-bg/60 p-5 select-none">
        {children}
      </div>
      <div className="border-t border-border p-5">
        <h3 className="flex items-center gap-2 text-base font-semibold">
          <Icon size={18} aria-hidden="true" /> {title} {beta && <BetaBadge />}
        </h3>
        <p className="mt-2 text-sm text-text-muted">{text}</p>
      </div>
    </div>
  );
}

// A new-arrival story: photo, then the size and price in label boxes
function StoryPreview({ image, label, rotate }) {
  return (
    <div
      className="flex h-56 w-32 shrink-0 flex-col items-center justify-center gap-3 rounded-xl bg-white px-3 shadow-lg"
      style={{ transform: `rotate(${rotate}deg)` }}
    >
      <img src={image} alt="" className="w-full object-contain" />
      <span className="rounded-md bg-neutral-950 px-2 py-1 text-[10px] font-bold text-white">{label}</span>
      <span className="text-[8px] font-medium uppercase tracking-wider text-neutral-500">Link in sticker</span>
    </div>
  );
}

export default function MoreWaysSection() {
  return (
    <Section id="more">
      <div className="max-w-6xl mx-auto">
        <div className="max-w-2xl mx-auto text-center">
          <p className="text-xs font-medium uppercase tracking-wider text-text-muted">Beyond alerts</p>
          <h2 className="mt-3 font-display text-3xl font-semibold sm:text-5xl text-balance">More ways to grow</h2>
          <p className="mt-4 text-base sm:text-lg text-text-muted text-balance">
            Bring in walk-in shoppers, post every drop, buy inventory from your customers, and restock what's wanted — all from one app.
          </p>
        </div>

        <div className="mt-12 grid gap-4 md:grid-cols-2">
          <Card
            icon={LuQrCode}
            title="In-store QR sign"
            text="A printable 4×6 counter card in your branding. Walk-in shoppers scan it, save their sizes, and get alerts — and you see in-store sign-ups on your dashboard."
          >
            <div className="h-48 w-32 overflow-hidden rounded-lg shadow-lg">
              <div style={{ transform: "scale(0.333)", transformOrigin: "top left" }}>
                <InStoreSign name="Your Store" subdomain="yourstore" />
              </div>
            </div>
          </Card>

          <Card
            icon={LuInstagram}
            title="Instagram stories, made for you"
            text="Every new arrival becomes a ready-to-post 1080×1920 story, emailed with each item's link for the link sticker. Pick your colors and font once."
          >
            <div className="flex items-center gap-3">
              <StoryPreview image={IMG.bape} label="Size 10 - $325" rotate={-4} />
              <StoryPreview image={IMG.j4} label="Size 10.5 - $850" rotate={3} />
            </div>
          </Card>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <Card
            icon={LuHandCoins}
            title="Buy from your shoppers"
            beta
            text="Shoppers send items they want to sell, with photos. You get a suggested offer from your own sales history, and pay in cash or store credit."
          >
            <div className="w-full max-w-xs rounded-xl border border-border bg-surface p-4 text-left">
              <p className="text-sm font-semibold leading-snug">Air Jordan 4 Nigel Sylvester</p>
              <p className="mt-0.5 text-xs text-text-muted">Size 10M/11.5W · Pre-owned · Original box</p>
              <div className="mt-3 flex items-center justify-between rounded-lg bg-text/5 px-3 py-2 text-xs">
                <span className="text-text-muted">Suggested offer</span>
                <span className="font-semibold">$510</span>
              </div>
              <div className="mt-2 rounded-lg bg-primary py-1.5 text-center text-xs font-semibold text-primary-text">Send offer</div>
            </div>
          </Card>

          <Card
            icon={LuMail}
            title="Weekly most-wanted email"
            text="Every Monday: the sizes the most shoppers are waiting on that you don't have in stock, so you know exactly what to buy."
          >
            <div className="w-full max-w-xs rounded-xl border border-border bg-surface p-4 text-left">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">Most wanted this week</p>
              {[
                ["Jordan 4 Bred Reimagined", "10M", 48],
                ["Yeezy 350 V2 Cream", "11M", 27],
                ["BAPE Shark Hoodie", "L", 19],
              ].map(([name, size, n]) => (
                <div key={name} className="mt-2 flex items-center justify-between gap-2 text-xs">
                  <span className="truncate">
                    {name} <span className="text-text-muted">· {size}</span>
                  </span>
                  <span className="shrink-0 font-semibold">{n} waiting</span>
                </div>
              ))}
            </div>
          </Card>

          <Card
            icon={LuShoppingBag}
            title="On your Shopify store"
            text="Add a restock-alerts banner and a floating button to your Shopify theme in a couple of clicks — no code. Shoppers land straight on your SyncStock site."
          >
            <div className="relative h-44 w-full max-w-xs overflow-hidden rounded-xl border border-border bg-white text-neutral-900">
              <div className="flex h-6 items-center gap-1.5 border-b border-neutral-200 px-2">
                <span className="h-1.5 w-8 rounded bg-neutral-200" />
                <span className="h-1.5 w-5 rounded bg-neutral-200" />
              </div>
              <div className="mx-2 mt-2 rounded-lg bg-neutral-950 p-3 text-white">
                <p className="text-xs font-semibold">Your size, the moment it's back</p>
                <p className="mt-0.5 text-[10px] text-white/70">Only takes 30 seconds</p>
                <span className="mt-2 inline-block rounded bg-white px-2 py-0.5 text-[10px] font-semibold text-neutral-950">Get restock alerts</span>
              </div>
              <div className="mx-2 mt-2 grid grid-cols-3 gap-1.5">
                {[0, 1, 2].map((i) => (
                  <span key={i} className="h-8 rounded bg-neutral-100" />
                ))}
              </div>
              <span className="absolute bottom-2 right-2 inline-flex items-center gap-1 rounded-full bg-neutral-950 px-2.5 py-1 text-[10px] font-semibold text-white shadow">
                <LuBellRing size={10} /> Restock alerts
              </span>
            </div>
          </Card>
        </div>
      </div>
    </Section>
  );
}
