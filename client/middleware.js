// Vercel Routing Middleware — only for the dashboard's admin version
// (/shopify…, the app's address in Shopify).
//
// 1. Installs. Shopify sends a new install to this address in the WHOLE
//    window, with its signed link (?shop=…&hmac=…). The page loads App
//    Bridge first (Shopify requires that), and App Bridge, seeing it's not
//    inside the admin, jumps to the app's admin page — which doesn't exist
//    yet, so Shopify shows "There's no page at this address". So a
//    whole-window visit with Shopify's link goes straight to the server's
//    app entry instead (same signed query), which starts Shopify's approval
//    or, once installed, returns to the admin. Inside the admin's frame the
//    page loads as normal.
// 2. Framing. Shopify asks embedded apps to allow framing only by the shop
//    being viewed and the Shopify admin; this adds that exact rule.
//    vercel.json's broader rule (any *.myshopify.com) stays as the
//    fallback — browsers apply both, so the stricter one wins.
// Anything unexpected: the page is served unchanged.
export const config = { matcher: ["/shopify", "/shopify/:path*"] };

const SHOP = /^[a-z0-9][a-z0-9-]*\.myshopify\.com$/;
const APP_ENTRY = "https://api.syncstock.io/api/store/shopify/app";

// Opened in the whole window (not the admin's frame)? Browsers say so in
// Sec-Fetch-Dest; without it, Shopify's frame loads carry embedded=1.
const wholeWindow = (request, url) => {
  const dest = request.headers.get("sec-fetch-dest");
  return dest ? dest === "document" : url.searchParams.get("embedded") !== "1";
};

export default function middleware(request) {
  const headers = { "x-middleware-next": "1" }; // continue to the page
  try {
    const url = new URL(request.url);
    const shop = (url.searchParams.get("shop") || "").toLowerCase();
    if (SHOP.test(shop)) {
      if (url.searchParams.has("hmac") && wholeWindow(request, url)) {
        const page = url.pathname.replace(/^\/shopify/, "");
        return Response.redirect(`${APP_ENTRY}${page}${url.search}`, 302);
      }
      headers["Content-Security-Policy"] = `frame-ancestors https://${shop} https://admin.shopify.com`;
    }
  } catch {
    // serve the page as is
  }
  return new Response(null, { headers });
}
