// Photos of pairs shoppers want to sell, in a PRIVATE Supabase Storage
// bucket. They live there only until the pair is dropped off, declined or
// expired (sell.controller.js deletes them). Nobody gets a public link:
// photos are served through /api/sell/photos/:id, which checks that the
// viewer is the shopper who sent it or the store's admin.
//
// Railway / server .env:
//   SUPABASE_URL               — https://<project>.supabase.co
//   SUPABASE_SERVICE_ROLE_KEY  — Project settings → API Keys → Secret key
//                                (sb_secret_…, or a legacy service_role key);
//                                server only, never in the client
//   SELL_PHOTOS_BUCKET         — optional, default "sell-photos" (private)

const env = (name) => (process.env[name] || "").trim() || undefined;
const bucket = () => env("SELL_PHOTOS_BUCKET") || "sell-photos";
const isConfigured = () => !!(env("SUPABASE_URL") && env("SUPABASE_SERVICE_ROLE_KEY"));

// New Supabase secret keys (sb_secret_…) go in the apikey header only —
// they aren't JWTs. Legacy service_role keys (JWTs) also need the
// Authorization header.
const headers = (extra = {}) => {
  const key = env("SUPABASE_SERVICE_ROLE_KEY");
  const legacyJwt = /^eyJ/.test(key);
  return { apikey: key, ...(legacyJwt && { Authorization: `Bearer ${key}` }), ...extra };
};
// Just https://<project>.supabase.co — a URL copied from the Data API
// page ends in /rest/v1, which would send uploads to the database API
const base = () => {
  try {
    return new URL(env("SUPABASE_URL")).origin;
  } catch {
    return env("SUPABASE_URL").replace(/\/+$/, "");
  }
};
const objectUrl = (path) => `${base()}/storage/v1/object/${bucket()}/${path}`;

const MAX_PHOTO_BYTES = 3 * 1024 * 1024;

// JPEG, PNG or WebP, by their first bytes (the browser's type isn't
// trusted). The sell form converts iPhone HEIC photos to JPEG before
// uploading, since browsers can't show HEIC to the merchant.
const photoType = (buf) => {
  if (!Buffer.isBuffer(buf) || buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "image/png";
  if (buf.toString("ascii", 0, 4) === "RIFF" && buf.toString("ascii", 8, 12) === "WEBP") return "image/webp";
  return null;
};

const upload = async (path, buffer, mime) => {
  const resp = await fetch(objectUrl(path), {
    method: "POST",
    headers: headers({ "Content-Type": mime, "x-upsert": "true", "cache-control": "max-age=3600" }),
    body: buffer,
  });
  if (!resp.ok) throw new Error(`Photo upload failed (${resp.status}): ${(await resp.text()).slice(0, 200)}`);
};

// The file, for /api/sell/photos/:id
const download = async (path) => {
  const resp = await fetch(objectUrl(path), { headers: headers() });
  if (!resp.ok) throw new Error(`Photo download failed (${resp.status})`);
  return Buffer.from(await resp.arrayBuffer());
};

// Deletes files; missing ones are fine (already gone)
const remove = async (paths) => {
  const list = [...new Set(paths.filter(Boolean))];
  for (let i = 0; i < list.length; i += 100) {
    const resp = await fetch(`${base()}/storage/v1/object/${bucket()}`, {
      method: "DELETE",
      headers: headers({ "Content-Type": "application/json" }),
      body: JSON.stringify({ prefixes: list.slice(i, i + 100) }),
    });
    if (!resp.ok && resp.status !== 404) throw new Error(`Photo delete failed (${resp.status})`);
  }
};

module.exports = { isConfigured, photoType, upload, download, remove, MAX_PHOTO_BYTES };
