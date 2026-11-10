import { useState } from "react";
import { LuBellRing, LuMail, LuCircleCheck, LuCircleX, LuRotateCcw, LuLayers } from "react-icons/lu";
import CardPrefsPicker from "../dashboard/CardPrefsPicker.jsx";
import { EMPTY_CARD_PREFS, cardPrefsSummary, companyLabel } from "../../lib/alertOptions.js";

// "Try it" on the Built for pages: set an alert, simulate a restock, and
// see whether it would fire — the same rules SyncStock uses (size match,
// new vs pre-owned, card grade). Runs in the browser only: nothing is
// saved or sent.
//   kind — "sneakers" | "clothing" | "cards"

const IMG = {
  j4: "https://cdn.shopify.com/s/files/1/0702/0399/8482/files/cc4be9aa-763a-4fc1-a0b9-4c6bb56504ca.png?v=1792791332",
  hoodie: "https://cdn.shopify.com/s/files/1/0702/0399/8482/files/547ada92-72a6-4786-b3d3-3aea992b0b9f.webp?v=1767480050",
};

const DEMOS = {
  sneakers: {
    item: "Air Jordan 4 Retro OG SP Nigel Sylvester",
    image: IMG.j4,
    sizes: ["8M/9.5W", "9M/10.5W", "9.5M/11W", "10M/11.5W", "10.5M/12W", "11M/12.5W", "12M/13.5W"],
    start: "9M/10.5W",
    restock: { size: "10M/11.5W", condition: "brand_new", label: "A brand-new pair in 10M/11.5W", price: "$850" },
  },
  clothing: {
    item: "BAPE Color Camo Pullover Hoodie Red",
    image: IMG.hoodie,
    sizes: ["S", "M", "L", "XL", "XXL"],
    start: "L",
    restock: { size: "M", condition: "brand_new", label: "A brand-new hoodie in M", price: "$350" },
  },
  cards: {
    item: "Charizard ex 199/165 Special Illustration Rare",
    restock: { condition: "graded", grading_company: "PSA", grade: "9", label: "A PSA 9 slab", price: "$310" },
  },
};

const CONDITIONS = [
  { key: "either", label: "Either" },
  { key: "brand_new", label: "Brand New" },
  { key: "pre_owned", label: "Pre-Owned" },
];

// The card rule, mirrored from the server (utils/cardDetails.js)
const cardFits = (prefs, card) => {
  if (card.condition === "graded") {
    if (!prefs.kinds.includes("graded")) return [false, "it's graded and you asked for raw only"];
    const companies = Object.keys(prefs.grades || {});
    if (!companies.length) return [true];
    const key = ["PSA", "CGC", "BGS"].includes(card.grading_company) ? card.grading_company : "OTHER";
    if (!companies.includes(key)) return [false, `it's ${companyLabel(card.grading_company)} and you picked ${companies.map(companyLabel).join(", ")}`];
    const min = prefs.grades[key];
    const value = (g) => (g === "BL" ? 11 : Number(g));
    if (min && value(card.grade) < value(min)) return [false, `a ${card.grade} is below your lowest grade (${min === "BL" ? "Black Label" : min})`];
    return [true];
  }
  return [true];
};

