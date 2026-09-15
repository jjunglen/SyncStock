const COLOR_MAP = {
live: "var(--color-live)",
alert: "var(--color-warn)",
idle: "var(--color-text-muted)",
danger: "var(--color-danger)",
};

const SIZE_MAP = {
sm: "w-1.5 h-1.5",
md: "w-2 h-2",
lg: "w-2.5 h-2.5",
};

export default function SignalDot({
tone = "live",
size = "md",
pulse = true,
className = "",
}) {
const color = COLOR_MAP[tone] ?? COLOR_MAP.live;
const dimension = SIZE_MAP[size] ?? SIZE_MAP.md;

return (
    <span
    className={`relative inline-flex ${dimension} ${className}`}
    style={{ "--pulse-color": color }}
    >
    <span
        className={`absolute inset-0 rounded-full ${pulse ? "animate-signal-pulse" : ""}`}
        style={{ backgroundColor: color }}
    />
    <span
        className="relative inline-flex w-full h-full rounded-full"
        style={{ backgroundColor: color }}
    />
    </span>
);
}
