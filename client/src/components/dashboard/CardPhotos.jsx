import { useMemo, useRef, useState } from "react";
import { LuChevronLeft, LuChevronRight } from "react-icons/lu";

// A product card's photos, swipeable right on the card (Browse inventory,
// In stock) so shoppers can flip through them without opening it.
// Phones swipe (native scroll-snap); desktops get arrows on hover (and
// trackpad swipes). A tap on a photo still opens the product; the arrows
// keep their clicks inside the card. Dots show where you are.
// Fills its parent (a sized, relative photo box).

const MAX_PHOTOS = 8;

export default function CardPhotos({ item, imgClassName = "", emptyClassName = "bg-surface-muted", large = false }) {
  const photos = useMemo(() => {
    const list = item.image_urls?.length ? item.image_urls : [item.image_url];
    return [...new Set(list.filter(Boolean))].slice(0, MAX_PHOTOS);
  }, [item.image_urls, item.image_url]);
  const scroller = useRef(null);
  const [index, setIndex] = useState(0);

  if (!photos.length) return <div className={`h-full w-full ${emptyClassName}`} />;

  if (photos.length === 1) {
    return <img src={photos[0]} alt={item.product_name} className={`h-full w-full object-contain ${imgClassName}`} />;
  }

  const onScroll = () => {
    const el = scroller.current;
    if (el) setIndex(Math.round(el.scrollLeft / el.clientWidth));
  };

  const go = (e, step) => {
    e.preventDefault();
    e.stopPropagation();
    const el = scroller.current;
    if (!el) return;
    const next = (index + step + photos.length) % photos.length;
    el.scrollTo({ left: next * el.clientWidth, behavior: "smooth" });
  };

  const arrow = `absolute top-1/2 -translate-y-1/2 z-[1] hidden items-center justify-center rounded-full bg-white/90 text-neutral-800 shadow-sm ring-1 ring-black/10 transition-opacity hover:bg-white md:flex md:opacity-0 md:group-hover/photos:opacity-100 focus-visible:opacity-100 ${
    large ? "h-10 w-10" : "h-8 w-8"
  }`;

  return (
    <div className="group/photos relative h-full w-full">
      <div
        ref={scroller}
        onScroll={onScroll}
        className="flex h-full w-full snap-x snap-mandatory overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        aria-label={`${photos.length} photos of ${item.product_name}`}
      >
        {photos.map((src, i) => (
          <img
            key={src}
            src={src}
            alt={i === 0 ? item.product_name : ""}
            loading={i === 0 ? undefined : "lazy"}
            draggable={false}
            className={`h-full w-full shrink-0 snap-center snap-always object-contain ${imgClassName}`}
          />
        ))}
      </div>

      <button type="button" onClick={(e) => go(e, -1)} aria-label="Previous photo" className={`${arrow} left-2`}>
        <LuChevronLeft size={large ? 20 : 16} aria-hidden="true" />
      </button>
      <button type="button" onClick={(e) => go(e, 1)} aria-label="Next photo" className={`${arrow} right-2`}>
        <LuChevronRight size={large ? 20 : 16} aria-hidden="true" />
      </button>

      <div className="pointer-events-none absolute inset-x-0 bottom-2 flex justify-center gap-1" aria-hidden="true">
        {photos.map((src, i) => (
          <span
            key={src}
            className={`h-1.5 rounded-full transition-all ${i === index ? "w-3 bg-neutral-800" : "w-1.5 bg-neutral-400/70"}`}
          />
        ))}
      </div>
    </div>
  );
}
