import { useState, useCallback, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  LuMail,
  LuLock,
  LuUser,
  LuEye,
  LuEyeOff,
  LuTriangleAlert,
  LuKeyRound,
} from "react-icons/lu";
import api from "../../lib/api.js";
import Spinner from "../ui/Spinner.jsx";

const calculatePasswordStrength = (password) => {
  const requirements = {
    length: password.length >= 8,
    number: /\d/.test(password),
    symbol: /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password),
  };
  const score = Object.values(requirements).filter(Boolean).length;
  const feedback = [];
  if (!requirements.length) feedback.push("At least 8 characters");
  if (!requirements.number) feedback.push("One number");
  if (!requirements.symbol) feedback.push("One special character");
  return { score, feedback };
};

function PasswordStrengthIndicator({ password }) {
  const strength = calculatePasswordStrength(password);
  if (!password) return null;

  const strengthColor =
    strength.score <= 1
      ? "bg-danger"
      : strength.score === 2
        ? "bg-warn"
        : "bg-live";
  const strengthText =
    strength.score <= 1 ? "Weak" : strength.score === 2 ? "Fair" : "Good";

  return (
    <div className="mt-2 space-y-1.5">
      <div className="flex items-center gap-2">
        <div className="flex-1 bg-surface-muted rounded-full h-1.5 overflow-hidden">
          <div
            className={`h-full ${strengthColor} rounded-full transition-all`}
            style={{ width: `${(strength.score / 3) * 100}%` }}
          />
        </div>
        <span className="text-xs text-text-muted min-w-[40px]">
          {strengthText}
        </span>
      </div>
      {strength.feedback.length > 0 && (
        <div className="flex flex-col gap-0.5">
          {strength.feedback.map((item) => (
            <span
              key={item}
              className="text-xs text-warn flex items-center gap-1"
            >
              <LuTriangleAlert size={11} /> {item}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export default function AuthForm({ initialMode = "login" }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [authMode, setAuthMode] = useState(initialMode);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});

  useEffect(() => {
    const savedEmail = localStorage.getItem("syncstock_email");
    if (savedEmail && authMode === "login") {
      setFormData((prev) => ({ ...prev, email: savedEmail }));
    }
  }, [authMode]);

  const validateField = useCallback((field, value) => {
    switch (field) {
      case "email":
        if (!value.trim()) return "Email is required";
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value))
          return "Enter a valid email address";
        return "";
      case "password":
        if (!value) return "Password is required";
        if (value.length < 8) return "Password must be at least 8 characters";
        return "";
      default:
        return "";
    }
  }, []);

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (touched[field]) {
      setErrors((prev) => ({
        ...prev,
        [field]: validateField(field, value) || undefined,
      }));
    }
  };

  const handleBlur = (field) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    setErrors((prev) => ({
      ...prev,
      [field]: validateField(field, formData[field]) || undefined,
    }));
  };

  const validateForm = () => {
    const newErrors = {};
    ["email", "password"].forEach((f) => {
      const err = validateField(f, formData[f]);
      if (err) newErrors[f] = err;
    });
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSuccessMessage("");
    setErrors((prev) => ({ ...prev, general: undefined }));

    if (authMode === "reset") {
      if (!formData.email.trim()) {
        setErrors({ email: "Email is required" });
        return;
      }
      setIsLoading(true);
      try {
        await api.post("/auth/forgot-password", { email: formData.email });
        setSuccessMessage(
          "If that email is registered, a reset link has been sent.",
        );
      } catch {
        setErrors({ general: "Something went wrong. Please try again." });
      } finally {
        setIsLoading(false);
      }
      return;
    }

    if (!validateForm()) return;

    setIsLoading(true);
    try {
      await api.post("/auth/merchant/login", {
        email: formData.email,
        password: formData.password,
      });
      localStorage.setItem("syncstock_email", formData.email);
      const redirectTo = searchParams.get("redirect");
      navigate(redirectTo || "/dashboard");
    } catch (err) {
      const message =
        err.response?.data?.message ||
        "Something went wrong. Please try again.";
      setErrors({ general: message });
    } finally {
      setIsLoading(false);
    }
  };

  const inputClass = (field) =>
    `w-full pl-10 pr-4 py-3 bg-surface-muted border rounded-xl placeholder:text-text-muted text-text focus:outline-none focus:ring-2 focus:ring-white/10 transition-all ${
      errors[field] ? "border-danger" : "border-border"
    }`;

  if (authMode === "reset") {
    return (
      <div className="p-6 max-w-sm mx-auto">
        <div className="text-center mb-6">
          <LuKeyRound size={40} className="text-text mx-auto mb-3" />
          <h2 className="text-xl font-semibold mb-1">Password recovery</h2>
          <p className="text-text-muted text-sm">
            Enter your email and we'll send you a reset link.
          </p>
        </div>

        {successMessage && (
          <div className="mb-4 p-3 bg-live/10 border border-live/30 rounded-xl text-sm text-live">
            {successMessage}
          </div>
        )}
        {errors.general && (
          <div className="mb-4 p-3 bg-danger/10 border border-danger/30 rounded-xl text-sm text-danger flex items-center gap-2">
            <LuTriangleAlert size={14} /> {errors.general}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <LuMail
              className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
              size={18}
            />
            <input
              type="email"
              placeholder="Email address"
              value={formData.email}
              onChange={(e) => handleChange("email", e.target.value)}
              className={inputClass("email")}
            />
          </div>
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-primary text-primary-text font-medium py-3 px-6 rounded-xl hover:opacity-90 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
          >
            {isLoading ? <Spinner size={18} /> : "Send reset link"}
          </button>
          <div className="text-center">
            <button
              type="button"
              onClick={() => setAuthMode("login")}
              className="text-sm text-text-muted hover:text-text transition-colors"
            >
              Back to login
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-sm mx-auto">
      {errors.general && (
        <div className="mb-4 p-3 bg-danger/10 border border-danger/30 rounded-xl text-sm text-danger flex items-center gap-2">
          <LuTriangleAlert size={14} /> {errors.general}
        </div>
      )}

      <div className="text-center mb-6">
        <h2 className="text-xl font-semibold mb-1">
          {authMode === "login" ? "Welcome back" : "Connect POS"}
        </h2>
        <p className="text-text-muted text-sm">
          {authMode === "login"
            ? "Sign in to manage your alerts"
            : "Creating an account starts with linking your store"}
        </p>
      </div>

      <div className="flex bg-surface-muted rounded-xl p-1 mb-6">
        <button
          type="button"
          onClick={() => setAuthMode("login")}
          className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${authMode === "login" ? "bg-surface text-text" : "text-text-muted hover:text-text"}`}
        >
          Login
        </button>
        <button
          type="button"
          onClick={() => setAuthMode("signup")}
          className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${authMode === "signup" ? "bg-surface text-text" : "text-text-muted hover:text-text"}`}
        >
          Sign up
        </button>
      </div>

      {authMode === "signup" ? (
        <button
          type="button"
          onClick={() => navigate("/onboarding")}
          className="w-full bg-primary text-primary-text font-medium py-3 px-6 rounded-xl hover:opacity-90 transition-all"
        >
          Link POS
        </button>
      ) : (
        <>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <LuMail
                className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
                size={18}
              />
              <input
                type="email"
                placeholder="Email address"
                value={formData.email}
                onChange={(e) => handleChange("email", e.target.value)}
                onBlur={() => handleBlur("email")}
                className={inputClass("email")}
              />
              {errors.email && (
                <p className="text-danger text-xs mt-1">{errors.email}</p>
              )}
            </div>

            <div className="relative">
              <LuLock
                className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
                size={18}
              />
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                value={formData.password}
                onChange={(e) => handleChange("password", e.target.value)}
                onBlur={() => handleBlur("password")}
                className={`${inputClass("password")} pr-12`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text"
              >
                {showPassword ? <LuEyeOff size={18} /> : <LuEye size={18} />}
              </button>
              {errors.password && (
                <p className="text-danger text-xs mt-1">{errors.password}</p>
              )}
            </div>

            <div className="text-right">
              <button
                type="button"
                onClick={() => setAuthMode("reset")}
                className="text-sm text-text-muted hover:text-text transition-colors"
              >
                Forgot password?
              </button>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-primary text-primary-text font-medium py-3 px-6 rounded-xl hover:opacity-90 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
            >
              {isLoading ? <Spinner size={18} /> : "Sign in"}
            </button>
          </form>
        </>
      )}
    </div>
  );
}
