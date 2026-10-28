import { useEffect, useState } from "react";
import QRCode from "qrcode";
import api from "./api.js";

// The QR code's link: the API counts the scan as "In store" and opens the
// store's sign-up page, then Browse inventory (store.controller.js
// scanInStore)
export const inStoreLink = (subdomain) => `${api.defaults.baseURL}/store/qr/${subdomain}`;

// The QR code as an SVG image. Always black on white so every phone
// camera reads it.
export function useQrCode(text) {
  const [src, setSrc] = useState(null);
  useEffect(() => {
    if (!text) return undefined;
    let active = true;
    QRCode.toString(text, { type: "svg", margin: 0, errorCorrectionLevel: "M", color: { dark: "#0b0b0b", light: "#ffffff" } })
      .then((svg) => active && setSrc(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`))
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [text]);
  return src;
}
