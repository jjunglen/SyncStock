// A Coming soon item's drop time (set by the merchant), in the viewer's
// own time zone: "Sat, Nov 22, 10:00 AM"
export const dropLabel = (iso) =>
  new Date(iso).toLocaleString(undefined, { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

// "in 2 days", "in 5 hours", "in 12 minutes"; null once it's passed
export const dropCountdown = (iso, now = Date.now()) => {
  const ms = new Date(iso).getTime() - now;
  if (!(ms > 0)) return null;
  const minutes = Math.ceil(ms / 60000);
  if (minutes < 60) return `in ${minutes} minute${minutes === 1 ? "" : "s"}`;
  const hours = Math.round(minutes / 60);
  if (hours < 48) return `in ${hours} hour${hours === 1 ? "" : "s"}`;
  const days = Math.round(hours / 24);
  return `in ${days} days`;
};
