import { useEffect, useState } from "react";
import { LuImage } from "react-icons/lu";
import api from "../../lib/api.js";

// A sell-request photo. They're private (no public links), so each one is
// fetched through the signed-in API and shown from memory.
//   url — "/sell/photos/<id>" from the API
export default function AuthPhoto({ url, alt = "", className = "" }) {
  const [src, setSrc] = useState(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let objectUrl = null;
    let active = true;
    api
      .get(url, { responseType: "blob" })
      .then((res) => {
        if (!active) return;
        objectUrl = URL.createObjectURL(res.data);
        setSrc(objectUrl);
      })
      .catch(() => active && setFailed(true));
    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [url]);

  if (!src) {
    return (
      <div className={`flex items-center justify-center bg-surface-muted text-text-muted ${className}`} aria-label={failed ? "Photo unavailable" : "Loading photo"}>
        <LuImage size={16} aria-hidden="true" />
      </div>
    );
  }
  return <img src={src} alt={alt} className={`object-cover ${className}`} />;
}
