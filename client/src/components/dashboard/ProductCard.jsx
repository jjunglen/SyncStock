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
      <>
        <div className="relative w-full aspect-[4/3] md:aspect-[2/1] bg-white overflow-hidden">
          {item.image_url ? (
            <img
              src={item.image_url}
              alt={item.product_name}
              className="w-full h-full object-contain p-6 md:p-10 transition-transform duration-300 group-hover:scale-[1.03]"
            />
          ) : (
            <div className="w-full h-full bg-neutral-200" />
          )}
          {conditionLabel(item.condition) && (
            <span
              className={`absolute top-3 left-3 text-base font-medium px-2.5 py-1 rounded-full ${item.condition === "brand_new" ? "bg-live text-white" : "bg-black/70 text-white"}`}
            >
              {conditionLabel(item.condition)}
            </span>
          )}
          {item.size && (
            <span className="absolute top-3 right-3 text-base px-2.5 py-1 rounded-full font-medium bg-black/70 text-white">
            {item.size}
          </span>
          )}
        </div>
        <div className="flex items-center justify-between gap-4 bg-white px-4 py-3">
          <p className="text-lg text-neutral-500 truncate">
            {item.product_name}
          </p>
          <span className="text-lg font-medium text-neutral-900 shrink-0">
            ${parseFloat(item.price).toFixed(0)}
          </span>
        </div>
      </>
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
          <span
            className={`absolute top-2 left-2 text-[10px] font-medium px-2 py-0.5 rounded-full ${item.condition === "brand_new" ? "bg-live text-white" : "bg-black/60 text-white"}`}
          >
            {conditionLabel(item.condition)}
          </span>
        )}
        {item.size && (
          <span className="absolute top-2 right-2 text-[10px] px-2 py-0.5 rounded-full font-medium bg-black/60 text-white">
          {item.size}
        </span>
        )}
      </div>
      <div className="p-3">
        <p className="text-xs md:text-sm font-medium text-text leading-tight line-clamp-2 mb-2 min-h-[2.5rem]">
          {item.product_name}
        </p>
        <div className="flex items-center justify-between">
          <span className="text-lg font-semibold text-text">
            ${parseFloat(item.price).toFixed(0)}
          </span>
          <span className="text-xs font-medium bg-text/5 text-text-muted px-2.5 py-1 rounded-lg">
            View →
          </span>
        </div>
      </div>
    </>
  );
}
