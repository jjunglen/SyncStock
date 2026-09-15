import { Routes, Route } from "react-router-dom";
import Landing from "./pages/Landing.jsx";
import PricingPage from "./pages/Pricing.jsx";
import AuthForm from "./components/auth/AuthForm.jsx";
import ConnectShopify from "./pages/onboarding/ConnectShopify.jsx";
import OnboardingSteps from "./pages/onboarding/OnboardingSteps.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import MerchantDashboard from "./components/dashboard/MerchantDashboard.jsx"
import SourcingPage from "./components/dashboard/SourcingPage.jsx";
import PurchasesPage from "./pages/dashboard/PurchasesPage.jsx";
import AccountSettings from "./components/dashboard/AccountSettings.jsx";
import CustomersPage from "./components/dashboard/CustomerPage.jsx";

function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/pricing" element={<PricingPage />} />
      <Route path="/login" element={<AuthForm initialMode="login" />} />
      <Route path="/signup" element={<AuthForm initialMode="signup" />} />
      <Route path="/onboarding" element={<ConnectShopify />} />
      <Route path="/onboarding/subdomain" element={<OnboardingSteps />} />
      <Route path="/dashboard" element={<ProtectedRoute><MerchantDashboard /></ProtectedRoute>} />
      <Route path="/sourcing" element={<ProtectedRoute><SourcingPage /></ProtectedRoute>} />
      <Route path="/purchases" element={<ProtectedRoute><PurchasesPage /></ProtectedRoute>} />
      <Route path="/account" element={<ProtectedRoute><AccountSettings /></ProtectedRoute>} />
      <Route path="/customers" element={<ProtectedRoute><CustomersPage /></ProtectedRoute>} />
    </Routes>
  );
}

export default App;