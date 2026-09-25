import { SiShopify } from "react-icons/si";
import { LuMail, LuMessageSquare, LuBellRing } from "react-icons/lu";
import Section from "./Section.jsx";

// Adapted from Launch UI's logos row (MIT — see LAUNCH_UI_LICENSE.md)
const CHANNELS = [
  { name: "Shopify", note: "Catalog sync", icon: SiShopify },
  { name: "Email", note: "Digest alerts", icon: LuMail },
  { name: "Text", note: "SMS included", icon: LuMessageSquare },
  { name: "Push", note: "Web notifications", icon: LuBellRing },
];

export default function ChannelsSection() {
  return (
    <Section>
      <div className="max-w-6xl mx-auto flex flex-col items-center gap-8 text-center">
        <div className="flex flex-col items-center gap-4">
          <span className="rounded-full border border-live/30 px-2.5 py-1 text-xs font-semibold text-live">
            Plugs into your store
          </span>
          <h2 className="font-display text-base font-semibold sm:text-2xl">
            One Shopify connection. Every channel your shoppers check.
          </h2>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-8 sm:gap-12">
          {CHANNELS.map(({ name, note, icon: Icon }) => (
            <div key={name} className="flex items-center gap-3 text-left">
              <Icon size={28} className="text-text shrink-0" aria-hidden="true" />
              <div>
                <p className="text-sm font-semibold">{name}</p>
                <p className="text-xs text-text-muted">{note}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Section>
  );
}
