import { useState } from "react";
import { LuMailWarning } from "react-icons/lu";
import api from "../../lib/api.js";

// Shown when a login is refused because the email isn't verified yet
// (server code EMAIL_NOT_VERIFIED), with a one-tap resend
export default function UnverifiedNotice({ email, message, redirect }) {
  const [state, setState] = useState("idle"); // idle | sending | sent

  const resend = async () => {
    setState("sending");
    try {
      await api.post("/auth/resend-verification", { email, redirect });
    } finally {
      setState("sent");
    }
  };

  return (
    <div className="mb-4 p-3 bg-warn/10 border border-warn/30 rounded-xl text-sm text-text">
      <p className="flex items-start gap-2">
        <LuMailWarning size={16} className="text-warn shrink-0 mt-0.5" aria-hidden="true" />
        {message}
      </p>
      {state === "sent" ? (
        <p className="mt-2 text-xs text-text-muted">
          New link sent to {email}. Check your inbox (and spam or Promotions).
        </p>
      ) : (
        <button
          type="button"
          onClick={resend}
          disabled={state === "sending"}
          className="mt-2 text-xs font-medium underline disabled:opacity-50"
        >
          {state === "sending" ? "Sending…" : "Resend verification email"}
        </button>
      )}
    </div>
  );
}