function Pills({ options, value, onChange, label }) {
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-2">
      {options.map((o) => {
        const key = o.key ?? o;
        const on = value === key;
        return (
          <button
            key={key}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(key)}
            className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
              on ? "bg-primary text-primary-text border-primary font-medium" : "border-border bg-surface hover:border-text/30"
            }`}
          >
            {o.label ?? o}
          </button>
        );
      })}
    </div>
  );
}

export default function MockAlertDemo({ kind }) {
  const demo = DEMOS[kind];
  const isCard = kind === "cards";
  const [size, setSize] = useState(demo.start);
  const [condition, setCondition] = useState("either");
  const [prefs, setPrefs] = useState({ ...EMPTY_CARD_PREFS, kinds: ["raw", "graded"], grades: { PSA: "10" } });
  const [result, setResult] = useState(null); // null | { sent, reason }

  const reset = () => setResult(null);
  const simulate = () => {
    const r = demo.restock;
    if (isCard) {
      const [sent, reason] = cardFits(prefs, r);
      return setResult({ sent, reason });
    }
    if (size !== r.size) return setResult({ sent: false, reason: `it came back in ${r.size}, and your alert is for ${size}` });
    if (condition !== "either" && condition !== r.condition) {
      return setResult({ sent: false, reason: "it's brand new and you asked for pre-owned only" });
    }
    setResult({ sent: true });
  };

  const summary = isCard
    ? cardPrefsSummary(prefs)
    : [`Size ${size}`, CONDITIONS.find((c) => c.key === condition)?.label.replace("Either", "New or pre-owned")].join(" · ");

  return (
    <div className="grid gap-6 lg:grid-cols-2 text-left">
      {/* 1 · Set the alert */}
      <div className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
        <p className="text-xs font-medium uppercase tracking-wider text-text-muted">1 · Set an alert</p>
        <div className="mt-4 flex items-center gap-3">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white">
            {demo.image ? (
              <img src={demo.image} alt="" className="h-full w-full object-contain" />
            ) : (
              <LuLayers size={24} className="text-neutral-400" aria-hidden="true" />
            )}
          </div>
          <p className="font-medium leading-snug">{demo.item}</p>
        </div>

        <div className="mt-5 space-y-4" onClickCapture={reset}>
          {isCard ? (
            <CardPrefsPicker value={prefs} onChange={(v) => { setPrefs(v); reset(); }} compact />
          ) : (
            <>
              <div>
                <p className="mb-2 text-xs text-text-muted">Your size</p>
                <Pills label="Size" options={demo.sizes} value={size} onChange={setSize} />
              </div>
              <div>
                <p className="mb-2 text-xs text-text-muted">Condition</p>
                <Pills label="Condition" options={CONDITIONS} value={condition} onChange={setCondition} />
              </div>
            </>
          )}
        </div>
        <p className="mt-5 rounded-lg bg-text/5 px-3 py-2 text-xs text-text-muted">
          Alert: <span className="text-text">{summary}</span>
        </p>
      </div>

      {/* 2 · The restock, and what the shopper gets */}
      <div className="flex flex-col rounded-2xl border border-border bg-surface p-5 sm:p-6">
        <p className="text-xs font-medium uppercase tracking-wider text-text-muted">2 · The store restocks</p>
        <p className="mt-4 text-sm">
          <span className="font-medium">{demo.restock.label}</span> just listed at {demo.restock.price}.
        </p>
        <button
          type="button"
          onClick={result ? reset : simulate}
          className="mt-4 inline-flex w-fit items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-text"
        >
          {result ? <LuRotateCcw size={16} aria-hidden="true" /> : <LuBellRing size={16} aria-hidden="true" />}
          {result ? "Try again" : "Simulate a restock"}
        </button>

        <div className="mt-5 flex-1" aria-live="polite">
          {!result && <p className="text-sm text-text-muted">Change the alert, then simulate the restock to see if it fires.</p>}
          {result?.sent && (
            <div className="rounded-xl border border-border bg-bg p-4">
              <p className="flex items-center gap-2 text-sm font-semibold text-live">
                <LuCircleCheck size={16} aria-hidden="true" /> Alert sent
              </p>
              <div className="mt-3 rounded-lg border border-border bg-surface p-3">
                <p className="flex items-center gap-2 text-xs text-text-muted">
                  <LuMail size={13} aria-hidden="true" /> Your Store · just now
                </p>
                <p className="mt-1.5 text-[11px] font-semibold uppercase tracking-wider text-live">Back in stock</p>
                <p className="mt-0.5 text-sm font-semibold leading-snug">
                  {demo.item} — {isCard ? `${demo.restock.grading_company} ${demo.restock.grade}` : `size ${demo.restock.size}`}, {demo.restock.price}
                </p>
                <div className="mt-2.5 rounded-md bg-primary py-1.5 text-center text-xs font-semibold text-primary-text">Shop now</div>
              </div>
            </div>
          )}
          {result && !result.sent && (
            <div className="rounded-xl border border-border bg-bg p-4">
              <p className="flex items-center gap-2 text-sm font-semibold text-text-muted">
                <LuCircleX size={16} aria-hidden="true" /> No alert
              </p>
              <p className="mt-2 text-sm text-text-muted">Not sent, because {result.reason}. Shoppers only hear about restocks that match.</p>
            </div>
          )}
        </div>
        <p className="mt-4 text-[11px] text-text-muted">Demo only — nothing is saved or sent.</p>
      </div>
    </div>
  );
}
