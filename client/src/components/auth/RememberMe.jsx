// "Remember me" on the shopper and merchant login forms. Ticked (the
// default): the login lasts 60 days and renews with use. Unticked (a
// shared or shop computer): it ends when the browser closes. The server
// side is in server/src/utils/session.js. The choice is remembered on
// this device, so a shop computer stays unticked.
export default function RememberMe({ checked, onChange }) {
  return (
    <label className="flex items-center gap-2 cursor-pointer select-none">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="w-4 h-4 rounded border-border bg-surface-muted"
      />
      <span className="text-sm text-text-muted">Remember me</span>
    </label>
  );
}
