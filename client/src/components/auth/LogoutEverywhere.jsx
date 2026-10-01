import { useState } from "react";
import { LuShieldCheck } from "react-icons/lu";
import Button from "../ui/Button.jsx";
import Spinner from "../ui/Spinner.jsx";
import api from "../../lib/api.js";

// "Log out of all other devices" — for a lost phone or a shared computer.
// Keeps this device logged in; also stops older alert-email sign-in links.
// (A password reset does the same automatically.)
export default function LogoutEverywhere() {
  const [state, setState] = useState("idle"); // idle | confirm | working | done | error
  const [message, setMessage] = useState("");

  const run = async () => {
    setState("working");
    try {
      await api.post("/auth/logout-everywhere");
      setState("done");
    } catch (err) {
      setMessage(err.response?.data?.message || "Couldn't log out your other devices. Try again.");
      setState("error");
    }
  };

  return (
    <div className="rounded-xl border border-border bg-surface p-6 mt-6">
      <div className="flex items-center gap-2 mb-1">
        <LuShieldCheck size={16} className="text-text-muted" aria-hidden="true" />
        <h3 className="font-semibold">Devices</h3>
      </div>
      <p className="text-xs text-text-muted mb-4">
        Lost a phone or used a shared computer? Log out everywhere except here. Links in older
        alert emails will ask you to log in again.
      </p>
      {state === "done" ? (
        <p className="text-sm text-live">Done — you're logged out of every other device.</p>
      ) : state === "confirm" || state === "working" ? (
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={() => setState("idle")} disabled={state === "working"}>
            Cancel
          </Button>
          <Button variant="danger" size="sm" onClick={run} disabled={state === "working"}>
            {state === "working" ? <Spinner size={14} /> : "Yes, log out other devices"}
          </Button>
        </div>
      ) : (
        <Button variant="secondary" size="sm" onClick={() => setState("confirm")}>
          Log out of all other devices
        </Button>
      )}
      {state === "error" && <p className="mt-2 text-xs text-danger">{message}</p>}
    </div>
  );
}
