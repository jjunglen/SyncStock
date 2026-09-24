// Frontend mirror of the backend's extractSubdomain
export function getSubdomain() {
  const hostname = window.location.hostname;
  if (hostname === "localhost" || hostname.startsWith("127.0.0.1")) {
    return null;
  }
  const parts = hostname.split(".");
  if (parts.length < 3) return null;
  const sub = parts[0];
  if (sub === "www") return null;
  return sub;
}
