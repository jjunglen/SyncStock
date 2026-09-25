// Only follow same-site paths from ?redirect= — rejects full URLs and
// protocol-relative "//evil.com" so login links can't bounce users away
export function safeRedirect(value, fallback) {
  if (
    typeof value !== "string" ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    value.startsWith("/\\")
  ) {
    return fallback;
  }
  return value;
}
