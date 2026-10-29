// Vercel Routing Middleware — only for the dashboard's admin version
// (/shopify…, shown inside the Shopify admin).
// Shopify asks embedded apps to allow framing only by the shop being
// viewed and the Shopify admin. Shopify opens the page with ?shop=…; this
// adds that exact rule. vercel.json's broader rule (any *.myshopify.com)
// stays as the fallback — browsers apply both, so the stricter one wins.
// Anything unexpected: the page is served unchanged.
export const config = { matcher: ["/shopify", "/shopify/:path*"] };

const SHOP = /^[a-z0-9][a-z0-9-]*\.myshopify\.com$/;

export default function middleware(request) {
  const headers = { "x-middleware-next": "1" }; // continue to the page
  try {
    const shop = (new URL(request.url).searchParams.get("shop") || "").toLowerCase();
    if (SHOP.test(shop)) {
      headers["Content-Security-Policy"] = `frame-ancestors https://${shop} https://admin.shopify.com`;
    }
  } catch {
    // serve the page as is
  }
  return new Response(null, { headers });
}
