import { useLayout } from "../ui/AnimatedToggleLayout.jsx";

function conditionLabel(condition) {
  if (condition === "brand_new") return "Brand New";
  if (condition === "pre_owned") return "Pre-Owned";
  return null;
}

export default function ProductCard({ item }) {
  const layout = useLayout();

  if (layout === "list") {
    return (
      <div className="flex items-center gap-3 p-3">
        <div className="w-16 h-16 bg-white rounded-lg shrink-0 overflow-hidden">
          {item.image_url ? (
            <img
              src={item.image_url}
              alt={item.product_name}
              className="w-full h-full object-contain p-1"
            />
          ) : (
            <div className="w-full h-full bg-surface-muted" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-text leading-tight line-clamp-2 mb-1">
            {item.product_name}
          </p>
          <div className="flex items-center gap-2">
            <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-surface-muted text-text-muted">
              {item.size}
            </span>
            {conditionLabel(item.condition) && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-white/5 text-text-muted">
                {conditionLabel(item.condition)}
              </span>
            )}
          </div>
        </div>
        <div className="text-right shrink-0">
          <p className="text-sm font-semibold text-text">
            ${parseFloat(item.price).toFixed(0)}
          </p>
          <span className="text-xs text-text-muted">View →</span>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="relative w-full h-44 md:h-52 bg-white rounded-t-xl overflow-hidden">
        {item.image_url ? (
          <img
            src={item.image_url}
            alt={item.product_name}
            className="w-full h-full object-contain p-2"
          />
        ) : (
          <div className="w-full h-full bg-surface-muted" />
        )}
        {conditionLabel(item.condition) && (
          <span className="absolute top-2 left-2 text-[10px] font-medium px-2 py-0.5 rounded-full bg-black/60 text-white">
            {conditionLabel(item.condition)}
          </span>
        )}
        <span className="absolute top-2 right-2 text-[10px] px-2 py-0.5 rounded-full font-medium bg-black/60 text-white">
          {item.size}
        </span>
      </div>
      <div className="p-3">
        <p className="text-xs md:text-sm font-medium text-text leading-tight line-clamp-2 mb-2 min-h-[2.5rem]">
          {item.product_name}
        </p>
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-text">
            ${parseFloat(item.price).toFixed(0)}
          </span>
          <span className="text-xs font-medium bg-white/5 text-text-muted px-2.5 py-1 rounded-lg">
            View →
          </span>
        </div>
      </div>
    </>
  );
}
