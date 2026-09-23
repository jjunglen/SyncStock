import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  LuBell,
  LuLayoutDashboard,
  LuSearch,
  LuUser,
  LuPlus,
  LuLogOut,
} from "react-icons/lu";
import SignalDot from "../ui/SignalDot.jsx";
import FloatingMenu from "../ui/FloatingMenu.jsx";
import NotificationBell from "./NotificationBell.jsx";
import Button from "../ui/Button.jsx";
import api from "../../lib/api.js";

export default function DashboardNavbar() {
  const navigate = useNavigate();
  const [storeName, setStoreName] = useState("");
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  useEffect(() => {
    api
      .get("/store")
      .then((res) => setStoreName(res.data.data.name))
      .catch(() => {});
  }, []);

  const handleLogout = async () => {
    try {
      await api.post("/auth/logout");
    } catch (err) {
      console.error("Logout failed:", err);
    } finally {
      navigate("/login");
    }
  };

  const mobileMenuItems = [
    {
      label: "Home",
      icon: LuLayoutDashboard,
      onClick: () => navigate("/store/dashboard?tab=instock"),
    },
    {
      label: "Browse",
      icon: LuSearch,
      onClick: () => navigate("/store/dashboard?tab=browse"),
    },
    {
      label: "Track a shoe",
      icon: LuPlus,
      onClick: () => navigate("/store/track"),
    },
    {
      label: "Alerts",
      icon: LuBell,
      onClick: () => navigate("/store/dashboard?tab=alerts"),
    },
    {
      label: "Profile",
      icon: LuUser,
      onClick: () => navigate("/store/profile"),
    },
  ];

  return (
    <>
      <header className="fixed top-0 left-0 w-full z-40 bg-bg/90 backdrop-blur border-b border-border">
        <div className="max-w-6xl mx-auto px-4 md:px-10 h-16 flex items-center justify-between">
          <Link to="/store/dashboard" className="flex items-center gap-2">
            <SignalDot tone="live" size="md" />
            <span className="font-display font-semibold text-sm">
              {storeName || "Store"}
            </span>
          </Link>

          <div className="flex items-center gap-1.5 md:gap-3">
            <NotificationBell />
            <button
              onClick={() => navigate("/store/profile")}
              className="hidden lg:flex p-2 rounded-lg text-text-muted hover:text-text hover:bg-white/5 transition-colors"
            >
              <LuUser size={18} />
            </button>
            <button
              onClick={() => setShowLogoutConfirm(true)}
              className="p-2 rounded-lg text-text-muted hover:text-text hover:bg-white/5 transition-colors lg:hidden"
              aria-label="Sign out"
            >
              <LuLogOut size={18} />
            </button>
            <button
              onClick={() => setShowLogoutConfirm(true)}
              className="hidden lg:block text-sm text-text-muted hover:text-text transition-colors"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <div className="lg:hidden">
        <FloatingMenu items={mobileMenuItems} position="bottom-right" />
      </div>

      {showLogoutConfirm && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setShowLogoutConfirm(false)}
          />
          <div className="relative bg-surface border border-border rounded-2xl w-full max-w-sm p-6 z-10">
            <h3 className="text-base font-semibold mb-2">Sign out?</h3>
            <p className="text-sm text-text-muted mb-6">
              You'll need to log back in to see your alerts and account.
            </p>
            <div className="flex gap-3">
              <Button
                variant="secondary"
                fullWidth
                onClick={() => setShowLogoutConfirm(false)}
              >
                Cancel
              </Button>
              <Button variant="danger" fullWidth onClick={handleLogout}>
                Sign out
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
