import { useEffect, lazy, Suspense } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { IN_SHOPIFY_ADMIN } from "./lib/shopifyAdmin.js";
import Landing from "./pages/Landing.jsx";
import AuthForm from "./components/auth/AuthForm.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import MarketingHeader from "./components/marketing/MarketingHeader.jsx";
import StoreLanding from "./pages/StoreLanding.jsx";
import StoreAuthLayout from "./components/store/StoreAuthLayout.jsx";
import { getSubdomain } from "./lib/getSubdomain.js";
import Seo from "./components/Seo.jsx";
import { getStoreInfo, applyBranding } from "./lib/storeInfo.js";

// Pages load when opened, so the landing pages download fast
const ChannelHome = lazy(() => import("./pages/shopify/ChannelHome.jsx"));
const PricingPage = lazy(() => import("./pages/Pricing.jsx"));
const ConnectShopify = lazy(() => import("./pages/onboarding/ConnectShopify.jsx"));
const OnboardingSteps = lazy(() => import("./pages/onboarding/OnboardingSteps.jsx"));
const EmailVerification = lazy(() => import("./pages/EmailVerification.jsx"));
const ResetPassword = lazy(() => import("./pages/ResetPassword.jsx"));
const MerchantDashboard = lazy(() => import("./components/dashboard/MerchantDashboard.jsx"));
const SourcingPage = lazy(() => import("./components/dashboard/SourcingPage.jsx"));
const PurchasesPage = lazy(() => import("./pages/dashboard/PurchasesPage.jsx"));
const AccountSettings = lazy(() => import("./pages/dashboard/AccountSettings.jsx"));
const CustomersPage = lazy(() => import("./pages/dashboard/CustomersPage.jsx"));
const StoreSettings = lazy(() => import("./pages/dashboard/StoreSettings.jsx"));
const SizeSettings = lazy(() => import("./pages/dashboard/SizeSettings.jsx"));
const InStoreSignPage = lazy(() => import("./pages/dashboard/InStoreSignPage.jsx"));
const StorePricingPage = lazy(() => import("./pages/dashboard/StorePricingPage.jsx"));
const BuyRequestsPage = lazy(() => import("./pages/dashboard/BuyRequestsPage.jsx"));
const SellPage = lazy(() => import("./pages/dashboard/SellPage.jsx"));
const PlatformAdmin = lazy(() => import("./pages/platform/PlatformAdmin.jsx"));
const CustomerDashboard = lazy(() => import("./pages/dashboard/CustomerDashboard.jsx"));
const TrackShoe = lazy(() => import("./pages/dashboard/TrackShoe.jsx"));
const CustomerProfile = lazy(() => import("./pages/dashboard/CustomerProfile.jsx"));
const CustomerAuthForm = lazy(() => import("./pages/store/CustomerAuthForm.jsx"));
const SelectSizes = lazy(() => import("./pages/onboarding/SelectSizes.jsx"));
const Privacy = lazy(() => import("./pages/legal/Privacy.jsx"));
const Terms = lazy(() => import("./pages/legal/Terms.jsx"));
const Cookies = lazy(() => import("./pages/legal/Cookies.jsx"));
const NotFound = lazy(() => import("./pages/NotFound.jsx"));
const StoresPage = lazy(() => import("./pages/StoresPage.jsx"));
const UseCasePage = lazy(() => import("./pages/UseCasePage.jsx"));
// Dev only: App Store screenshot compositions (never in the live build)
const AppStoreShots = import.meta.env.DEV ? lazy(() => import("./pages/dev/AppStoreShots.jsx")) : null;

