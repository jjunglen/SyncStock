import Spinner from "./Spinner.jsx";

const VARIANT_CLASSES = {
  primary: "bg-primary text-primary-text hover:opacity-90 active:opacity-90",
  secondary: "bg-surface text-text border border-border hover:border-white/20",
  ghost: "bg-transparent text-text hover:bg-white/5",
  danger: "bg-danger text-white hover:brightness-110",
  warning: "bg-warn text-[#2b1a00] hover:brightness-110",
};

const DISABLED_CLASSES =
  "bg-white/5 text-text-muted border border-border cursor-not-allowed";

const SIZE_CLASSES = {
  xs: "px-2 h-6 text-xs gap-1",
  sm: "px-3 h-8 text-sm gap-1.5",
  md: "px-4 h-10 text-sm gap-2",
  lg: "px-5 h-12 text-base gap-2",
};

const ICON_SIZE_CLASSES = {
  xs: "w-6 h-6 text-xs",
  sm: "w-8 h-8 text-sm",
  md: "w-10 h-10 text-sm",
  lg: "w-12 h-12 text-base",
};

const SHAPE_CLASSES = {
  square: "rounded-lg",
  circle: "rounded-full",
  rounded: "rounded-full",
};

export default function Button({
  variant = "primary",
  size = "md",
  shape = "square",
  iconOnly = false,
  prefix,
  suffix,
  shadow = false,
  loading = false,
  disabled = false,
  fullWidth = false,
  type = "button",
  className = "",
  children,
  ...props
}) {
  const isDisabled = disabled || loading;
  const stateClass = isDisabled
    ? DISABLED_CLASSES
    : (VARIANT_CLASSES[variant] ?? VARIANT_CLASSES.primary);
  const sizeClass =
    (iconOnly ? ICON_SIZE_CLASSES : SIZE_CLASSES)[size] ?? SIZE_CLASSES.md;
  const shapeClass = SHAPE_CLASSES[shape] ?? SHAPE_CLASSES.square;

  return (
    <button
      type={type}
      disabled={isDisabled}
      className={`inline-flex items-center justify-center font-medium transition-colors duration-150
        ${stateClass} ${sizeClass} ${shapeClass}
        ${shadow ? "shadow-md" : ""}
        ${fullWidth ? "w-full" : ""}
        ${className}`}
      {...props}
    >
      {loading ? <Spinner size={size === "lg" ? 20 : 14} /> : prefix}
      {!iconOnly && children && (
        <span className="overflow-hidden whitespace-nowrap text-ellipsis">
          {children}
        </span>
      )}
      {iconOnly && !loading && children}
      {!loading && suffix}
    </button>
  );
}
