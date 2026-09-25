import { Routes, Route } from "react-router-dom";
import Landing from "./pages/Landing.jsx";
import PricingPage from "./pages/Pricing.jsx";
import AuthForm from "./components/auth/AuthForm.jsx";
import ConnectShopify from "./pages/onboarding/ConnectShopify.jsx";
import OnboardingSteps from "./pages/onboarding/OnboardingSteps.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import MerchantDashboard from "./components/dashboard/MerchantDashboard.jsx";
import MarketingHeader from "./components/marketing/MarketingHeader.jsx";
import SourcingPage from "./components/dashboard/SourcingPage.jsx";
import PurchasesPage from "./pages/dashboard/PurchasesPage.jsx";
import AccountSettings from "./pages/dashboard/AccountSettings.jsx";
import CustomersPage from "./pages/dashboard/CustomersPage.jsx";
import StoreLanding from "./pages/StoreLanding.jsx";
import CustomerDashboard from "./pages/dashboard/CustomerDashboard.jsx";
import TrackShoe from "./pages/dashboard/TrackShoe.jsx";
import CustomerProfile from "./pages/dashboard/CustomerProfile.jsx";
import CustomerAuthForm from "./pages/store/CustomerAuthForm.jsx";
import StoreAuthLayout from "./components/store/StoreAuthLayout.jsx";
import SelectSizes from "./pages/onboarding/SelectSizes.jsx";
import Privacy from "./pages/legal/Privacy.jsx";
import Terms from "./pages/legal/Terms.jsx";
import Cookies from "./pages/legal/Cookies.jsx";
import { getSubdomain } from "./lib/getSubdomain.js";

function App() {
  const subdomain = getSubdomain();

  return (
    <Routes>
      <Route path="/" element={subdomain ? <StoreLanding /> : <Landing />} />
      <Route path="/pricing" element={<PricingPage />} />
      <Route path="/privacy" element={<Privacy />} />
      <Route path="/terms" element={<Terms />} />
      <Route path="/cookies" element={<Cookies />} />
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
      <Route path="/onboarding/subdomain" element={<OnboardingSteps />} />
      <Route path="/store" element={<StoreLanding />} />
      <Route path="/dashboard" element={<ProtectedRoute requireMerchant><MerchantDashboard /></ProtectedRoute>} />
      <Route path="/sourcing" element={<ProtectedRoute requireMerchant><SourcingPage /></ProtectedRoute>} />
      <Route path="/purchases" element={<ProtectedRoute requireMerchant><PurchasesPage /></ProtectedRoute>} />
      <Route path="/account" element={<ProtectedRoute requireMerchant><AccountSettings /></ProtectedRoute>} />
      <Route path="/customers" element={<ProtectedRoute requireMerchant><CustomersPage /></ProtectedRoute>} />
      <Route path="/store/dashboard" element={<ProtectedRoute loginPath="/store/login"><CustomerDashboard /></ProtectedRoute>} />
      <Route path="/store/track" element={<ProtectedRoute loginPath="/store/login"><TrackShoe /></ProtectedRoute>} />
      <Route path="/store/profile" element={<ProtectedRoute loginPath="/store/login"><CustomerProfile /></ProtectedRoute>} />
      <Route path="/onboarding/size" element={<ProtectedRoute loginPath="/store/login"><SelectSizes /></ProtectedRoute>} />
      <Route path="/store/login" element={<StoreAuthLayout><CustomerAuthForm initialMode="login" /></StoreAuthLayout>} />
      <Route path="/store/signup" element={<StoreAuthLayout><CustomerAuthForm initialMode="signup" /></StoreAuthLayout>} />
    </Routes>
  );
}

export default App;