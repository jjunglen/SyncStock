const POSITION_CLASSES = {
  top: "top-0",
  bottom: "bottom-0",
  center: "top-1/2 -translate-y-1/2",
};

export default function Glow({ variant = "bottom", className = "" }) {
  const positionClass = POSITION_CLASSES[variant] ?? POSITION_CLASSES.bottom;

  return (
    <div className={`absolute w-full ${positionClass} ${className}`}>
      <div
        className="absolute left-1/2 h-64 sm:h-[512px] w-[60%] -translate-x-1/2 scale-[2.5] rounded-[50%]"
        style={{
          background:
            "radial-gradient(ellipse at center, rgba(255,255,255,0.15) 10%, transparent 60%)",
        }}
      />
      <div
        className="absolute left-1/2 h-32 sm:h-64 w-[40%] -translate-x-1/2 scale-[2] rounded-[50%]"
        style={{
          background:
            "radial-gradient(ellipse at center, rgba(255,255,255,0.25) 10%, transparent 60%)",
        }}
      />
    </div>
  );
}
