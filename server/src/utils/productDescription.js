// A product's description from Shopify, as plain text for the shopper
// site's "Details" panel. Stored as text, never HTML, so nothing a
// merchant pastes into Shopify can run on SyncStock's pages.
const MAX_LENGTH = 2000;

const ENTITIES = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };

// Shopify's body_html (product webhooks) → plain text, keeping line breaks
const htmlToText = (html) =>
  String(html || "")
    .replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<li[^>]*>/gi, "\n• ")
    .replace(/<\/(p|div|h[1-6]|li|ul|ol|tr)>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&(#\d+|#x[0-9a-f]+|\w+);/gi, (match, code) => {
      if (code[0] === "#") {
        const n = code[1].toLowerCase() === "x" ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
        return Number.isFinite(n) ? String.fromCodePoint(n) : match;
      }
      return ENTITIES[code.toLowerCase()] ?? match;
    });

// Tidy whitespace and cap the length; null when there's nothing to show
const cleanDescription = (text) => {
  const cleaned = String(text || "")
    .replace(/[ \t ]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  if (!cleaned) return null;
  return cleaned.length > MAX_LENGTH ? `${cleaned.slice(0, MAX_LENGTH - 1).trimEnd()}…` : cleaned;
};

const descriptionFromHtml = (html) => cleanDescription(htmlToText(html));

module.exports = { descriptionFromHtml, cleanDescription };