function App() {
  const subdomain = getSubdomain();
  const { pathname } = useLocation();
  // The store's brand color on the shopper site — a store subdomain, or
  // locally the /store pages. Merchant pages keep Syncstock's colors.
  const branded =
    !!subdomain || (import.meta.env.DEV && !!import.meta.env.VITE_DEV_STORE && pathname.startsWith("/store"));

  useEffect(() => {
    if (!branded) {
      applyBranding(null);
      return;
    }
    getStoreInfo().then(applyBranding).catch(() => {});
  }, [branded]);

  return (
    <>
    <Seo />
    {/* Pages load on demand; a blank page-colored screen while one does */}
    <Suspense fallback={<div className="min-h-screen bg-bg" />}>
    <Routes>
      {/* Opening the app in the Shopify admin starts at the channel page */}
      <Route
        path="/"
        element={IN_SHOPIFY_ADMIN ? <Navigate to="/channel" replace /> : subdomain ? <StoreLanding /> : <Landing />}
      />
      {/* The sales channel page — only inside the Shopify admin */}
      <Route path="/channel" element={IN_SHOPIFY_ADMIN ? <ChannelHome /> : <Navigate to="/dashboard" replace />} />
      <Route path="/pricing" element={<PricingPage />} />
      <Route path="/privacy" element={<Privacy />} />
      <Route path="/terms" element={<Terms />} />
      <Route path="/cookies" element={<Cookies />} />
      {/* Joined stores, and the "Built for" pages (lib/useCases.js) */}
      <Route path="/stores" element={<StoresPage />} />
      <Route path="/for/:kind" element={<UseCasePage />} />
      <Route path="/login" element={
        <div className="min-h-screen bg-bg">
          <MarketingHeader />
          <div className="pt-16"><AuthForm initialMode="login" /></div>
        </div>
      } />
      <Route path="/signup" element={
        <div className="min-h-screen bg-bg">
          <MarketingHeader />
          <div className="pt-16"><AuthForm initialMode="signup" /></div>
        </div>
      } />
      <Route path="/onboarding" element={<ConnectShopify />} />
      <Route path="/onboarding/setup" element={<OnboardingSteps />} />
      {/* Old setup path — links sent before the new flow still work */}
      <Route path="/onboarding/subdomain" element={<OnboardingSteps />} />
      <Route path="/email-verification" element={<EmailVerification />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/store" element={<StoreLanding />} />
      <Route path="/dashboard" element={<ProtectedRoute requireMerchant><MerchantDashboard /></ProtectedRoute>} />
      <Route path="/sourcing" element={<ProtectedRoute requireMerchant><SourcingPage /></ProtectedRoute>} />
      <Route path="/purchases" element={<ProtectedRoute requireMerchant><PurchasesPage /></ProtectedRoute>} />
      <Route path="/account" element={<ProtectedRoute requireMerchant><AccountSettings /></ProtectedRoute>} />
      <Route path="/customers" element={<ProtectedRoute requireMerchant><CustomersPage /></ProtectedRoute>} />
      <Route path="/prices" element={<ProtectedRoute requireMerchant><StorePricingPage /></ProtectedRoute>} />
      {/* Old link: Price check is now the Pricing page's StockX tab */}
      <Route path="/price-check" element={<Navigate to="/prices?tab=stockx" replace />} />
      <Route path="/buy-requests" element={<ProtectedRoute requireMerchant><BuyRequestsPage /></ProtectedRoute>} />
      <Route path="/settings" element={<ProtectedRoute requireMerchant><StoreSettings /></ProtectedRoute>} />
      <Route path="/size-settings" element={<ProtectedRoute requireMerchant><SizeSettings /></ProtectedRoute>} />
      <Route path="/settings/sign" element={<ProtectedRoute requireMerchant><InStoreSignPage /></ProtectedRoute>} />
      <Route path="/platform" element={<ProtectedRoute><PlatformAdmin /></ProtectedRoute>} />
      <Route path="/store/dashboard" element={<ProtectedRoute loginPath="/store/login"><CustomerDashboard /></ProtectedRoute>} />
      <Route path="/store/track" element={<ProtectedRoute loginPath="/store/login"><TrackShoe /></ProtectedRoute>} />
      <Route path="/store/sell" element={<ProtectedRoute loginPath="/store/login"><SellPage /></ProtectedRoute>} />
      <Route path="/store/profile" element={<ProtectedRoute loginPath="/store/login"><CustomerProfile /></ProtectedRoute>} />
      <Route path="/onboarding/size" element={<ProtectedRoute loginPath="/store/login"><SelectSizes /></ProtectedRoute>} />
      <Route path="/store/login" element={<StoreAuthLayout><CustomerAuthForm initialMode="login" /></StoreAuthLayout>} />
      <Route path="/store/signup" element={<StoreAuthLayout><CustomerAuthForm initialMode="signup" /></StoreAuthLayout>} />
      {/* Any other address: "Page not found" (not indexed); inside the
          Shopify admin, the app's start page (Shopify can open admin paths
          the app doesn't have) */}
      {AppStoreShots && <Route path="/dev/app-store" element={<AppStoreShots />} />}
      <Route path="*" element={IN_SHOPIFY_ADMIN ? <Navigate to="/channel" replace /> : <NotFound />} />
    </Routes>
    </Suspense>
    </>
  );
}

export default App;