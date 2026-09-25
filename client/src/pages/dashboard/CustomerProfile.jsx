import { useState, useEffect } from "react";
import { LuUser, LuCircleCheck, LuPhone, LuBadgeCheck } from "react-icons/lu";
import DashboardNavbar from "../../components/layout/DashboardNavbar.jsx";
import Button from "../../components/ui/Button.jsx";
import Spinner from "../../components/ui/Spinner.jsx";
import SizeSelector from "../onboarding/SizeSelector.jsx";
import api from "../../lib/api.js";

function Toggle({ checked, onChange, label, description }) {
  return (
    <div className="flex items-center justify-between py-2">
      <div>
        <p className="text-sm text-text">{label}</p>
        {description && (
          <p className="text-xs text-text-muted">{description}</p>
        )}
      </div>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative w-10 h-6 rounded-full transition-colors shrink-0 ${checked ? "bg-primary" : "bg-surface-muted"}`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-bg transition-transform ${checked ? "translate-x-4" : "translate-x-0"}`}
        />
      </button>
    </div>
  );
}

export default function CustomerProfile() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [sizes, setSizes] = useState([]);
  const [notifyEmail, setNotifyEmail] = useState(true);
  const [notifyInapp, setNotifyInapp] = useState(true);
  const [notifySizeAlerts, setNotifySizeAlerts] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [savedMessage, setSavedMessage] = useState("");

  const [phoneNumber, setPhoneNumber] = useState("");
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [phoneInput, setPhoneInput] = useState("");
  const [codeInput, setCodeInput] = useState("");
  const [phoneStep, setPhoneStep] = useState("idle"); // "idle" | "codeSent"
  const [phoneSubmitting, setPhoneSubmitting] = useState(false);
  const [phoneError, setPhoneError] = useState("");
  const [phoneMessage, setPhoneMessage] = useState("");

  useEffect(() => {
    api
      .get("/users/profile")
      .then((res) => {
        const data = res.data.data;
        setFullName(data.full_name || "");
        setEmail(data.email || "");
        setSizes(data.sizes || []);
        setNotifyEmail(data.notify_email ?? true);
        setNotifyInapp(data.notify_inapp ?? true);
        setNotifySizeAlerts(data.notify_size_alerts ?? false);
        setPhoneNumber(data.phone_number || "");
        setPhoneVerified(data.phone_verified || false);
        setPhoneInput(data.phone_number || "");
      })
      .catch(() => setError("Failed to load profile"))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSavedMessage("");
    try {
      await api.put("/users/profile", {
        full_name: fullName,
        email,
        sizes,
        notify_email: notifyEmail,
        notify_inapp: notifyInapp,
        notify_size_alerts: notifySizeAlerts,
      });
      setSavedMessage("Saved");
      setTimeout(() => setSavedMessage(""), 2000);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to save changes");
    } finally {
      setSaving(false);
    }
  };

  const handleSendCode = async () => {
    setPhoneSubmitting(true);
    setPhoneError("");
    setPhoneMessage("");
    try {
      await api.post("/phone/send-code", { phone_number: phoneInput });
      setPhoneStep("codeSent");
      setPhoneMessage("Code sent — check your texts");
    } catch (err) {
      setPhoneError(err.response?.data?.message || "Failed to send code");
    } finally {
      setPhoneSubmitting(false);
    }
  };

  const handleVerifyCode = async () => {
    setPhoneSubmitting(true);
    setPhoneError("");
    try {
      await api.post("/phone/verify", { code: codeInput });
      setPhoneVerified(true);
      setPhoneNumber(phoneInput);
      setPhoneStep("idle");
      setCodeInput("");
      setPhoneMessage("");
    } catch (err) {
      setPhoneError(err.response?.data?.message || "Invalid or expired code");
    } finally {
      setPhoneSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-bg text-text">
        <DashboardNavbar />
        <div className="pt-24 flex justify-center">
          <Spinner size={20} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg text-text">
      <DashboardNavbar />

      <div className="pt-24 px-4 max-w-lg mx-auto pb-16">
        <div className="flex items-center gap-3 mb-8">
          <div className="p-2 bg-primary/10 rounded-lg">
            <LuUser size={18} className="text-text" />
          </div>
          <h1 className="font-display text-2xl font-semibold">Profile</h1>
        </div>

        <form onSubmit={handleSave} className="space-y-6">
          <div className="rounded-xl border border-border bg-surface p-6 space-y-4">
            <div>
              <label className="text-xs text-text-muted block mb-1.5">
                Full name
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full bg-surface-muted border border-border rounded-xl px-4 py-2.5 text-sm text-text focus:outline-none focus:ring-2 focus:ring-text/10"
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
                className="w-full bg-surface-muted border border-border rounded-xl px-4 py-2.5 text-sm text-text focus:outline-none focus:ring-2 focus:ring-text/10"
              />
            </div>
          </div>

          <div className="rounded-xl border border-border bg-surface p-6">
            <p className="text-sm font-semibold mb-1">Your sizes</p>
            <p className="text-xs text-text-muted mb-4">
              Used to show what's in stock for you
            </p>
            <SizeSelector selected={sizes} onChange={setSizes} />
          </div>

          <div className="rounded-xl border border-border bg-surface p-6 divide-y divide-border">
            <p className="text-sm font-semibold pb-2">Notifications</p>
            <Toggle
              checked={notifyEmail}
              onChange={setNotifyEmail}
              label="Email"
              description="Get notified by email when a shoe drops"
            />
            <Toggle
              checked={notifyInapp}
              onChange={setNotifyInapp}
              label="In-app"
              description="Show notifications in your alerts inbox"
            />
            <Toggle
              checked={notifySizeAlerts}
              onChange={setNotifySizeAlerts}
              label="Any size match"
              description="Notify me about anything in my saved sizes, not just specific alerts"
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

        <div className="rounded-xl border border-border bg-surface p-6 mt-6">
          <div className="flex items-center gap-2 mb-1">
            <LuPhone size={16} className="text-text-muted" />
            <p className="text-sm font-semibold">Phone number</p>
          </div>
          <p className="text-xs text-text-muted mb-4">
            For text alerts, verified once per number
          </p>

          {phoneVerified ? (
            <div className="flex items-center gap-2 text-sm text-live">
              <LuBadgeCheck size={16} />
              {phoneNumber} — verified
            </div>
          ) : phoneStep === "codeSent" ? (
            <div className="space-y-3">
              <p className="text-xs text-text-muted">
                Enter the 6-digit code sent to {phoneInput}
              </p>
              <input
                type="text"
                value={codeInput}
                onChange={(e) => setCodeInput(e.target.value)}
                placeholder="123456"
                className="w-full bg-surface-muted border border-border rounded-xl px-4 py-2.5 text-sm text-text focus:outline-none focus:ring-2 focus:ring-text/10"
              />
              {phoneError && (
                <p className="text-danger text-xs">{phoneError}</p>
              )}
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="primary"
                  disabled={phoneSubmitting}
                  onClick={handleVerifyCode}
                >
                  {phoneSubmitting ? <Spinner size={16} /> : "Verify"}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setPhoneStep("idle")}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <input
                type="tel"
                value={phoneInput}
                onChange={(e) => setPhoneInput(e.target.value)}
                placeholder="+1 555 123 4567"
                className="w-full bg-surface-muted border border-border rounded-xl px-4 py-2.5 text-sm text-text focus:outline-none focus:ring-2 focus:ring-text/10"
              />
              {phoneError && (
                <p className="text-danger text-xs">{phoneError}</p>
              )}
              {phoneMessage && (
                <p className="text-live text-xs">{phoneMessage}</p>
              )}
              <Button
                type="button"
                variant="primary"
                disabled={phoneSubmitting || !phoneInput}
                onClick={handleSendCode}
              >
                {phoneSubmitting ? (
                  <Spinner size={16} />
                ) : (
                  "Send verification code"
                )}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
