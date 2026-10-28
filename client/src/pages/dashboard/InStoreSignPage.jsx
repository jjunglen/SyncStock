import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { LuArrowLeft, LuPrinter } from "react-icons/lu";
import Button from "../../components/ui/Button.jsx";
import Spinner from "../../components/ui/Spinner.jsx";
import InStoreSign from "../../components/store/InStoreSign.jsx";
import api from "../../lib/api.js";
import { getMyStore } from "../../lib/myStore.js";

// /settings/sign — the in-store QR card on its own, ready to print or
// save as a PDF (the browser's print dialog). The page is sized to the
// card, 4 × 6 inches, so "Save as PDF" makes a card-sized file a print
// shop can use; on letter paper it prints at actual size to cut out.
export default function InStoreSignPage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([getMyStore(), api.get("/store/settings")])
      .then(([store, settingsRes]) => setData({ store, settings: settingsRes.data.data }))
      .catch(() => setError("Couldn't load your store"));
  }, []);

  return (
    <div className="min-h-screen bg-bg text-text">
      <style>{`
        @page { size: 4in 6in; margin: 0; }
        @media print {
          html, body { background: #ffffff !important; }
          .no-print { display: none !important; }
          .sign-page { padding: 0 !important; min-height: 0 !important; }
          .in-store-sign { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      `}</style>

      <div className="no-print max-w-xl mx-auto px-4 pt-8 flex items-center justify-between gap-4">
        <Link to="/settings" className="inline-flex items-center gap-1.5 text-sm text-text-muted hover:text-text">
          <LuArrowLeft size={14} /> Store settings
        </Link>
        <Button variant="primary" size="sm" onClick={() => window.print()} disabled={!data}>
          <span className="flex items-center gap-1.5">
            <LuPrinter size={14} /> Print or save as PDF
          </span>
        </Button>
      </div>
      <p className="no-print max-w-xl mx-auto px-4 mt-3 text-xs text-text-muted">
        4 × 6 inch card. In the print dialog, choose "Save as PDF" for a print shop, or print at
        100% (actual size) and cut along the edge.
      </p>

      <div className="sign-page flex justify-center px-4 py-8">
        {error ? (
          <p className="text-sm text-danger">{error}</p>
        ) : !data ? (
          <Spinner size={20} />
        ) : (
          <div className="shadow-lg print:shadow-none">
            <InStoreSign
              name={data.store?.name}
              subdomain={data.store?.subdomain}
              logoUrl={data.settings.logo_url}
              brandColor={data.settings.brand_color}
            />
          </div>
        )}
      </div>
    </div>
  );
}
