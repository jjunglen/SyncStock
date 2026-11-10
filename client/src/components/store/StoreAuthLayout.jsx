import StoreHeader from "./StoreHeader.jsx";

// Wraps the store's log in / sign up forms with the store header (its
// Back button returns to the page the shopper came from)
export default function StoreAuthLayout({ children }) {
  return (
    <div className="min-h-screen bg-bg text-text">
      <StoreHeader />
      <main className="pt-20 pb-16">{children}</main>
    </div>
  );
}
