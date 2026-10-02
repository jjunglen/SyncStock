import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { LuKeyRound, LuCircleCheck, LuEye, LuEyeOff } from "react-icons/lu";
import Button from "../components/ui/Button.jsx";
import Spinner from "../components/ui/Spinner.jsx";
import MarketingHeader from "../components/marketing/MarketingHeader.jsx";
import StoreHeader from "../components/store/StoreHeader.jsx";
import api from "../lib/api.js";
import { getSubdomain } from "../lib/getSubdomain.js";

// /reset-password?token=… — the link in the password reset email. On a
// store's site for shoppers, on syncstock.io for merchants. Same password
// rules as signup.
const passwordProblem = (password) => {
  if (password.length < 8) return "Use at least 8 characters";
  if (!/\d/.test(password)) return "Include a number";
  if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)) return "Include a symbol";
  return null;
};

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";
  const onStore = !!getSubdomain();
  const loginPath = onStore ? "/store/login" : "/login";
  const navigate = useNavigate();

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [state, setState] = useState("idle"); // idle | saving | done
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    const problem = passwordProblem(password);
    if (problem) return setError(problem);
    if (password !== confirm) return setError("Passwords don't match");
    setError("");
    setState("saving");
    try {
      await api.post("/auth/reset-password", { token, password });
      setState("done");
    } catch (err) {
      setState("idle");
      setError(
        err.response?.status === 400 && /token/i.test(err.response?.data?.message || "")
          ? "This link has expired or was already used. Request a new one from the login page."
          : err.response?.data?.message || "Couldn't reset your password. Try again.",
      );
    }
  };

  const inputClass =
    "w-full bg-surface-muted border border-border rounded-xl px-4 py-2.5 text-sm text-text placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-text/10";

  return (
    <div className="min-h-screen bg-bg text-text">
      {onStore ? <StoreHeader /> : <MarketingHeader />}
      <main className="flex min-h-screen items-center justify-center px-4 pt-16">
        <div className="w-full max-w-sm rounded-xl border border-border bg-surface p-6 text-center">
          <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-primary/10">
            {state === "done" ? (
              <LuCircleCheck size={26} className="text-text" aria-hidden="true" />
            ) : (
              <LuKeyRound size={26} className="text-text" aria-hidden="true" />
            )}
          </div>

          {state === "done" ? (
            <>
              <h1 className="text-xl font-semibold mb-2">Password updated</h1>
              <p className="text-sm text-text-muted mb-6">
                Log in with your new password. You've been logged out everywhere else.
              </p>
              <Button variant="primary" className="w-full" onClick={() => navigate(loginPath)}>
                Log in
              </Button>
            </>
          ) : !token ? (
            <>
              <h1 className="text-xl font-semibold mb-2">That link didn't work</h1>
              <p className="text-sm text-text-muted mb-6">
                It may have been copied incompletely. Request a new one from the login page.
              </p>
              <Link to={loginPath} className="text-sm text-text underline">Back to log in</Link>
            </>
          ) : (
            <>
              <h1 className="text-xl font-semibold mb-2">Choose a new password</h1>
              <p className="text-sm text-text-muted mb-6">
                At least 8 characters, with a number and a symbol.
              </p>
              <form onSubmit={handleSubmit} className="space-y-3 text-left">
                <div className="relative">
                  <input
                    type={show ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="New password"
                    aria-label="New password"
                    autoComplete="new-password"
                    className={`${inputClass} pr-12`}
                  />
                  <button
                    type="button"
                    onClick={() => setShow(!show)}
                    aria-label={show ? "Hide password" : "Show password"}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text"
                  >
                    {show ? <LuEyeOff size={18} /> : <LuEye size={18} />}
                  </button>
                </div>
                <input
                  type={show ? "text" : "password"}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="Confirm new password"
                  aria-label="Confirm new password"
                  autoComplete="new-password"
                  className={inputClass}
                />
                {error && <p className="text-xs text-danger">{error}</p>}
                <Button type="submit" variant="primary" className="w-full" disabled={state === "saving"}>
                  {state === "saving" ? <Spinner size={16} /> : "Save new password"}
                </Button>
              </form>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
