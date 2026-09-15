import { useState, useRef, useEffect } from "react";
import { motion } from "motion/react";

const ease = [0.22, 1, 0.36, 1];

export default function FloatingMenu({ items = [], position = "top-right" }) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);
  const isBottom = position === "bottom-center";

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

  const handleItemClick = (item) => {
    setIsOpen(false);
    item.onClick?.();
  };

  const panelHeight = 40 + items.length * 44 + 24;

  return (
    <motion.div
      ref={containerRef}
      className={`fixed z-[100] ${isBottom ? "bottom-6 left-1/2" : "top-2.5 right-6"}`}
      style={isBottom ? { x: "-50%" } : undefined}
      initial={{ opacity: 0, y: isBottom ? 20 : -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease }}
    >
      <motion.div
        className={`relative overflow-hidden flex flex-col font-display ${isBottom ? "justify-end" : ""}`}
        style={{ cursor: isOpen ? "default" : "pointer" }}
        onClick={() => !isOpen && setIsOpen(true)}
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
        <motion.div
          className="absolute inset-0 bg-primary"
          style={{ borderRadius: "inherit" }}
        />

        <motion.div
          className="absolute left-1/2 bg-bg"
          style={{
            width: "200%",
            height: "200%",
            borderRadius: "50%",
            x: "-50%",
          }}
          animate={
            isBottom
              ? { bottom: isOpen ? "-20%" : "-200%" }
              : { top: isOpen ? "-20%" : "-200%" }
          }
          transition={{ duration: 0.8, ease, delay: isOpen ? 0.1 : 0 }}
        />

        {isBottom && (
          <div
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
                  className={`flex items-center gap-3 text-left text-sm px-3 py-2 rounded-lg hover:bg-white/5 transition-colors ${
                    item.active ? "text-text font-medium" : "text-text-muted"
                  }`}
                  animate={{ opacity: isOpen ? 1 : 0, y: isOpen ? 0 : 8 }}
                  transition={{
                    duration: 0.3,
                    delay: isOpen ? 0.35 + 0.06 * idx : 0,
                    ease,
                  }}
                >
                  {Icon && <Icon size={16} />}
                  {item.label}
                </motion.button>
              );
            })}
          </div>
        )}

        <motion.div
          className={`relative z-10 flex items-center justify-between w-full shrink-0 cursor-pointer ${isBottom ? "order-2" : ""}`}
          onClick={() => setIsOpen(!isOpen)}
          animate={{
            paddingLeft: isOpen ? 20 : 18,
            paddingRight: isOpen ? 20 : 18,
          }}
          transition={{ duration: 0.8, ease }}
          style={{ height: 44, alignItems: "center" }}
        >
          <motion.span
            className="text-sm font-medium"
            animate={{ color: isOpen ? "#fafafa" : "#0a0a0a" }}
            transition={{ duration: 0.3, ease }}
          >
            Menu
          </motion.span>
          <div className="relative w-5 h-5 flex items-center justify-center">
            <motion.span
              className="absolute block w-[16px] h-[2px] rounded-full"
              animate={{
                rotate: isOpen ? 45 : 0,
                y: isOpen ? 0 : -3,
                backgroundColor: isOpen ? "#fafafa" : "#0a0a0a",
              }}
              transition={{ duration: 0.4, ease }}
            />
            <motion.span
              className="absolute block w-[16px] h-[2px] rounded-full"
              animate={{
                rotate: isOpen ? -45 : 0,
                y: isOpen ? 0 : 3,
                backgroundColor: isOpen ? "#fafafa" : "#0a0a0a",
              }}
              transition={{ duration: 0.4, ease }}
            />
          </div>
        </motion.div>

        {!isBottom && (
          <div
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
                  className={`flex items-center gap-3 text-left text-sm px-3 py-2 rounded-lg hover:bg-white/5 transition-colors ${
                    item.active ? "text-text font-medium" : "text-text-muted"
                  }`}
                  animate={{ opacity: isOpen ? 1 : 0, x: isOpen ? 0 : -8 }}
                  transition={{
                    duration: 0.3,
                    delay: isOpen ? 0.35 + 0.06 * idx : 0,
                    ease,
                  }}
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
