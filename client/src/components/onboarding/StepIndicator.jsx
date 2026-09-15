const STEPS = ["Connect", "Subdomain", "Plan", "Login"];

export default function StepIndicator({ currentStep }) {
    return (
        <div className="flex items-center justify-center gap-2 mb-8">
        {STEPS.map((label, idx) => {
            const step = idx + 1;
            const isActive = step === currentStep;
            const isComplete = step < currentStep;

            return (
            <div key={label} className="flex items-center gap-2">
                <div
                className={`w-2 h-2 rounded-full transition-colors ${
                    isActive || isComplete ? "bg-primary" : "bg-border"
                }`}
                />
                {step < STEPS.length && <div className="w-8 h-px bg-border" />}
            </div>
            );
        })}
        </div>
    );
}
