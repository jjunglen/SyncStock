import { Link } from "react-router-dom";
import Button from "../ui/Button.jsx";
import Glow from "../ui/Glow.jsx";

export default function HeroSection() {
  return (
    <div className="w-full relative min-h-screen flex items-center justify-center overflow-hidden">
      <div
        className="absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(125% 125% at 50% 10%, #0a0a0a 20%, #3a3a3a 100%)",
        }}
      />

      <div className="absolute inset-0 -z-10 pointer-events-none">
        <Glow variant="top" />
      </div>

      <div className="relative z-10 text-center max-w-xl px-4 py-32">
        <h1 className="font-display text-4xl md:text-5xl font-semibold leading-tight mb-4">
          Turn every restock into a sale
        </h1>
        <p className="text-text-muted text-base md:text-lg leading-relaxed mb-8">
          Connect your Shopify store in minutes. Syncstock handles restock
          alerts automatically — so every sold-out size turns into a sale
          instead of a missed opportunity.
        </p>
        <div className="flex gap-3 justify-center flex-wrap">
          <Link to="/onboarding">
            <Button variant="primary" size="lg">
              Connect your Shopify store
            </Button>
          </Link>
          <a href="#how-it-works">
            <Button variant="secondary" size="lg">
              See how it works
            </Button>
          </a>
        </div>
      </div>
    </div>
  );
}
