// Full-width landing page band with the hairline divider between
// sections (layout adapted from Launch UI — see LAUNCH_UI_LICENSE.md)
export default function Section({ id, className = "", children }) {
  return (
    <section id={id} className={`line-b px-4 py-12 sm:py-24 md:py-32 ${className}`}>
      {children}
    </section>
  );
}
