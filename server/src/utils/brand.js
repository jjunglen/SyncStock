// Works out a product's brand for the dashboard's Brand filter.
//
// Shopify's "vendor" field is typed by hand and inconsistent (one store
// has "FOG", "Fear of God", "Fear" and "Fear Of God"), so the product
// title is checked first against known brands and their nicknames. The
// vendor is only a fallback. Order matters: more specific brands come
// before the ones they sit under (Jordan before Nike), and collabs
// before the brands they print on (OVO before New Era).
const BRANDS = [
  ["Jordan", /\b(air\s+)?jordan\b|\baj\s?\d/],
  ["Yeezy", /\b(yeezy|yzy)\b/],
  ["Nike", /\bnike(craft)?\b|\bkd\s?\d|\b(air\s+max|air\s+force|dunk|blazer|cortez|vomero|pegasus|kobe|lebron|foamposite)\b/],
  ["adidas", /\badidas\b|\b(samba|gazelle|campus|superstar|ultraboost|spezial)\b/],
  ["New Balance", /\bnew\s+balance\b|\bnb\s?\d/],
  ["ASICS", /\basics\b|\bgel[\s-]/],
  ["Converse", /\bconverse\b|\bchuck\s+(taylor|70)\b/],
  ["Vans", /\bvans\b|\bold\s+skool\b/],
  ["Timberland", /\btimberland\b/],
  ["Salomon", /\bsalomon\b/],
  ["Saucony", /\bsaucony\b/],
  ["Puma", /\bpuma\b/],
  ["Reebok", /\breebok\b/],
  ["Crocs", /\bcrocs?\b/],
  ["UGG", /\bugg\b/],
  ["Hoka", /\bhoka\b/],
  ["On", /\bon\s+(running|cloud)/],
  ["Clarks", /\bclarks\b/],
  ["Anta", /\banta\b|\bklay\s+thompson\b|\bktx?\s?\d/],
  ["Under Armour", /\bunder\s+armou?r\b|\bcurry\s+(brand|flow|fox|\d)/],
  ["Balenciaga", /\bbalenciaga\b/],
  ["Dior", /\bdior\b/],
  ["Louis Vuitton", /\blouis\s+vuitton\b/],
  ["Off-White", /\boff[\s-]white\b/],
  ["Supreme", /\bsupreme\b/],
  ["Palace", /\bpalace\b/],
  ["BAPE", /\bbape\b|\ba\s+bathing\s+ape\b/],
  // Plural only: "essential shoe cleaning kit" isn't the brand
  ["Fear of God Essentials", /\bessentials\b/],
  ["Fear of God", /\bfear\s+of\s+god\b|\bfog\b/],
  ["Eric Emanuel", /\beric\s+emanuel\b|\bee\s+(basic\s+)?shorts?\b/],
  ["Warren Lotas", /\bwarren\s+lotas\b/],
  ["Cactus Plant Flea Market", /\bcactus\s+plant\s+flea\s+market\b|\bcpfm\b/],
  ["Travis Scott", /\btravis\s+scott\b|\bcactus\s+jack\b|\bastroworld\b/],
  ["KAWS", /\bkaws\b/],
  ["Kith", /\bkith\b/],
  ["Godspeed", /\bgodspeed\b/],
  ["Reshoevn8r", /\breshoevn8r\b/],
  ["Vale", /\bvale\b/],
  ["Denim Tears", /\bdenim\s+tears\b/],
  ["Chrome Hearts", /\bchrome\s+hearts\b/],
  ["Gallery Dept.", /\bgallery\s+dept\b/],
  ["Stüssy", /\bst[uü]ssy\b/],
  ["Sp5der", /\bsp5der\b/],
  ["Hellstar", /\bhellstar\b/],
  ["Corteiz", /\bcorteiz\b|\bcrtz\b/],
  ["Broken Planet", /\bbroken\s+planet\b/],
  ["Trapstar", /\btrapstar\b/],
  ["Represent", /\brepresent\b/],
  ["Rhude", /\brhude\b/],
  ["Human Made", /\bhuman\s+made\b/],
  ["The North Face", /\bnor?th\s+face\b/],
  ["OVO", /\bovo\b|\boctobers\s+very\s+own\b|\bdrake\b/],
  ["XO", /\bthe\s+weeknd\b/],
  ["Playboi Carti", /\bplayboi\s+carti\b/],
  ["Sneeze", /\bsneeze\b/],
  ["Bearbrick", /\bbe@?a?rbrick\b/],
  ["Drew House", /\bdrew\s+house\b/],
  ["Anti Social Social Club", /\banti\s+social\s+social\s+club\b|\bassc\b/],
  ["Billionaire Boys Club", /\bbillionaire\s+boys\s+club\b|\bbbc\b/],
  ["New Era", /\bnew\s+era\b/],
  ["Pokémon", /\bpok[eé]mon\b/],
  ["One Piece", /\bone\s+piece\b/],
  ["Magic: The Gathering", /\bmagic:?\s+the\s+gathering\b|\bmtg\b/],
  ["Yu-Gi-Oh!", /\byu-?gi-?oh\b/],
  ["Topps", /\btopps\b/],
  ["Panini", /\bpanini\b/],
];

// Many shops list themselves as the vendor on their own merch ("LAB",
// "Laboratory Merch" at The Laboratory DTX) — those get the store's name
const GENERIC_WORDS = new Set(["the", "and", "shop", "store", "merch", "inc", "llc"]);
const words = (text) =>
  text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length >= 3 && !GENERIC_WORDS.has(w));

const isStoreOwn = (vendor, storeName) => {
  if (!storeName) return false;
  const v = vendor.toLowerCase();
  const store = storeName.toLowerCase();
  if (store.includes(v) || v.includes(store)) return true;
  const storeWords = words(storeName);
  return words(vendor).some((w) => storeWords.some((sw) => sw.startsWith(w)));
};

const matchKnown = (text) => BRANDS.find(([, pattern]) => pattern.test(text))?.[0] || null;

const detectBrand = (title, vendor, storeName) => {
  const fromTitle = matchKnown((title || "").toLowerCase());
  if (fromTitle) return fromTitle;

  const cleanVendor = (vendor || "").trim();
  // The vendor may still be a known brand, just not in the title
  const fromVendor = matchKnown(cleanVendor.toLowerCase());
  if (fromVendor) return fromVendor;

  // Numbers and single letters aren't brands
  if (cleanVendor.length < 2 || /^\d+$/.test(cleanVendor)) return null;
  return isStoreOwn(cleanVendor, storeName) ? storeName : cleanVendor;
};

module.exports = { detectBrand };
