import { motion, AnimatePresence } from "motion/react";
import { LuCheck } from "react-icons/lu";

const SIZES = [
  "3.5M/5W",
  "4M/5.5W",
  "4.5M/6W",
  "5M/6.5W",
  "5.5M/7W",
  "6M/7.5W",
  "6.5M/8W",
  "7M/8.5W",
  "7.5M/9W",
  "8M/9.5W",
  "8.5M/10W",
  "9M/10.5W",
  "9.5M/11W",
  "10M/11.5W",
  "10.5M/12W",
  "11M/12.5W",
  "11.5M/13W",
  "12M/13.5W",
  "12.5M/14W",
  "13M/14.5W",
  "13.5M/15W",
  "14M/15.5W",
  "14.5M/16W",
  "15M",
  "16M",
  "17M",
];

const transitionProps = {
  type: "spring",
  stiffness: 500,
  damping: 30,
  mass: 0.5,
};

export default function SizeSelector({ selected, onChange }) {
  const toggleSize = (size) => {
    onChange(
      selected.includes(size)
        ? selected.filter((s) => s !== size)
        : [...selected, size],
    );
  };

  return (
    <motion.div
      className="flex flex-wrap gap-3 overflow-visible"
      layout
      transition={transitionProps}
    >
      {SIZES.map((size) => {
        const isSelected = selected.includes(size);
        return (
          <motion.button
            key={size}
            type="button"
            onClick={() => toggleSize(size)}
            layout
            initial={false}
            animate={{
              backgroundColor: isSelected
                ? "var(--color-surface)"
                : "rgba(255,255,255,0.05)",
            }}
            whileHover={{
              backgroundColor: isSelected
                ? "var(--color-surface)"
                : "rgba(255,255,255,0.08)",
            }}
            transition={{
              ...transitionProps,
              backgroundColor: { duration: 0.1 },
            }}
            className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap overflow-hidden ring-1 ring-inset ${
              isSelected
                ? "text-text ring-white/20"
                : "text-text-muted ring-white/5"
            }`}
          >
            <motion.div
              className="relative flex items-center"
              animate={{
                width: isSelected ? "auto" : "100%",
                paddingRight: isSelected ? "1.5rem" : "0",
              }}
              transition={{ ease: [0.175, 0.885, 0.32, 1.275], duration: 0.3 }}
            >
              <span>{size}</span>
              <AnimatePresence>
                {isSelected && (
                  <motion.span
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0, opacity: 0 }}
                    transition={transitionProps}
                    className="absolute right-0"
                  >
                    <div className="w-4 h-4 rounded-full bg-primary flex items-center justify-center">
                      <LuCheck
                        className="w-3 h-3 text-primary-text"
                        strokeWidth={2}
                      />
                    </div>
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.div>
          </motion.button>
        );
      })}
    </motion.div>
  );
}
