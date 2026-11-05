// What kind of trading card a Shopify variant is, read from its options,
// title, tags and description:
//   sealed — boxes, packs, tins: "sealed" (factory sealed) or
//            "sealed_damaged" (dented box, torn wrap)
//   graded — a slab: grading company + grade ("PSA 10", "Beckett Black Label")
//   raw    — a single: NM, LP, MP (HP and DMG are read too, ranked below MP)
// Saved on Inventory as condition ("sealed", "graded", "NM"…), with
// is_graded / grading_company / grade / cert_number for slabs.

// Companies read from listings. Shoppers pick PSA, CGC, Beckett (BGS) or
// "OTHER" (any other company).
const GRADING_COMPANIES = ["PSA", "BGS", "CGC", "SGC", "TAG", "ACE"];
const PICKABLE_COMPANIES = ["PSA", "CGC", "BGS", "OTHER"];

// Raw conditions, best to worst. Shoppers pick from the first three.
const RAW_CONDITIONS = ["NM", "LP", "MP", "HP", "DMG"];
const PICKABLE_RAW = ["NM", "LP", "MP"];

// Grades a shopper can pick as their lowest; "BL" (Black Label, above a
// 10) is Beckett only
const GRADES = ["BL", "10", "9", "8", "7", "6", "5", "4", "3", "2", "1"];
const BLACK_LABEL = "BL";

// Three levels of trust: full phrases anywhere (titles too); short codes
// only at the start of an option value ("HP" in a title is a Pokémon's
// hit points); loose words only in an option named Condition ("Charizard
// ex" isn't "Excellent")
const RAW_PHRASES = [
  ["NM", /\bnear[\s-]?mint\b/i],
  ["LP", /\blightly[\s-]?played\b/i],
  ["MP", /\bmoderately[\s-]?played\b/i],
  ["HP", /\bheavily[\s-]?played\b/i],
  ["DMG", /\bdamaged\b/i],
];
const RAW_CODES = [
  ["NM", /^nm(\/m|-m)?\b/i],
  ["LP", /^lp\b/i],
  ["MP", /^mp\b/i],
  ["HP", /^hp\b/i],
  ["DMG", /^dmg\b/i],
];
const RAW_LOOSE = [
  ["NM", /\bmint\b/i],
  ["LP", /\b(excellent|light(ly)? play(ed)?)\b/i],
  ["MP", /\b(good|played)\b/i],
  ["HP", /\b(poor|heavy play(ed)?)\b/i],
];

const SEALED =
  /\b(sealed|elite trainer box|etb|booster (box|pack|bundle|display|case)|blister|collection box|premium collection|tin|display box|hobby box|blaster|mega box|starter deck|build & battle)\b/i;
const SEALED_DAMAGE = /\b(damaged|dented|dent|crushed|torn|ripped|tear|creased|opened|resealed|box damage|wrap damage)\b/i;

