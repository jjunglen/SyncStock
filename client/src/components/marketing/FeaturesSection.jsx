import {
  LuBellRing,
  LuRuler,
  LuTrendingDown,
  LuMousePointerClick,
  LuTrendingUp,
  LuLayers,
  LuStore,
  LuRefreshCw,
} from "react-icons/lu";
import Section from "./Section.jsx";

// Adapted from Launch UI's items grid (MIT — see LAUNCH_UI_LICENSE.md)
const FEATURES = [
  {
    title: "Instant restock alerts",
    description: "Shoppers hear the moment a sold-out item is back in their size",
    icon: LuBellRing,
  },
  {
    title: "Size matching",
    description: "Alerts fire only for the sizes each shopper actually wears",
    icon: LuRuler,
  },
  {
    title: "Price-drop alerts",
    description: "Tracked items that get cheaper notify the people waiting on them",
    icon: LuTrendingDown,
  },
  {
    title: "Sales attribution",
    description: "See which alerts turned into orders, and what they earned",
    icon: LuMousePointerClick,
  },
  {
    title: "Sourcing insights",
    description: "Know what to restock next from real customer demand",
    icon: LuTrendingUp,
  },
  {
    title: "Sneakers, clothing, cards",
    description: "Products sort themselves by category from your Shopify catalog",
    icon: LuLayers,
  },
  {
    title: "Your own storefront",
    description: "Shoppers sign up on your subdomain, with your store's name",
    icon: LuStore,
  },
  {
    title: "Always in sync",
    description: "New listings, stock, and prices update from Shopify on their own",
    icon: LuRefreshCw,
  },
];

export default function FeaturesSection() {
  return (
    <Section id="features">
      <div className="max-w-6xl mx-auto flex flex-col items-center gap-6 sm:gap-20">
        <h2 className="font-display max-w-xl text-center text-3xl leading-tight font-semibold sm:text-5xl sm:leading-tight">
          Everything a restock needs. Nothing it doesn't.
        </h2>
        <div className="grid auto-rows-fr grid-cols-2 gap-0 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
          {FEATURES.map(({ title, description, icon: Icon }) => (
            <div key={title} className="flex flex-col gap-4 p-4">
              <h3 className="flex items-center gap-2 text-sm font-semibold leading-none sm:text-base">
                <Icon size={18} className="shrink-0" aria-hidden="true" />
                {title}
              </h3>
              <p className="max-w-60 text-sm text-text-muted text-balance">
                {description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </Section>
  );
}
