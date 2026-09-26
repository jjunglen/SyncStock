import { useState, useEffect, useCallback } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import useEmblaCarousel from "embla-carousel-react";
import {
  LuGlobe,
  LuCreditCard,
  LuUserPlus,
  LuCheck,
  LuCircleCheck,
  LuTriangleAlert,
} from "react-icons/lu";
import Button from "../../components/ui/Button.jsx";
import Spinner from "../../components/ui/Spinner.jsx";
import BlackHoleBackground from "../../components/ui/BlackHoleBackground.jsx";
import api from "../../lib/api.js";
import { PLAN } from "../../lib/plan.js";

// Merchant setup, after connecting Shopify (step 1):
//   2. Create account → verify email (/email-verification)
//   3. Choose subdomain
//   4. Plan & payment (placeholder until billing) → store goes live
// Progress is saved on the store (onboarding_step), so a merchant can
// leave and come back: logging in resumes at the saved step.

const RESERVED_SUBDOMAINS = ["www", "api", "app", "admin", "mail", "syncstock", "store"];
const isValidSubdomainFormat = (value) => {
  if (!value || value.length < 3 || value.length > 30) return false;
  if (!/^[a-z0-9-]+$/.test(value)) return false;
  if (value.startsWith("-") || value.endsWith("-")) return false;
  if (RESERVED_SUBDOMAINS.includes(value)) return false;
  return true;
};

const STEPS = ["account", "subdomain", "plan"]; // carousel slides, in order
const GLOBAL_STEP_OFFSET = 2; // "Connect Shopify" was step 1
const TOTAL_STEPS = 4;

const inputClass =
  "w-full bg-surface-muted border border-border rounded-xl px-4 py-2.5 text-sm text-text placeholder:text-text-muted focus:outline-none";

