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

// The company key a slab falls under for preferences: PSA, CGC, BGS, or
// OTHER for every other grader
const companyKey = (company) => (["PSA", "CGC", "BGS"].includes(company) ? company : "OTHER");

// ---- Card preferences ----------------------------------------------------
// One shape for a shopper's saved preferences (Account.card_prefs, set on
// Profile → Your sizes) and for each card alert:
//   kinds — what they collect: any of "raw", "graded", "sealed"
//   min_condition — worst raw condition: NM, LP or MP (null = any)
//   grades — the grading companies they want, each with its lowest grade:
//            { PSA: "9", BGS: "BL", OTHER: null } (null = any grade;
//            {} = any company, any grade)
//   sealed — "factory" = factory sealed only (null = damaged boxes too)
const CARD_KINDS = ["raw", "graded", "sealed"];

// Cleans preferences sent by the browser. { prefs } or { error }.
const cleanCardPrefs = (input = {}) => {
  const kinds = [...new Set(Array.isArray(input.kinds) ? input.kinds : CARD_KINDS)].filter((k) => CARD_KINDS.includes(k));
  if (!kinds.length) return { error: "Pick raw, graded or sealed" };
  const min_condition = input.min_condition || null;
  if (min_condition && !PICKABLE_RAW.includes(min_condition)) return { error: "Pick a raw condition from the list" };
  const grades = {};
  for (const [company, grade] of Object.entries(input.grades && typeof input.grades === "object" ? input.grades : {})) {
    if (!PICKABLE_COMPANIES.includes(company)) return { error: "Pick grading companies from the list" };
    if (grade && !GRADES.includes(String(grade))) return { error: "Pick a grade from the list" };
    if (grade === BLACK_LABEL && company !== "BGS") return { error: "Black Label is a Beckett grade" };
    grades[company] = grade ? String(grade) : null;
  }
  const sealed = input.sealed === "factory" ? "factory" : null;
  return {
    prefs: {
      kinds,
      min_condition: kinds.includes("raw") ? min_condition : null,
      grades: kinds.includes("graded") ? grades : {},
      sealed: kinds.includes("sealed") ? sealed : null,
    },
  };
};

// A card alert's preferences in the shape above. Alerts made before
// per-company grades kept one company and grade in their own columns.
const alertCardPrefs = (alert) => {
  const a = alert.attributes || {};
  const want = alert.graded_preference || "either";
  const kinds = a.kinds || [
    ...(want !== "graded" ? ["raw"] : []),
    ...(want !== "raw" ? ["graded"] : []),
    "sealed",
  ];
  let grades = a.grades || {};
  if (!a.grades && alert.preferred_grading_company) grades = { [alert.preferred_grading_company]: alert.min_grade || null };
  return { kinds, min_condition: a.min_condition || null, grades, sealed: a.sealed || null };
};

// Does a card fit these preferences? Cards we couldn't read always do.
const cardFitsPrefs = (prefs, inventory) => {
  const condition = inventory.condition;
  if (condition === "sealed" || condition === "sealed_damaged") {
    if (!prefs.kinds.includes("sealed")) return false;
    return !(prefs.sealed === "factory" && condition === "sealed_damaged");
  }
  if (condition === "graded" || inventory.is_graded) {
    if (!prefs.kinds.includes("graded")) return false;
    const companies = Object.keys(prefs.grades || {});
    if (!companies.length) return true;
    const key = companyKey(inventory.grading_company);
    if (!companies.includes(key)) return false;
    const min = prefs.grades[key];
    return !min || gradeValue(inventory.grade) >= gradeValue(min);
  }
  if (RAW_CONDITIONS.includes(condition)) {
    if (!prefs.kinds.includes("raw")) return false;
    const worst = prefs.min_condition;
    return !worst || RAW_CONDITIONS.indexOf(condition) <= RAW_CONDITIONS.indexOf(worst);
  }
  return true;
};

const cardMeetsPreferences = (alert, inventory) => cardFitsPrefs(alertCardPrefs(alert), inventory);

// Every grade a slab might be listed with, best first (half grades too)
const ALL_GRADES = [BLACK_LABEL, "10", "9.5", "9", "8.5", "8", "7.5", "7", "6.5", "6", "5.5", "5", "4.5", "4", "3.5", "3", "2.5", "2", "1.5", "1"];

// The same test as a database filter on Inventory (In stock tab, counts).
// Op: sequelize's operators. null when the shopper hasn't set preferences.
const cardPrefsWhere = (prefs, Op) => {
  if (!prefs || !Array.isArray(prefs.kinds) || !prefs.kinds.length) return null;
  const any = [{ condition: { [Op.notIn]: ["sealed", "sealed_damaged", "graded", ...RAW_CONDITIONS] } }];
  if (prefs.kinds.includes("sealed")) {
    any.push({ condition: prefs.sealed === "factory" ? "sealed" : { [Op.in]: ["sealed", "sealed_damaged"] } });
  }
  if (prefs.kinds.includes("raw")) {
    const worst = prefs.min_condition ? RAW_CONDITIONS.indexOf(prefs.min_condition) : RAW_CONDITIONS.length - 1;
    any.push({ condition: { [Op.in]: RAW_CONDITIONS.slice(0, worst + 1) } });
  }
  if (prefs.kinds.includes("graded")) {
    const companies = Object.entries(prefs.grades || {});
    if (!companies.length) {
      any.push({ condition: "graded" });
    } else {
      for (const [company, min] of companies) {
        const allowed = min ? ALL_GRADES.filter((g) => gradeValue(g) >= gradeValue(min)) : null;
        any.push({
          condition: "graded",
          grading_company: company === "OTHER" ? { [Op.notIn]: ["PSA", "CGC", "BGS"] } : company,
          ...(allowed && { grade: { [Op.in]: allowed } }),
        });
      }
    }
  }
  return { [Op.or]: any };
};

module.exports = {
  readCard,
  cardMeetsPreferences,
  cardFitsPrefs,
  cleanCardPrefs,
  alertCardPrefs,
  cardPrefsWhere,
  NO_CARD,
  GRADING_COMPANIES,
  PICKABLE_COMPANIES,
  RAW_CONDITIONS,
  PICKABLE_RAW,
  GRADES,
  BLACK_LABEL,
};
