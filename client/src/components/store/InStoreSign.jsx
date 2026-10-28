import { brandShades } from "../../lib/brandColors.js";
import { inStoreLink, useQrCode } from "../../lib/qrCode.js";

const DEFAULT_COLOR = "#0b0b0b";

// The in-store counter card, 4 × 6 inches, in the store's own branding:
// its logo (or name), its brand color on the QR frame and "Scan" label,
// and a small "Powered by SyncStock" at the bottom. Printed from
// /settings/sign; also shown as the preview in Store settings.
export default function InStoreSign({ name, subdomain, logoUrl, brandColor }) {
  const qr = useQrCode(subdomain ? inStoreLink(subdomain) : null);
  // On a white card: the light-theme shade, readable on white
  const shade = brandShades(brandColor)?.light || { color: DEFAULT_COLOR, text: "#ffffff" };

  return (
    <div
      className="in-store-sign"
      style={{
        width: "4in",
        height: "6in",
        boxSizing: "border-box",
        background: "#ffffff",
        color: "#0b0b0b",
        fontFamily: "Geist, system-ui, sans-serif",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        textAlign: "center",
        padding: "0.4in 0.35in 0.25in",
        borderTop: `0.12in solid ${shade.color}`,
      }}
    >
      <div style={{ height: "0.6in", display: "flex", alignItems: "center", justifyContent: "center" }}>
        {logoUrl ? (
          <img src={logoUrl} alt={name || ""} style={{ maxHeight: "0.6in", maxWidth: "2.6in", objectFit: "contain" }} />
        ) : (
          <span style={{ fontSize: "20pt", fontWeight: 700, letterSpacing: "-0.01em" }}>{name}</span>
        )}
      </div>

      <p style={{ fontSize: "24pt", fontWeight: 700, lineHeight: 1.1, letterSpacing: "-0.02em", margin: "0.22in 0 0.08in" }}>
        See every pair
        <br />
        in your size
      </p>
      <p style={{ fontSize: "10pt", lineHeight: 1.35, color: "#555555", margin: 0, maxWidth: "3in" }}>
        Browse the whole store on your phone. Get an alert the moment your size restocks.
      </p>

      <div
        style={{
          marginTop: "0.22in",
          padding: "0.1in",
          border: `0.04in solid ${shade.color}`,
          borderRadius: "0.14in",
          background: "#ffffff",
        }}
      >
        {qr ? (
          <img src={qr} alt="QR code" style={{ width: "1.6in", height: "1.6in", display: "block" }} />
        ) : (
          <div style={{ width: "1.6in", height: "1.6in" }} />
        )}
      </div>

      <span
        style={{
          marginTop: "0.16in",
          background: shade.color,
          color: shade.text,
          fontSize: "10.5pt",
          fontWeight: 600,
          padding: "0.05in 0.16in",
          borderRadius: "999px",
        }}
      >
        Scan with your camera
      </span>
      <p style={{ fontSize: "9pt", color: "#666666", margin: "0.08in 0 0" }}>Free · Takes 30 seconds</p>

      <div style={{ marginTop: "auto", display: "flex", alignItems: "center", gap: "0.05in", fontSize: "7.5pt", color: "#888888" }}>
        <img src="/brand/syncstock-mark-dark.png" alt="" style={{ height: "0.14in" }} />
        Powered by SyncStock
      </div>
    </div>
  );
}