export default function OnboardingSteps() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [emblaRef, emblaApi] = useEmblaCarousel({ watchDrag: false });
  const [current, setCurrent] = useState(0);
  const [status, setStatus] = useState("loading"); // loading | ready | error
  const [loadError, setLoadError] = useState("");
  const [storeName, setStoreName] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [subdomain, setSubdomain] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Find out where this merchant is. The setup link from the Shopify
  // connect step identifies the store before an account exists (sent as
  // X-Onboarding-Token by lib/api.js); after that, their login does.
  useEffect(() => {
    const token = searchParams.get("onboarding_token");
    if (token) sessionStorage.setItem("onboarding_token", token);

    api
      .get("/store/onboarding")
      .then((res) => {
        const { step, logged_in, store_name, subdomain: saved } = res.data.data;
        if (step === "complete") {
          navigate("/dashboard", { replace: true });
          return;
        }
        // Past the account step, only the logged-in owner can continue
        if (step !== "account" && !logged_in) {
          navigate(`/login?redirect=${encodeURIComponent("/onboarding/setup")}`, { replace: true });
          return;
        }
        setStoreName(store_name || "");
        setSubdomain(saved || "");
        setCurrent(Math.max(0, STEPS.indexOf(step)));
        setStatus("ready");
      })
      .catch((err) => {
        setLoadError(
          err.response?.data?.message || "We couldn't load your setup. Try again.",
        );
        setStatus("error");
      });
  }, [searchParams, navigate]);

  // Jump the carousel to the saved step once both are ready
  useEffect(() => {
    if (emblaApi && status === "ready") emblaApi.scrollTo(current, true);
  }, [emblaApi, status, current]);

  const goTo = useCallback((index) => {
    setError("");
    setCurrent(index);
  }, []);

  const failWith = (err) =>
    setError(err.response?.data?.message || "Something went wrong. Please try again.");

  const handleNext = async () => {
    setError("");
    const step = STEPS[current];

    if (step === "account") {
      if (!fullName.trim() || !email.trim() || !password) {
        setError("Fill in your name, email, and password.");
        return;
      }
      if (password !== confirmPassword) {
        setError("Passwords do not match");
        return;
      }
      setIsSubmitting(true);
      try {
        const res = await api.post("/auth/signup", { email, password, full_name: fullName });
        sessionStorage.removeItem("onboarding_token");
        if (res.data.data?.needs_verification) {
          const params = new URLSearchParams({ type: "merchant", email: res.data.data.email });
          navigate(`/email-verification?${params.toString()}`);
          return;
        }
        goTo(1); // already-verified account: straight on
      } catch (err) {
        failWith(err);
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    if (step === "subdomain") {
      if (!isValidSubdomainFormat(subdomain)) {
        setError("3-30 characters, lowercase letters, numbers, and hyphens only.");
        return;
      }
      setIsSubmitting(true);
      try {
        await api.put("/store/subdomain", { subdomain });
        goTo(2);
      } catch (err) {
        failWith(err);
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    if (step === "plan") {
      setIsSubmitting(true);
      try {
        await api.put("/store/plan", { plan: "pro" });
        navigate("/dashboard", { replace: true });
      } catch (err) {
        failWith(err);
        setIsSubmitting(false);
      }
    }
  };

  if (status !== "ready") {
    return (
      <div className="min-h-screen bg-bg text-text flex items-center justify-center px-4">
        {status === "loading" ? (
          <Spinner size={24} />
        ) : (
          <div className="w-full max-w-sm rounded-xl border border-border bg-surface p-6 text-center space-y-4">
            <LuTriangleAlert size={28} className="mx-auto text-danger" aria-hidden="true" />
            <p className="text-sm text-text-muted">{loadError}</p>
            <div className="flex gap-2">
              <Link to="/login?redirect=%2Fonboarding%2Fsetup" className="flex-1">
                <Button variant="primary" className="w-full">Log in</Button>
              </Link>
              <Link to="/onboarding" className="flex-1">
                <Button variant="secondary" className="w-full">Connect Shopify</Button>
              </Link>
            </div>
          </div>
        )}
      </div>
    );
  }

  const globalStep = GLOBAL_STEP_OFFSET + current;
  const isLast = STEPS[current] === "plan";

  return (
    <div className="min-h-screen bg-bg text-text relative overflow-hidden flex items-center justify-center px-4">
      <div className="absolute inset-0 opacity-40 pointer-events-none">
        <BlackHoleBackground />
      </div>

      <div className="relative z-10 w-full max-w-sm space-y-4 rounded-xl border border-border bg-surface p-6">
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-text-muted text-xs">
            <span>{storeName ? `Setting up ${storeName}` : "Getting started"}</span>
            <span>
              Step {globalStep} of {TOTAL_STEPS}
            </span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-muted">
            <div
              className="h-full rounded-full bg-primary transition-all duration-300"
              style={{ width: `${(globalStep / TOTAL_STEPS) * 100}%` }}
            />
          </div>
        </div>

        <div className="overflow-hidden" ref={emblaRef}>
          <div className="flex">
            {/* Step 2 — account */}
            <div className="min-w-0 shrink-0 grow-0 basis-full">
              <div className="flex flex-col items-center gap-3 py-4 text-center">
                <div className="flex size-14 items-center justify-center rounded-full bg-primary/10">
                  <LuUserPlus size={26} className="text-text" />
                </div>
                <div>
                  <p className="font-semibold">Create your login</p>
                  <p className="mt-1 text-text-muted text-sm">
                    Your store is connected. This saves your progress.
                  </p>
                </div>
                <div className="w-full space-y-2.5 mt-2 text-left">
                  <input type="text" placeholder="Full name" value={fullName} onChange={(e) => setFullName(e.target.value)} className={inputClass} />
                  <input type="email" placeholder="Email address" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} />
                  <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} className={inputClass} />
                  <input type="password" placeholder="Confirm password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className={inputClass} />
                  <p className="text-xs text-text-muted">
                    By creating an account you agree to the{" "}
                    <a href="/terms" target="_blank" rel="noopener noreferrer" className="underline hover:text-text">Terms</a>{" "}
                    and{" "}
                    <a href="/privacy" target="_blank" rel="noopener noreferrer" className="underline hover:text-text">Privacy Policy</a>.
                  </p>
                </div>
              </div>
            </div>

            {/* Step 3 — subdomain */}
            <div className="min-w-0 shrink-0 grow-0 basis-full">
              <div className="flex flex-col items-center gap-3 py-4 text-center">
                <div className="flex size-14 items-center justify-center rounded-full bg-primary/10">
                  <LuGlobe size={26} className="text-text" />
                </div>
                <div>
                  <p className="font-semibold">Choose your subdomain</p>
                  <p className="mt-1 text-text-muted text-sm">
                    Where customers will browse and set alerts.
                  </p>
                </div>
                <div className="w-full flex items-center border border-border rounded-xl overflow-hidden bg-surface-muted mt-2">
                  <input
                    type="text"
                    value={subdomain}
                    onChange={(e) => setSubdomain(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                    placeholder="yourstore"
                    className="flex-1 min-w-0 bg-transparent px-4 py-3 text-text placeholder:text-text-muted focus:outline-none"
                  />
                  <span className="shrink-0 whitespace-nowrap px-4 py-3 text-text-muted text-sm bg-surface border-l border-border">
                    .syncstock.io
                  </span>
                </div>
                {subdomain && isValidSubdomainFormat(subdomain) && (
                  <div className="flex items-center gap-2 text-sm text-live">
                    <LuCheck size={16} />
                    <span>{subdomain}.syncstock.io</span>
                  </div>
                )}
              </div>
            </div>

            {/* Step 4 — plan & payment (placeholder until billing) */}
            <div className="min-w-0 shrink-0 grow-0 basis-full">
              <div className="flex flex-col items-center gap-3 py-4 text-center">
                <div className="flex size-14 items-center justify-center rounded-full bg-primary/10">
                  <LuCreditCard size={26} className="text-text" />
                </div>
                <div>
                  <p className="font-semibold">Confirm your plan</p>
                  <p className="mt-1 text-text-muted text-sm">One plan. Everything included.</p>
                </div>
                <div className="w-full rounded-xl border border-border bg-surface-muted p-4 mt-2 text-left">
                  <div className="flex items-end gap-1 mb-3">
                    <span className="text-2xl font-extrabold">${PLAN.price}</span>
                    <span className="text-text-muted text-sm mb-0.5">/month</span>
                  </div>
                  <div className="space-y-2">
                    {PLAN.features.slice(0, 4).map((f) => (
                      <div key={f} className="flex items-start gap-2">
                        <LuCircleCheck size={14} className="text-live mt-0.5 shrink-0" />
                        <p className="text-xs text-text-muted">{f}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div className="p-2.5 bg-danger/10 border border-danger/30 rounded-xl text-xs text-danger flex items-center gap-2">
            <LuTriangleAlert size={13} /> {error}
          </div>
        )}

        <div className="flex gap-2">
          {/* Back only between subdomain and plan — the account step is done */}
          <Button
            className="flex-1"
            variant="secondary"
            disabled={STEPS[current] !== "plan" || isSubmitting}
            onClick={() => goTo(1)}
          >
            Back
          </Button>
          <Button className="flex-1" variant="primary" disabled={isSubmitting} onClick={handleNext}>
            {isSubmitting ? <Spinner size={18} /> : isLast ? "Finish" : "Next"}
          </Button>
        </div>
      </div>
    </div>
  );
}