// "PSA 10", "BGS 9.5", "Beckett 9.5", "CGC Pristine 10", "PSA GEM MT 10",
// "BGS Black Label", "Beckett 10 Black Label"
const COMPANY = `(${[...GRADING_COMPANIES, "Beckett"].join("|")})`;
const GRADED = new RegExp(
  `\\b${COMPANY}\\b[\\s:#-]*(?:gem\\s*mi?n?t|gem|mint|mt|pristine|perfect|nm-mt|nm)?[\\s:#-]*(10|[1-9](?:\\.5)?)\\b`,
  "i",
);
const BLACK_LABEL_TEXT = new RegExp(`\\b(BGS|Beckett)\\b[^,|]{0,20}\\bblack\\s*label\\b`, "i");
const CERT = /\bcert(?:ification)?\s*(?:#|no\.?|number)?\s*:?\s*(\d{6,12})\b/i;

const textOf = (value) => (Array.isArray(value) ? value.join(" ") : String(value || ""));
const first = (list, text) => list.find(([, re]) => re.test(text))?.[0] || null;

const gradedFrom = (text) => {
  const t = String(text || "");
  if (BLACK_LABEL_TEXT.test(t)) return { company: "BGS", grade: BLACK_LABEL };
  const m = t.match(GRADED);
  if (!m) return null;
  const company = m[1].toUpperCase() === "BECKETT" ? "BGS" : m[1].toUpperCase();
  return { company, grade: m[2] };
};

// One option value: a phrase, or a code at its start ("NM Foil")
const rawFromOption = (value) => first(RAW_PHRASES, value) || first(RAW_CODES, String(value || "").trim());

const card = (condition, extra = {}) => ({
  condition,
  is_graded: false,
  grading_company: null,
  grade: null,
  cert_number: null,
  ...extra,
});

// options: [{ name, value }] for this variant (variantDetails.js)
const readCard = (product, options = []) => {
  const optionText = options.map((o) => o.value).join(" ");
  const conditionOption = options.find((o) => /condition|grade/i.test(o.name || ""));
  const title = product.title || "";
  const tags = textOf(product.tags);
  const body = String(product.body_html || "").replace(/<[^>]+>/g, " ");

  // A slab: this variant's options first (a card sold in several grades),
  // then the title and tags
  const graded = gradedFrom(optionText) || gradedFrom(title) || gradedFrom(tags);
  if (graded) {
    const cert = `${optionText} ${title} ${tags} ${body}`.match(CERT);
    return card("graded", {
      is_graded: true,
      grading_company: graded.company,
      grade: graded.grade,
      cert_number: cert ? cert[1] : null,
    });
  }

  // Sealed product: factory sealed unless the variant or title says
  // the box is damaged
  if (SEALED.test(`${title} ${tags} ${optionText}`)) {
    return card(SEALED_DAMAGE.test(`${optionText} ${title}`) ? "sealed_damaged" : "sealed");
  }

  const raw =
    (conditionOption && (rawFromOption(conditionOption.value) || first(RAW_LOOSE, conditionOption.value))) ||
    options.map((o) => rawFromOption(o.value)).find(Boolean) ||
    // The title or tags, full phrases only ("Blastoise - Near Mint")
    first(RAW_PHRASES, `${title} ${tags}`);
  if (raw) return card(raw);

  return card("either", { is_graded: null });
};

// Card fields for every non-card row (so a product that stops being a
// card doesn't keep old grading info)
const NO_CARD = { is_graded: null, grading_company: null, grade: null, cert_number: null };

// A grade as a number to compare: Black Label ranks above a 10
const gradeValue = (grade) => (grade === BLACK_LABEL ? 11 : Number(grade));

// Does a card meet an alert's card preferences?
//   alert.graded_preference — "raw", "graded" or "either"
//   alert.preferred_grading_company — PSA, CGC, BGS, OTHER; null = any
//   alert.min_grade — lowest grade wanted ("9", "BL"); null = any
//   alert.attributes.min_condition — worst raw condition wanted ("LP")
//   alert.attributes.sealed — "factory" = factory sealed only
// Cards we couldn't read always pass.
const cardMeetsPreferences = (alert, inventory) => {
  const want = alert.graded_preference || "either";
  const condition = inventory.condition;
  if (condition === "sealed" || condition === "sealed_damaged") {
    return !(alert.attributes?.sealed === "factory" && condition === "sealed_damaged");
  }
  if (condition === "graded" || inventory.is_graded) {
    if (want === "raw") return false;
    const company = alert.preferred_grading_company;
    if (company === "OTHER" && ["PSA", "CGC", "BGS"].includes(inventory.grading_company)) return false;
    if (company && company !== "OTHER" && company !== inventory.grading_company) return false;
    if (alert.min_grade && !(gradeValue(inventory.grade) >= gradeValue(alert.min_grade))) return false;
    return true;
  }
  if (RAW_CONDITIONS.includes(condition)) {
    if (want === "graded") return false;
    const worst = alert.attributes?.min_condition;
    if (worst && RAW_CONDITIONS.indexOf(condition) > RAW_CONDITIONS.indexOf(worst)) return false;
    return true;
  }
  return true;
};

module.exports = {
  readCard,
  cardMeetsPreferences,
  NO_CARD,
  GRADING_COMPANIES,
  PICKABLE_COMPANIES,
  RAW_CONDITIONS,
  PICKABLE_RAW,
  GRADES,
  BLACK_LABEL,
};
