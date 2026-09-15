import { useState, useEffect } from "react";
import { LuUser, LuStore, LuCircleCheck } from "react-icons/lu";
import MerchantSidebar from "../../components/dashboard/MerchantSidebar.jsx";
import Button from "../../components/ui/Button.jsx";
import Spinner from "../../components/ui/Spinner.jsx";
import api from "../../lib/api.js";

export default function AccountSettings() {
  const [profile, setProfile] = useState(null);
  const [store, setStore] = useState(null);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [savedMessage, setSavedMessage] = useState("");

  useEffect(() => {
    Promise.all([api.get("/users/profile"), api.get("/store")])
      .then(([profileRes, storeRes]) => {
        setProfile(profileRes.data.data);
        setFullName(profileRes.data.data.full_name || "");
        setEmail(profileRes.data.data.email || "");
        setStore(storeRes.data.data);
      })
      .catch(() => setError("Failed to load account details"))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSavedMessage("");
    try {
      const res = await api.put("/users/profile", {
        full_name: fullName,
        email,
      });
      setProfile((prev) => ({ ...prev, ...res.data.data }));
      setSavedMessage("Saved");
      setTimeout(() => setSavedMessage(""), 2000);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to save changes");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen w-full bg-bg text-text">
        <MerchantSidebar storeName={store?.name} />
        <div className="flex-1 p-6">
          <Spinner size={20} />
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full bg-bg text-text">
      <MerchantSidebar
        storeName={store?.name}
        storeSubdomain={store?.subdomain}
      />

      <div className="flex-1 p-6 overflow-auto max-w-xl">
        <div className="flex items-center gap-3 mb-8">
          <div className="p-2 bg-primary/10 rounded-lg">
            <LuUser size={18} className="text-text" />
          </div>
          <h1 className="font-display text-2xl font-semibold">Account</h1>
        </div>

        <div className="rounded-xl border border-border bg-surface p-6 mb-6">
          <h3 className="font-semibold mb-4">Profile</h3>
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="text-xs text-text-muted block mb-1.5">
                Full name
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full bg-surface-muted border border-border rounded-xl px-4 py-2.5 text-sm text-text focus:outline-none focus:ring-2 focus:ring-white/10"
              />
            </div>
            <div>
              <label className="text-xs text-text-muted block mb-1.5">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-surface-muted border border-border rounded-xl px-4 py-2.5 text-sm text-text focus:outline-none focus:ring-2 focus:ring-white/10"
              />
            </div>

            {error && <p className="text-danger text-xs">{error}</p>}

            <div className="flex items-center gap-3">
              <Button type="submit" variant="primary" disabled={saving}>
                {saving ? <Spinner size={16} /> : "Save changes"}
              </Button>
              {savedMessage && (
                <span className="text-xs text-live flex items-center gap-1">
                  <LuCircleCheck size={13} /> {savedMessage}
                </span>
              )}
            </div>
          </form>
        </div>

        <div className="rounded-xl border border-border bg-surface p-6">
          <div className="flex items-center gap-2 mb-4">
            <LuStore size={16} className="text-text-muted" />
            <h3 className="font-semibold">Store</h3>
          </div>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-text-muted">Name</span>
              <span>{store?.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-muted">Subdomain</span>
              <span>{store?.subdomain}.syncstock.io</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-muted">Plan</span>
              <span className="capitalize">{store?.plan}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-muted">Status</span>
              <span className="capitalize">{store?.status}</span>
            </div>
          </div>
          <p className="text-xs text-text-muted mt-4">
            Subdomain can only be changed during onboarding. Contact support for
            changes after launch.
          </p>
        </div>
      </div>
    </div>
  );
}
