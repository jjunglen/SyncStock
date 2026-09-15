import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import api from "../lib/api.js";

export default function ProtectedRoute({ children }) {
  const [status, setStatus] = useState("checking"); // "checking" | "ok" | "unauthorized"
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    api
      .get("/auth/me")
      .then(() => setStatus("ok"))
      .catch(() => {
        const redirectTarget = location.pathname + location.search;
        navigate(`/login?redirect=${encodeURIComponent(redirectTarget)}`);
        setStatus("unauthorized");
      });
  }, [location.pathname]);

  if (status !== "ok") return null;

  return children;
}
