import { useState, useRef, useEffect } from "react";
import { motion } from "motion/react";

const ease = [0.22, 1, 0.36, 1];

const POSITION_STYLES = {
  "top-right": { top: 10, right: 24 },
  "bottom-right": { bottom: 24, right: 24 },
  "bottom-center": { bottom: 24, left: "50%" },
};

export default function FloatingMenu({ items = [], position = "top-right" }) {
  const [isOpen, setIsOpen] = useState(false);
  const [panelHeight, setPanelHeight] = useState(0);
  const containerRef = useRef(null);
  const listRef = useRef(null);

  const isBottomAnchored = position === "bottom-center" || position === "bottom-right";
  const isCentered = position === "bottom-center";
  const posStyle = POSITION_STYLES[position] || POSITION_STYLES["top-right"];

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [isOpen]);

  // Size the open panel to the items' real rendered height (plus the
  // 44px Menu row) — a fixed per-item estimate clipped the top item
  const openMenu = () => {
    setPanelHeight(44 + (listRef.current?.scrollHeight || 0));
    setIsOpen(true);
  };
  const toggleMenu = () => (isOpen ? setIsOpen(false) : openMenu());

  const handleItemClick = (item) => {
    setIsOpen(false);
    item.onClick?.();
  };

  return (
    <motion.div
      ref={containerRef}
      className="fixed z-[100]"
      style={{ ...posStyle, ...(isCentered ? { x: "-50%" } : {}) }}
      initial={{ opacity: 0, y: isBottomAnchored ? 20 : -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease }}
    >
      <motion.div
        className={`relative overflow-hidden flex flex-col font-display transition-shadow duration-300 ${isBottomAnchored ? "justify-end" : ""} ${isOpen ? "ring-1 ring-border shadow-2xl shadow-black/30" : "ring-1 ring-slate-300 shadow-lg shadow-black/25"}`}
        style={{ cursor: isOpen ? "default" : "pointer" }}
        onClick={() => !isOpen && openMenu()}
        animate={{
          width: isOpen ? 220 : 110,
          height: isOpen ? panelHeight : 44,
          borderRadius: isOpen ? 24 : 72,
        }}
        whileHover={isOpen ? undefined : { scale: 1.05 }}
        transition={{
          duration: 0.8,
          ease,
          height: { duration: isOpen ? 0.8 : 0.15 },
          scale: { duration: 0.25, ease },
        }}
      >
        {/* Closed pill: cool off-white with an outline and shadow, so it
            separates from dark pages, light pages, and white shoe photos */}
        <motion.div className="absolute inset-0 bg-slate-50" style={{ borderRadius: "inherit" }} />

        {/* Open panel uses the surface color (not the page bg) so it
            stands out from the page in light and dark mode */}
        <motion.div
          className="absolute left-1/2 bg-surface"
          style={{ width: "200%", height: "200%", borderRadius: "50%", x: "-50%" }}
          animate={
            isBottomAnchored
              ? { bottom: isOpen ? "-20%" : "-200%" }
              : { top: isOpen ? "-20%" : "-200%" }
          }
          transition={{ duration: 0.8, ease, delay: isOpen ? 0.1 : 0 }}
        />

        {isBottomAnchored && (
          <div
            ref={listRef}
            className="relative z-10 flex flex-col gap-1 px-2 pt-3 order-1"
            style={{
              pointerEvents: isOpen ? "auto" : "none",
              opacity: isOpen ? 1 : 0,
              flex: isOpen ? 1 : 0,
              overflow: "hidden",
            }}
          >
            {items.map((item, idx) => {
              const Icon = item.icon;
              return (
                <motion.button
                  key={item.label}
                  onClick={() => handleItemClick(item)}
                  className={`flex items-center gap-3 text-left text-sm px-3 py-2 rounded-lg hover:bg-text/5 transition-colors ${
                    item.active ? "text-text font-medium" : "text-text-muted"
                  }`}
                  animate={{ opacity: isOpen ? 1 : 0, y: isOpen ? 0 : 8 }}
                  transition={{ duration: 0.3, delay: isOpen ? 0.35 + 0.06 * idx : 0, ease }}
                >
                  {Icon && <Icon size={16} />}
                  {item.label}
                </motion.button>
              );
            })}
          </div>
        )}

        <motion.div
          className={`relative z-10 flex items-center justify-between w-full shrink-0 cursor-pointer ${isBottomAnchored ? "order-2" : ""}`}
          onClick={toggleMenu}
          animate={{ paddingLeft: isOpen ? 20 : 18, paddingRight: isOpen ? 20 : 18 }}
          transition={{ duration: 0.8, ease }}
          style={{ height: 44, alignItems: "center" }}
        >
          {/* Closed: dark on the off-white pill. Open: the theme's text color on
              the surface-colored panel, so it reads in light and dark mode */}
          <span
            className={`text-sm font-medium transition-colors duration-300 ${isOpen ? "text-text" : "text-neutral-950"}`}
          >
            Menu
          </span>
          <div className="relative w-5 h-5 flex items-center justify-center">
            <motion.span
              className={`absolute block w-[16px] h-[2px] rounded-full transition-colors duration-300 ${isOpen ? "bg-text" : "bg-neutral-950"}`}
              animate={{ rotate: isOpen ? 45 : 0, y: isOpen ? 0 : -3 }}
              transition={{ duration: 0.4, ease }}
            />
            <motion.span
              className={`absolute block w-[16px] h-[2px] rounded-full transition-colors duration-300 ${isOpen ? "bg-text" : "bg-neutral-950"}`}
              animate={{ rotate: isOpen ? -45 : 0, y: isOpen ? 0 : 3 }}
              transition={{ duration: 0.4, ease }}
            />
          </div>
        </motion.div>

        {!isBottomAnchored && (
          <div
            ref={listRef}
            className="relative z-10 flex flex-col gap-1 px-2 pb-3"
            style={{
              pointerEvents: isOpen ? "auto" : "none",
              opacity: isOpen ? 1 : 0,
              flex: isOpen ? 1 : 0,
              overflow: "hidden",
            }}
          >
            {items.map((item, idx) => {
              const Icon = item.icon;
              return (
                <motion.button
                  key={item.label}
                  onClick={() => handleItemClick(item)}
                  className={`flex items-center gap-3 text-left text-sm px-3 py-2 rounded-lg hover:bg-text/5 transition-colors ${
                    item.active ? "text-text font-medium" : "text-text-muted"
                  }`}
                  animate={{ opacity: isOpen ? 1 : 0, x: isOpen ? 0 : -8 }}
                  transition={{ duration: 0.3, delay: isOpen ? 0.35 + 0.06 * idx : 0, ease }}
                >
                  {Icon && <Icon size={16} />}
                  {item.label}
                </motion.button>
              );
            })}
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}