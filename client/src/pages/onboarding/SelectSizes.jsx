import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Button from "../../components/ui/Button.jsx";
import Spinner from "../../components/ui/Spinner.jsx";
import SizeSelector from "./SizeSelector.jsx";
import api from "../../lib/api.js";
import { safeRedirect } from "../../lib/safeRedirect.js";

export default function SelectSizes() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [selected, setSelected] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleContinue = async () => {
    setIsSubmitting(true);
    setError("");
    try {
      await api.put("/users/profile", { sizes: selected });
      navigate(safeRedirect(searchParams.get("redirect"), "/store/dashboard"));
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Something went wrong. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-bg text-text p-6 pt-32">
      <h1 className="text-2xl md:text-3xl font-display font-semibold mb-3 text-center">
        What sizes do you wear?
      </h1>
      <p className="text-text-muted text-sm text-center mb-10">
        We'll only show you what's actually relevant.
      </p>

      <div className="max-w-lg mx-auto">
        <SizeSelector selected={selected} onChange={setSelected} />

        {error && (
          <p className="text-danger text-xs mt-6 text-center">{error}</p>
        )}

        <div className="mt-10 flex justify-center">
          <Button
            variant="primary"
            size="lg"
            disabled={isSubmitting || selected.length === 0}
            onClick={handleContinue}
          >
            {isSubmitting ? <Spinner size={18} /> : "Continue"}
          </Button>
        </div>
      </div>
    </div>
  );
}
