import { motion, AnimatePresence } from "motion/react";
import { useEffect, useState } from "react";
import { LuCheck } from "react-icons/lu";
import api from "../../lib/api.js";
import { CATEGORY_META, SIZES_BY_CATEGORY, categoryLabel } from "../../lib/categories.js";

const transitionProps = {
  type: "spring",
  stiffness: 500,
  damping: 30,
  mass: 0.5,
};

// One group of sizes per category the store carries that has sizes
// (sneakers, clothing, and "other" when the store set a size chart on its
// Size settings page — trading cards have none). Falls back to sneaker
// sizes if the store's categories can't be loaded.
//   categories — show just these categories (skips the lookup)
//   sizes      — show just this list of sizes, no groups
export default function SizeSelector({ selected, onChange, categories, sizes: onlySizes }) {
  const [loadedGroups, setLoadedGroups] = useState(["sneakers"]);
  // The store's "other" size chart: { title, sizes }
  const [otherChart, setOtherChart] = useState(null);
  const groups = categories || loadedGroups;
  const fixed = !!(categories || onlySizes);

  useEffect(() => {
    if (fixed) return;
    api
      .get("/inventory/categories")
      .then((res) => {
        const list = res.data.data || [];
        const other = list.find((c) => c.key === "other" && c.sizes?.length > 0);
        if (other) {
          const name = categoryLabel("other", other.name);
          setOtherChart({ title: other.size_label ? `${name} · ${other.size_label}` : name, sizes: other.sizes });
        }
        const sized = list
          .map((c) => c.key)
          .filter((key) => SIZES_BY_CATEGORY[key]?.length > 0 || (key === "other" && other));
        if (sized.length > 0) setLoadedGroups(sized);
      })
      .catch(() => {});
  }, [fixed]);

  const toggleSize = (size) => {
    onChange(
      selected.includes(size)
        ? selected.filter((s) => s !== size)
        : [...selected, size],
    );
  };

  const renderGroup = (sizes) => (
    <motion.div
      className="flex flex-wrap gap-3 overflow-visible"
      layout
      transition={transitionProps}
    >
      {sizes.map((size) => {
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
                ? "text-text ring-text/20"
                : "text-text-muted ring-text/5"
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

  const sizesFor = (key) => (key === "other" ? otherChart?.sizes || [] : SIZES_BY_CATEGORY[key] || []);
  const titleFor = (key) => (key === "other" ? otherChart?.title : CATEGORY_META[key]?.label);

  if (onlySizes) return renderGroup(onlySizes);
  if (groups.length === 1) return renderGroup(sizesFor(groups[0]));

  return (
    <div className="flex flex-col gap-6">
      {groups.map((key) => (
        <div key={key}>
          <p className="text-xs text-text-muted mb-3">
            {titleFor(key)}
          </p>
          {renderGroup(sizesFor(key))}
        </div>
      ))}
    </div>
  );
}
