import { LuChevronDown } from "react-icons/lu";
import Section from "./Section.jsx";

// Adapted from Launch UI's FAQ (MIT — see LAUNCH_UI_LICENSE.md); native
// <details> instead of a Radix accordion, so no extra dependencies
const FAQS = [
  {
    q: "How does Syncstock connect to my store?",
    a: "You approve the Syncstock app in Shopify. Your whole catalog syncs right away, and new listings, stock changes, and price changes keep flowing in on their own.",
  },
  {
    q: "What do my shoppers see?",
    a: "Your own storefront on a Syncstock subdomain with your store's name. Shoppers sign up with email or Google, pick their sizes, browse what's in stock, and set alerts on anything sold out.",
  },
  {
    q: "How do shoppers get notified?",
    a: "By email, text, and push notification — whichever they turn on. Alerts go out within about 30 seconds of a restock, and the link takes them straight to the item.",
  },
  {
    q: "Does it work for more than sneakers?",
    a: "Yes. Products are sorted into sneakers, clothing & accessories, and trading cards from your Shopify product types, and shoppers only see the categories you actually carry.",
  },
  {
    q: "How do I know it's working?",
    a: "Your dashboard shows revenue attributed to alerts, how many shoppers were notified and clicked, recent purchases, and which products have the most shoppers waiting.",
  },
  {
    q: "Are text messages extra?",
    a: "No. SMS is included in the plan, not a paid add-on.",
  },
];

export default function FAQSection() {
  return (
    <Section>
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-8">
        <h2 className="font-display text-center text-3xl font-semibold sm:text-5xl">
          Questions and answers
        </h2>
        <div className="w-full max-w-3xl divide-y divide-border border-y border-border">
          {FAQS.map(({ q, a }) => (
            <details key={q} className="group py-2">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-3 text-left font-medium [&::-webkit-details-marker]:hidden">
                {q}
                <LuChevronDown
                  size={18}
                  aria-hidden="true"
                  className="shrink-0 text-text-muted transition-transform group-open:rotate-180"
                />
              </summary>
              <p className="max-w-2xl pb-4 text-text-muted text-balance">{a}</p>
            </details>
          ))}
        </div>
      </div>
    </Section>
  );
}
