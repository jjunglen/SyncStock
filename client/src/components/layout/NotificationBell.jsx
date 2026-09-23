import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { LuBell } from "react-icons/lu";
import api from "../../lib/api.js";

export default function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const containerRef = useRef(null);
  const navigate = useNavigate();

  const fetchNotifications = () => {
    api
      .get("/notifications?limit=20")
      .then((res) => setNotifications(res.data.data || []))
      .catch((err) => console.error("Failed to load notifications:", err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

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

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleClick = async (notification) => {
    if (!notification.read) {
      api.put(`/notifications/${notification.id}/read`).catch(() => {});
      setNotifications((prev) =>
        prev.map((n) => (n.id === notification.id ? { ...n, read: true } : n)),
      );
    }
    setIsOpen(false);
    if (notification.inventory_id) {
      const params = new URLSearchParams({ item: notification.inventory_id });
      if (notification.alert_id) params.set("alert", notification.alert_id);
      navigate(`/store/dashboard?${params.toString()}`);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.put("/notifications/read-all");
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch (err) {
      console.error("Failed to mark all as read:", err);
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className="relative p-2 rounded-lg text-text-muted hover:text-text hover:bg-white/5 transition-colors"
      >
        <LuBell size={18} />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-danger" />
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 max-h-96 overflow-y-auto bg-surface border border-border rounded-xl shadow-xl z-50">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <p className="text-sm font-medium">Notifications</p>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-xs text-text-muted hover:text-text"
              >
                Mark all read
              </button>
            )}
          </div>

          {loading ? (
            <p className="text-sm text-text-muted px-4 py-6 text-center">
              Loading...
            </p>
          ) : notifications.length === 0 ? (
            <p className="text-sm text-text-muted px-4 py-6 text-center">
              No notifications yet
            </p>
          ) : (
            <div className="divide-y divide-border">
              {notifications.map((n) => (
                <button
                  key={n.id}
                  onClick={() => handleClick(n)}
                  className={`w-full text-left px-4 py-3 hover:bg-white/5 transition-colors flex gap-3 ${!n.read ? "bg-white/[0.02]" : ""}`}
                >
                  {n.image_url && (
                    <img
                      src={n.image_url}
                      alt=""
                      className="w-10 h-10 rounded-lg object-contain bg-white shrink-0"
                    />
                  )}
                  <div className="min-w-0">
                    <p
                      className={`text-sm ${!n.read ? "text-text font-medium" : "text-text-muted"}`}
                    >
                      {n.message}
                    </p>
                    <p className="text-xs text-text-muted mt-0.5">
                      {new Date(n.sent_at).toLocaleDateString()}
                    </p>
                  </div>
                  {!n.read && (
                    <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0 mt-1.5" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
