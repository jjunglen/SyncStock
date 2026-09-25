import MarketingHeader from "../components/marketing/MarketingHeader.jsx";
import HeroSection from "../components/marketing/HeroSection.jsx";
import ChannelsSection from "../components/marketing/ChannelsSection.jsx";
import FeaturesSection from "../components/marketing/FeaturesSection.jsx";
import StatsSection from "../components/marketing/StatsSection.jsx";
import PricingSection from "../components/marketing/PricingSection.jsx";
import FAQSection from "../components/marketing/FAQSection.jsx";
import CTASection from "../components/marketing/CTASection.jsx";
import Footer from "../components/marketing/Footer.jsx";

// Merchant landing page. Section flow adapted from Launch UI (MIT —
// components/marketing/LAUNCH_UI_LICENSE.md): hero → channels →
// features → stats → pricing → FAQ → CTA.
export default function Landing() {
  return (
    <div className="relative min-h-screen bg-bg text-text">
      <div aria-hidden="true" className="pointer-events-none fixed inset-0">
        <div className="layout-lines mx-auto h-full max-w-6xl" />
      </div>
      <MarketingHeader />
      <main className="relative">
        <HeroSection />
        <ChannelsSection />
        <FeaturesSection />
        <StatsSection />
        <PricingSection />
        <FAQSection />
        <CTASection />
      </main>
      <Footer />
    </div>
  );
}
