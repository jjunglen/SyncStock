import Button from "../ui/Button.jsx";
import Glow from "../ui/Glow.jsx";

export default function CTASection() {
return (
    <section className="group relative overflow-hidden py-24">
    <div className="relative z-10 max-w-2xl mx-auto flex flex-col items-center gap-6 text-center px-4">
        <h2 className="font-display text-3xl sm:text-5xl font-semibold animate-appear">
        Stop losing sales to "sold out"
        </h2>
        <p className="text-text-muted max-w-xl animate-appear [animation-delay:50ms]">
        Connect your Shopify store and your next restock starts selling itself.
        </p>
        <Button to="/onboarding" variant="primary" size="lg" className="animate-appear [animation-delay:100ms]">
            Connect your Shopify store
        </Button>
    </div>
    <div className="absolute inset-0 opacity-80 transition-all duration-500 ease-in-out group-hover:-translate-y-8 group-hover:opacity-100">
        <Glow
        variant="bottom"
        className="animate-appear-zoom [animation-delay:300ms]"
        />
    </div>
    </section>
);
}
