import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  LuLayoutDashboard,
  LuTrendingUp,
  LuStore,
  LuShoppingBag,
  LuUser,
  LuUsers,
  LuChevronDown,
  LuChevronsRight,
} from "react-icons/lu";
import SignalDot from "../ui/SignalDot.jsx";

const NAV_ITEMS = [
  {
    key: "dashboard",
    label: "Dashboard",
    icon: LuLayoutDashboard,
    to: "/dashboard",
  },
  { key: "sourcing", label: "Sourcing", icon: LuTrendingUp, to: "/sourcing" },
  {
    key: "purchases",
    label: "Purchases",
    icon: LuShoppingBag,
    to: "/purchases",
  },
  {
    key: "storefront",
    label: "View storefront",
    icon: LuStore,
    external: true,
  },
  {
    key: "account", 
    label: "Account",
    icon: LuUser,
    to: "/account",

  },
  { 
    key: "customers",
    label: "Customers", 
    icon: LuUsers, 
    to: "/customers"
  },
];

function NavOption({ item, isSelected, onClick, open }) {
  const Icon = item.icon;

  return (
    <button
      onClick={onClick}
      disabled={item.disabled}
      className={`relative flex h-11 w-full items-center rounded-md transition-colors ${
        item.disabled
          ? "text-text-muted/50 cursor-not-allowed"
          : isSelected
            ? "bg-white/5 text-text border-l-2 border-primary"
            : "text-text-muted hover:bg-white/5 hover:text-text"
      }`}
    >
      <div className="grid h-full w-12 place-content-center">
        <Icon size={16} />
      </div>
      {open && <span className="text-sm font-medium">{item.label}</span>}
    </button>
  );
}

export default function MerchantSidebar({ storeName, storeSubdomain }) {
  const [open, setOpen] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  const handleClick = (item) => {
    if (item.disabled) return;
    if (item.external) {
      if (window.location.hostname === "localhost") {
        window.open("http://localhost:5173/store/dashboard", "_blank");
      } else {
        window.open(
          `https://${storeSubdomain}.syncstock.io/store/dashboard`,
          "_blank",
        );
      }
      return;
    }
    navigate(item.to);
  };

  return (
    <nav
      className={`sticky top-0 h-screen shrink-0 border-r border-border bg-surface p-2 transition-all duration-300 ${open ? "w-64" : "w-16"}`}
    >
      <div className="mb-6 border-b border-border pb-4">
        <div className="flex items-center justify-between rounded-md p-2">
          <div className="flex items-center gap-2">
            <SignalDot tone="live" size="md" />
            {open && (
              <div>
                <span className="block text-sm font-semibold text-text">
                  {storeName || "Your store"}
                </span>
                <span className="block text-xs text-text-muted">Pro plan</span>
              </div>
            )}
          </div>
          {open && <LuChevronDown size={14} className="text-text-muted" />}
        </div>
      </div>

      <div className="space-y-1">
        {NAV_ITEMS.map((item) => (
          <NavOption
            key={item.key}
            item={item}
            isSelected={location.pathname === item.to}
            onClick={() => handleClick(item)}
            open={open}
          />
        ))}
      </div>

      <button
        onClick={() => setOpen(!open)}
        className="absolute bottom-0 left-0 right-0 border-t border-border hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center p-3">
          <div className="grid size-10 place-content-center">
            <LuChevronsRight
              size={16}
              className={`text-text-muted transition-transform ${open ? "rotate-180" : ""}`}
            />
          </div>
          {open && (
            <span className="text-sm font-medium text-text-muted">Hide</span>
          )}
        </div>
      </button>
    </nav>
  );
}
