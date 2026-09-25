import * as React from "react";
import { LayoutGroup, motion } from "motion/react";
import Button from "./Button.jsx";

const LayoutContext = React.createContext("2col");

const LAYOUT_CONFIGS = [
  { mode: "list", className: "flex flex-col space-y-3", label: "List view" },
  { mode: "2col", className: "grid grid-cols-2 gap-4", label: "2 column" },
  {
    mode: "4col",
    className: "grid grid-cols-2 md:grid-cols-4 gap-4",
    label: "4 column",
  },
];

const ANIMATION_VARIANTS = {
  container: {
    list: { transition: { staggerChildren: 0.02 } },
    "2col": { transition: { staggerChildren: 0.05 } },
    "4col": { transition: { staggerChildren: 0.08 } },
  },
  card: {
    hidden: { opacity: 0, y: 16 },
    visible: { opacity: 1, y: 0 },
  },
};

const LayoutButton = ({ isSelected, onClick, isMiddle, label, mode }) => (
  <div className={`relative ${mode === "4col" ? "hidden md:block" : ""}`}>
    {isSelected && (
      <motion.div
        className="absolute inset-0 bg-text/10 rounded-sm"
        layoutId="layout-toggle-bg"
        transition={{ type: "spring", stiffness: 400, damping: 35 }}
      />
    )}
    <Button
      onClick={onClick}
      variant="ghost"
      size="sm"
      className={`relative rounded-sm text-xs px-3 py-1.5 h-auto
        ${isMiddle ? "border-x border-border" : ""}
        ${isSelected ? "text-text" : "text-text-muted hover:text-text"}
      `}
    >
      {label}
    </Button>
  </div>
);

export const ContainerToggle = React.forwardRef(
  ({ children, className = "", ...props }, ref) => {
    const [modeIndex, setModeIndex] = React.useState(1);
    const currentConfig = LAYOUT_CONFIGS[modeIndex];

    return (
      <LayoutContext.Provider value={currentConfig.mode}>
        <div ref={ref} className={className} {...props}>
          <div className="mb-4 flex w-fit rounded-sm border border-border bg-surface overflow-hidden">
            {LAYOUT_CONFIGS.map((config, idx) => (
              <LayoutButton
                key={config.mode}
                isSelected={modeIndex === idx}
                onClick={() => setModeIndex(idx)}
                isMiddle={idx > 0 && idx < LAYOUT_CONFIGS.length - 1}
                label={config.label}
                mode={config.mode}
              />
            ))}
          </div>
          <LayoutGroup>
            <motion.div
              layout
              variants={ANIMATION_VARIANTS.container}
              initial="hidden"
              animate={currentConfig.mode}
              className={currentConfig.className}
            >
              {children}
            </motion.div>
          </LayoutGroup>
        </div>
      </LayoutContext.Provider>
    );
  },
);
ContainerToggle.displayName = "ContainerToggle";

export const CellToggle = React.forwardRef(
  ({ className = "", onClick, children, ...props }, ref) => {
    const layout = React.useContext(LayoutContext);

    return (
      <motion.div
        layout
        variants={ANIMATION_VARIANTS.card}
        initial="hidden"
        animate="visible"
        whileHover={{ scale: layout === "list" ? 1 : 1.02 }}
        transition={{ type: "spring", stiffness: 300, damping: 28 }}
        exit="hidden"
        className={`bg-linear-to-b from-card to-card-end border border-border rounded-xl overflow-hidden cursor-pointer hover:border-text/20 transition-colors ${className}`}
        onClick={onClick}
        ref={ref}
        {...props}
      >
        {typeof children === "function" ? children(layout) : children}
      </motion.div>
    );
  },
);
CellToggle.displayName = "CellToggle";

export function useLayout() {
  return React.useContext(LayoutContext);
}
