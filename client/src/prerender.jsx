/* eslint-disable react-refresh/only-export-components -- build-time only, never hot-reloaded */
// Build-time only (scripts/prerender.mjs): the public www pages rendered
// to HTML, so crawlers that don't run JavaScript (Semrush, Bing's first
// pass, link previews) still get each page's heading, text and links.
// In the browser the app starts as usual and draws over this HTML.
import { renderToString } from "react-dom/server";
import { StaticRouter } from "react-router";
import { Routes, Route } from "react-router-dom";
import Landing from "./pages/Landing.jsx";
import PricingPage from "./pages/Pricing.jsx";
import StoresPage from "./pages/StoresPage.jsx";
import UseCasePage from "./pages/UseCasePage.jsx";
import Privacy from "./pages/legal/Privacy.jsx";
import Terms from "./pages/legal/Terms.jsx";
import Cookies from "./pages/legal/Cookies.jsx";
import { MARKETING } from "./lib/marketingPages.js";

export { MARKETING };

export const render = (path) =>
  renderToString(
    <StaticRouter location={path}>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/pricing" element={<PricingPage />} />
        <Route path="/stores" element={<StoresPage />} />
        <Route path="/for/:kind" element={<UseCasePage />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/cookies" element={<Cookies />} />
      </Routes>
    </StaticRouter>,
  );
