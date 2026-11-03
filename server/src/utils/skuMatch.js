// How sales are grouped into "the same item" for price guides: by SKU
// (style code) first, title only as a fallback.
//   1. SKU typos are folded into the SKU the same title usually has
//      ("DH6927-16" → "DH6927-161" when the title matches)
//   2. A sale with no SKU borrows one when its title is known with
//      exactly one SKU
//   3. Otherwise the title itself, if it's specific
//   4. Short generic titles ("BAPE TEE", "SUP SOCKS") are too general to
//      price — many different items share them

// Title for matching: lowercase, quotes and odd spacing removed. Years and
// GS/PS/W markers are kept — "(2020)" and "(2025)" are different shoes.
const titleKey = (name) =>
  String(name || "")
    .toLowerCase()
    .replace(/[’'`"]/g, "")
    .replace(/[^a-z0-9()./+-]+/g, " ")
    .trim();

const editDistance = (a, b) => {
  if (Math.abs(a.length - b.length) > 2) return 3;
  const row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let prev = row[0];
    row[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = row[j];
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = tmp;
    }
  }
  return row[b.length];
};

// A typo of the same SKU: a space instead of a dash, or one character
// dropped or added ("CW2190-30" / "CW2190-300"). A swapped character is
// NOT folded — "HF3975-003" and "HF3975-001" are different colorways.
const sep = (s) => s.replace(/[\s_]+/g, "-");
const nearSku = (a, b) => {
  if (a === b || a.length < 5 || b.length < 5) return false;
  if (sep(a) === sep(b)) return true;
  return Math.abs(a.length - b.length) === 1 && editDistance(a, b) === 1;
};

// "BAPE TEE", "Supreme Beanie", "2025 BAPE T-Shirt": three words or fewer
// once years are set aside
const isGeneric = (name) => {
  const words = titleKey(name)
    .replace(/[()]/g, " ")
    .split(/\s+/)
    .filter((w) => w && !/^(19|20)\d{2}$/.test(w));
  return words.length <= 3;
};

const GENERIC_FLAG = "Too general to price";

// A size for matching. Sneakers match on the men's size, however it's
// written: "10", "10M/11.5W" (the app's size buttons), "11.5W/10M" (the
// sales sheet); youth sizes keep their Y ("7Y"). Clothing words become
// letters ("Large" = "L").
const SIZE_WORDS = { SMALL: "S", MEDIUM: "M", LARGE: "L", "X-LARGE": "XL", XLARGE: "XL", "XX-LARGE": "XXL", "2XL": "XXL", XSMALL: "XS", "X-SMALL": "XS" };
const sizeKey = (size) => {
  const s = String(size || "").trim().toUpperCase().replace(/\s+/g, "");
  if (!s) return null;
  if (SIZE_WORDS[s]) return SIZE_WORDS[s];
  const men = /(?:^|\/)(\d+(?:\.\d+)?)M(?:\/|$)/.exec(s);
  if (men) return men[1].replace(/\.0$/, "");
  return s.replace(/^(\d+(\.\d+)?)\.0$/, "$1");
};

// rows: [{ id, name, raw_style_code, style_code, flag, matched_by }]
// Returns the rows whose style_code, matched_by or flag should change.
const planSkuFixes = (rows) => {
  // How often each raw SKU appears per title
  const byTitle = new Map();
  for (const r of rows) {
    if (!r.raw_style_code) continue;
    const t = titleKey(r.name);
    if (!byTitle.has(t)) byTitle.set(t, new Map());
    const counts = byTitle.get(t);
    counts.set(r.raw_style_code, (counts.get(r.raw_style_code) || 0) + 1);
  }

  // Per title: typo → the more common near-identical SKU
  const fixes = new Map(); // title → Map(raw → canonical)
  const skusFor = new Map(); // title → Set(canonical SKUs)
  for (const [t, counts] of byTitle) {
    const ranked = [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
    // Most common first: a SKU folds into an earlier (more common) one
    // that's one character off and isn't itself a typo
    const map = new Map();
    ranked.forEach(([code, n], i) => {
      const into = ranked.slice(0, i).find(([other, m]) => m > n && map.get(other) === other && nearSku(code, other));
      map.set(code, into ? into[0] : code);
    });
    fixes.set(t, map);
    skusFor.set(t, new Set(map.values()));
  }

  const changes = [];
  for (const r of rows) {
    const t = titleKey(r.name);
    let style_code = r.raw_style_code || null;
    let matched_by = "sku";
    if (style_code) {
      const fixed = fixes.get(t)?.get(style_code) || style_code;
      if (fixed !== style_code) matched_by = "fixed_sku";
      style_code = fixed;
    } else {
      const known = skusFor.get(t);
      if (known && known.size === 1) {
        style_code = [...known][0];
        matched_by = "borrowed_sku";
      } else {
        matched_by = "title";
      }
    }
    let flag = r.flag || null;
    if (!style_code && isGeneric(r.name)) {
      if (!flag) flag = GENERIC_FLAG;
    } else if (flag === GENERIC_FLAG) {
      flag = null;
    }
    if (style_code !== (r.style_code || null) || matched_by !== r.matched_by || flag !== (r.flag || null)) {
      changes.push({ id: r.id, style_code, matched_by, flag });
    }
  }
  return changes;
};

module.exports = { titleKey, nearSku, isGeneric, planSkuFixes, sizeKey, GENERIC_FLAG };
