export default function Spinner({ size = 16, color = "currentColor" }) {
  return (
    <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        className="animate-spin"
    >
        <circle cx="12" cy="12" r="9" stroke={color} strokeWidth="3" opacity="0.25" />
        <path d="M21 12a9 9 0 0 0-9-9" stroke={color} strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}