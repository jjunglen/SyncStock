import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { LuMailCheck, LuTriangleAlert } from "react-icons/lu";
import Button from "../components/ui/Button.jsx";
import Spinner from "../components/ui/Spinner.jsx";
import MarketingHeader from "../components/marketing/MarketingHeader.jsx";
import StoreHeader from "../components/store/StoreHeader.jsx";
import api from "../lib/api.js";
import { getSubdomain } from "../lib/getSubdomain.js";
import { safeRedirect } from "../lib/safeRedirect.js";

// /email-verification — shown right after an email/password signup (and
// when a link fails). Shoppers and merchants both land here:
//   ?email=…      where the link was sent (for "resend")
//   ?type=merchant  merchant onboarding (Syncstock header, merchant login)
//   ?status=invalid|error  the verification link didn't work
//   ?redirect=…   shopper's page to return to after verifying
export default function EmailVerification() {
  const [searchParams] = useSearchParams();
  const email = searchParams.get("email") || "";
  const status = searchParams.get("status");
  const merchant = searchParams.get("type") === "merchant" || (!getSubdomain() && !email && !!status);
  const redirect = safeRedirect(searchParams.get("redirect"), null);

  const [resendState, setResendState] = useState("idle"); // idle | sending | sent | error
  const [resendEmail, setResendEmail] = useState(email);

  const loginPath = merchant ? "/login" : "/store/login";
  const failed = status === "invalid" || status === "error";

  const handleResend = async (e) => {
    e.preventDefault();
    if (!resendEmail.trim()) return;
    setResendState("sending");
    try {
      await api.post("/auth/resend-verification", { email: resendEmail.trim(), redirect });
      setResendState("sent");
    } catch {
      setResendState("error");
    }
  };

  return (
    <div className="min-h-screen bg-bg text-text">
      {merchant ? <MarketingHeader /> : <StoreHeader />}
      <main className="flex min-h-screen items-center justify-center px-4 pt-16">
        <div className="w-full max-w-sm rounded-xl border border-border bg-surface p-6 text-center">
          <div
            className={`mx-auto mb-4 flex size-14 items-center justify-center rounded-full ${failed ? "bg-danger/10" : "bg-primary/10"}`}
          >
            {failed ? (
              <LuTriangleAlert size={26} className="text-danger" aria-hidden="true" />
            ) : (
              <LuMailCheck size={26} className="text-text" aria-hidden="true" />
            )}
          </div>

          {failed ? (
            <>
              <h1 className="text-xl font-semibold mb-2">That link didn't work</h1>
              <p className="text-sm text-text-muted mb-6">
                {status === "invalid"
                  ? "It may have expired (links last 24 hours) or been copied incompletely. Send yourself a new one below."
                  : "Something went wrong verifying your email. Try the link again, or send a new one below."}
              </p>
            </>
          ) : (
            <>
              <h1 className="text-xl font-semibold mb-2">Check your email</h1>
              <p className="text-sm text-text-muted mb-6">
                We sent a verification link to{" "}
                {email ? <strong className="text-text">{email}</strong> : "your email"}.
                Click it to verify your email and continue
                {merchant ? " setting up your store" : ""}. The link expires in 24 hours.
              </p>
            </>
          )}

          <form onSubmit={handleResend} className="space-y-3 text-left">
            {(failed || !email) && (
              <input
                type="email"
                value={resendEmail}
                onChange={(e) => setResendEmail(e.target.value)}
                placeholder="you@example.com"
                aria-label="Email address"
                className="w-full bg-surface-muted border border-border rounded-xl px-4 py-2.5 text-sm text-text placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-text/10"
              />
            )}
            <Button
              type="submit"
              variant={failed ? "primary" : "secondary"}
              className="w-full"
              disabled={resendState === "sending" || !resendEmail.trim()}
            >
              {resendState === "sending" ? <Spinner size={16} /> : "Resend verification email"}
            </Button>
            {resendState === "sent" && (
              <p className="text-xs text-live text-center">
                If that account needs verifying, a new link is on its way.
              </p>
            )}
            {resendState === "error" && (
              <p className="text-xs text-danger text-center">
                Couldn't send right now. Try again in a minute.
              </p>
            )}
          </form>

          <p className="mt-6 text-xs text-text-muted">
            Already verified?{" "}
            <Link to={loginPath} className="text-text underline">
              Log in
            </Link>
            {" · "}Check your spam or Promotions folder if it's not in your inbox.
          </p>
        </div>
      </main>
    </div>
  );
}
