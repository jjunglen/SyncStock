import { Routes, Route } from "react-router-dom";
import Landing from "./pages/Landing.jsx";
import PricingPage from "./pages/Pricing.jsx";
import AuthForm from "./components/auth/AuthForm.jsx";
import ConnectShopify from "./pages/onboarding/ConnectShopify.jsx";
import OnboardingSteps from "./pages/onboarding/OnboardingSteps.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import MerchantDashboard from "./components/dashboard/MerchantDashboard.jsx"
import MarketingHeader from "./components/marketing/MarketingHeader.jsx";
import SourcingPage from "./components/dashboard/SourcingPage.jsx";
import PurchasesPage from "./pages/dashboard/PurchasesPage.jsx";
import AccountSettings from "./components/dashboard/AccountSettings.jsx";
import CustomersPage from "./components/dashboard/CustomerPage.jsx";
import StoreLanding from "./pages/StoreLanding.jsx";
import CustomerDashboard from "./pages/dashboard/CustomerDashboard.jsx";
import TrackShoe from "./pages/dashboard/TrackShoe.jsx";
import CustomerProfile from "./pages/dashboard/CustomerProfile.jsx";
import CustomerAuthForm from "./pages/store/CustomerAuthForm.jsx";


function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/pricing" element={<PricingPage />} />
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
      <Route path="/signup" element={<AuthForm initialMode="signup" />} />
      <Route path="/onboarding" element={<ConnectShopify />} />
      <Route path="/onboarding/subdomain" element={<OnboardingSteps />} />
      <Route path="/store" element={<StoreLanding />} />
      <Route path="/dashboard" element={<ProtectedRoute><MerchantDashboard /></ProtectedRoute>} />
      <Route path="/sourcing" element={<ProtectedRoute><SourcingPage /></ProtectedRoute>} />
      <Route path="/purchases" element={<ProtectedRoute><PurchasesPage /></ProtectedRoute>} />
      <Route path="/account" element={<ProtectedRoute><AccountSettings /></ProtectedRoute>} />
      <Route path="/customers" element={<ProtectedRoute><CustomersPage /></ProtectedRoute>} />
      <Route path="/store/dashboard" element={<ProtectedRoute><CustomerDashboard /></ProtectedRoute>} />
      <Route path="store/track" element={<ProtectedRoute><TrackShoe /></ProtectedRoute>} />
      <Route path="store/profile" element={<ProtectedRoute><CustomerProfile /></ProtectedRoute>} />
      <Route path="/store/login" element={<CustomerAuthForm initialMode="login" />} />
      <Route path="/store/signup" element={<CustomerAuthForm initialMode="signup" />} />
    </Routes>
  );
}

export default App;