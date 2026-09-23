import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
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

const RESERVED_SUBDOMAINS = [
  "www",
  "api",
  "app",
  "admin",
  "mail",
  "syncstock",
  "store",
];
const isValidSubdomainFormat = (value) => {
  if (!value || value.length < 3 || value.length > 30) return false;
  if (!/^[a-z0-9-]+$/.test(value)) return false;
  if (value.startsWith("-") || value.endsWith("-")) return false;
  if (RESERVED_SUBDOMAINS.includes(value)) return false;
  return true;
};

const FEATURES = [
  "Automatic Shopify sync — including your existing catalog",
  "Unlimited customer restock alerts",
  "Email, in-app, and text notifications",
  "SMS included, not a paid add-on",
];

const GLOBAL_STEP_OFFSET = 2;
const TOTAL_STEPS = 4;

export default function OnboardingSteps() {
  const [searchParams] = useSearchParams();
  const [emblaRef, emblaApi] = useEmblaCarousel({ watchDrag: false });
  const [current, setCurrent] = useState(0);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [subdomain, setSubdomain] = useState(searchParams.get("store") || "");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    const token = searchParams.get("onboarding_token");
    const suggestedSubdomain = searchParams.get("store");
    if (token) sessionStorage.setItem("onboarding_token", token);
    if (suggestedSubdomain)
      sessionStorage.setItem("onboarding_subdomain", suggestedSubdomain);
  }, [searchParams]);

  useEffect(() => {
    if (!emblaApi) return;
    const onSelect = () => setCurrent(emblaApi.selectedScrollSnap());
    emblaApi.on("select", onSelect);
    return () => emblaApi.off("select", onSelect);
  }, [emblaApi]);

  const goBack = useCallback(() => {
    setError("");
    emblaApi?.scrollPrev();
  }, [emblaApi]);

  const handleNext = async () => {
    setError("");

    if (current === 0) {
      if (!isValidSubdomainFormat(subdomain)) {
        setError(
          "3-30 characters, lowercase letters, numbers, and hyphens only.",
        );
        return;
      }
      setIsSubmitting(true);
      try {
        await api.put("/store/subdomain", { subdomain });
        sessionStorage.setItem("onboarding_subdomain", subdomain);
        emblaApi?.scrollNext();
      } catch (err) {
        setError(
          err.response?.data?.message ||
            "Something went wrong. Please try again.",
        );
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    if (current === 1) {
      setIsSubmitting(true);
      try {
        await api.put("/store/plan", { plan: "pro" });
        emblaApi?.scrollNext();
      } catch (err) {
        setError(
          err.response?.data?.message ||
            "Something went wrong. Please try again.",
        );
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    if (current === 2) {
      if (password !== confirmPassword) {
        setError("Passwords do not match");
        return;
      }
      setIsSubmitting(true);
      try {
        await api.post("/auth/signup", {
          email,
          password,
          full_name: fullName,
        });
        const finalSubdomain = sessionStorage.getItem("onboarding_subdomain");
        sessionStorage.removeItem("onboarding_token");
        sessionStorage.removeItem("onboarding_subdomain");
        const protocol =
          window.location.hostname === "localhost" ? "http" : "https";
        const host =
          window.location.hostname === "localhost"
            ? "localhost:5173"
            : `${finalSubdomain}.syncstock.io`;
        window.location.href = `${protocol}://${host}/`;
      } catch (err) {
        setError(
          err.response?.data?.message ||
            "Something went wrong. Please try again.",
        );
        setIsSubmitting(false);
      }
    }
  };

  const globalStep = GLOBAL_STEP_OFFSET + current;
  const isLast = current === 2;

  return (
    <div className="min-h-screen bg-bg text-text relative overflow-hidden flex items-center justify-center px-4">
      <div className="absolute inset-0 opacity-40 pointer-events-none">
        <BlackHoleBackground />
      </div>

      <div className="relative z-10 w-full max-w-sm space-y-4 rounded-xl border border-border bg-surface p-6">
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-text-muted text-xs">
            <span>Getting started</span>
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
                    onChange={(e) =>
                      setSubdomain(
                        e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""),
                      )
                    }
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

            <div className="min-w-0 shrink-0 grow-0 basis-full">
              <div className="flex flex-col items-center gap-3 py-4 text-center">
                <div className="flex size-14 items-center justify-center rounded-full bg-primary/10">
                  <LuCreditCard size={26} className="text-text" />
                </div>
                <div>
                  <p className="font-semibold">Confirm your plan</p>
                  <p className="mt-1 text-text-muted text-sm">
                    One plan. Everything included.
                  </p>
                </div>
                <div className="w-full rounded-xl border border-border bg-surface-muted p-4 mt-2 text-left">
                  <div className="flex items-end gap-1 mb-3">
                    <span className="text-2xl font-extrabold">$40</span>
                    <span className="text-text-muted text-sm mb-0.5">
                      /month
                    </span>
                  </div>
                  <div className="space-y-2">
                    {FEATURES.map((f) => (
                      <div key={f} className="flex items-start gap-2">
                        <LuCircleCheck
                          size={14}
                          className="text-live mt-0.5 shrink-0"
                        />
                        <p className="text-xs text-text-muted">{f}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="min-w-0 shrink-0 grow-0 basis-full">
              <div className="flex flex-col items-center gap-3 py-4 text-center">
                <div className="flex size-14 items-center justify-center rounded-full bg-primary/10">
                  <LuUserPlus size={26} className="text-text" />
                </div>
                <div>
                  <p className="font-semibold">Create your login</p>
                  <p className="mt-1 text-text-muted text-sm">
                    How you'll manage your store.
                  </p>
                </div>
                <div className="w-full space-y-2.5 mt-2 text-left">
                  <input
                    type="text"
                    placeholder="Full name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full bg-surface-muted border border-border rounded-xl px-4 py-2.5 text-sm text-text placeholder:text-text-muted focus:outline-none"
                  />
                  <input
                    type="email"
                    placeholder="Email address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-surface-muted border border-border rounded-xl px-4 py-2.5 text-sm text-text placeholder:text-text-muted focus:outline-none"
                  />
                  <input
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-surface-muted border border-border rounded-xl px-4 py-2.5 text-sm text-text placeholder:text-text-muted focus:outline-none"
                  />
                  <input
                    type="password"
                    placeholder="Confirm password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full bg-surface-muted border border-border rounded-xl px-4 py-2.5 text-sm text-text placeholder:text-text-muted focus:outline-none"
                  />
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
          <Button
            className="flex-1"
            variant="secondary"
            disabled={current === 0 || isSubmitting}
            onClick={goBack}
          >
            Back
          </Button>
          <Button
            className="flex-1"
            variant="primary"
            disabled={isSubmitting}
            onClick={handleNext}
          >
            {isSubmitting ? <Spinner size={18} /> : isLast ? "Finish" : "Next"}
          </Button>
        </div>
      </div>
    </div>
  );
}
