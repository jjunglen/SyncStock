import SignalDot from "./SignalDot.jsx";

const TONE_CLASSES = {
    neutral: "bg-surface text-text-muted border-border",
    live: "bg-surface text-text-muted border-border",
    warn: "bg-warn/10 text-warn border-warn/30",
    danger: "bg-danger/10 text-danger border-danger/30",
};

export default function Badge({ tone = "neutral", children, className = "" }) {
    const toneClass = TONE_CLASSES[tone] ?? TONE_CLASSES.neutral;

    return (
        <span
            className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border ${toneClass} ${className}`}
        >
            {tone === "live" && <SignalDot tone="live" size="sm" pulse={false} />}
            {children}
        </span>
    );
}
