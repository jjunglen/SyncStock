import { Link } from "react-router-dom";
import Button from "../ui/Button.jsx";

export default function PricingTeaser() {
  return (
    <div className="text-center py-16">
      <h2 className="font-display text-2xl md:text-3xl font-semibold mb-3">
        Simple, transparent pricing
      </h2>
      <p className="text-text-muted mb-6">
        One plan. Everything included. No hidden fees.
      </p>
      <Link to="/pricing">
        <Button variant="primary" size="lg">
          Go to pricing
        </Button>
      </Link>
    </div>
  );
}
