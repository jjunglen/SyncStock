// Merchant-chosen store settings shared by the shopper site, alerts and
// emails.

// Categories a merchant can switch on. Trading cards are "coming soon":
// shown in settings but can't be turned on yet.
const SELECTABLE_CATEGORIES = ["sneakers", "clothing"];
const COMING_SOON_CATEGORIES = ["trading_cards"];

const enabledCategories = (store) => {
  const chosen = (store?.enabled_categories || []).filter((c) =>
    SELECTABLE_CATEGORIES.includes(c),
  );
  return chosen.length > 0 ? chosen : SELECTABLE_CATEGORIES;
};

const isCategoryEnabled = (store, category) => enabledCategories(store).includes(category);

// Text alerts are off for everyone until SMS_ENABLED=true (set on Railway
// once the Twilio number is approved); then per store (sms_enabled)
const smsEnabledGlobally = () => process.env.SMS_ENABLED === "true";
const smsAvailable = (store) => smsEnabledGlobally() && !!store?.sms_enabled;

// The logo's public address — ?v= changes whenever it's replaced, so
// browsers and email clients don't show an old one
const logoUrl = (store) =>
  store?.logo_updated_at
    ? `${process.env.BACKEND_URL}/api/store/logo/${store.id}?v=${new Date(store.logo_updated_at).getTime()}`
    : null;

// Black or white text, whichever reads better on the brand color
const textOnColor = (hex) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const lin = (c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  const luminance = 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
  return luminance > 0.4 ? "#0a0a0a" : "#ffffff";
};

module.exports = {
  smsEnabledGlobally,
  smsAvailable,
  SELECTABLE_CATEGORIES,
  COMING_SOON_CATEGORIES,
  enabledCategories,
  isCategoryEnabled,
  logoUrl,
  textOnColor,
};
