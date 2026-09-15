import MarketingHeader from "../components/marketing/MarketingHeader.jsx";
import HeroSection from "../components/marketing/HeroSection.jsx";
import LiveDemoSection from "../components/marketing/LiveDemoSection.jsx";
import HowItWorksGrid from "../components/marketing/HowItWorksGrid.jsx";
import PricingTeaser from "../components/marketing/PricingTeaser.jsx";
import CTASection from "../components/marketing/CTASection.jsx";
import Footer from "../components/marketing/Footer.jsx";
import ScrollReveal from "../components/ui/ScrollReveal.jsx";

export default function Landing() {
  return (
    <div className="min-h-screen bg-bg text-text">
      <MarketingHeader />
      <div className="pt-16">
        <HeroSection />

        <ScrollReveal>
          <LiveDemoSection />
        </ScrollReveal>

        <ScrollReveal>
          <div id="how-it-works" className="max-w-6xl mx-auto px-4 py-16">
            <HowItWorksGrid />
          </div>
        </ScrollReveal>

        <ScrollReveal>
          <div id="pricing">
            <PricingTeaser />
          </div>
        </ScrollReveal>

        <ScrollReveal>
          <CTASection />
        </ScrollReveal>
      </div>
      <Footer />
    </div>
  );
}
