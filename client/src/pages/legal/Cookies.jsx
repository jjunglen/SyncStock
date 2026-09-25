import { Link } from "react-router-dom";
import LegalPage from "../../components/legal/LegalPage.jsx";
import { LEGAL } from "../../lib/legal.js";

// Every cookie and browser-storage key the app uses. Update this list
// whenever one is added: server res.cookie() calls and client
// localStorage / sessionStorage keys.
const COOKIES = [
  {
    name: "session_token",
    purpose: "Keeps you signed in. Scripts on the page can't read it.",
    who: "Everyone who signs in",
    duration: "7 days",
  },
  {
    name: "shopify_oauth_state",
    purpose: "Protects the Shopify connection step from forged requests.",
    who: "Merchants connecting Shopify",
    duration: "10 minutes",
  },
];

const STORAGE = [
  {
    name: "syncstock_theme",
    purpose: "Remembers light or dark mode on your dashboard.",
    duration: "Until you clear it",
  },
  {
    name: "syncstock_last_login_method",
    purpose: 'Shows a "Last used" label on the sign-in method you used.',
    duration: "Until you clear it",
  },
  {
    name: "syncstock_customer_email, syncstock_email",
    purpose: "Pre-fills your email on the sign-in form.",
    duration: "Until you clear it",
  },
  {
    name: "onboarding_token, onboarding_subdomain",
    purpose: "Carries a merchant through store setup.",
    duration: "Until the tab closes",
  },
];

export default function Cookies() {
  const mail = <a href={`mailto:${LEGAL.contactEmail}`}>{LEGAL.contactEmail}</a>;

  return (
    <LegalPage title="Cookie Policy" current="/cookies">
      <p>
        This policy explains the cookies and similar browser storage{" "}
        {LEGAL.brand} uses. <strong>We only use what's needed to run the
        service and remember your settings. We don't use analytics,
        advertising, or tracking cookies</strong>, so we don't show a cookie
        banner.
      </p>

      <h2>Cookies</h2>
      <p>
        Cookies are small files your browser stores for a website. These are
        strictly necessary: without them, signing in and connecting a store
        wouldn't work.
      </p>
      <div className="overflow-x-auto">
      <table>
        <thead>
          <tr>
            <th scope="col">Name</th>
            <th scope="col">Purpose</th>
            <th scope="col">Used for</th>
            <th scope="col">Expires</th>
          </tr>
        </thead>
        <tbody>
          {COOKIES.map((c) => (
            <tr key={c.name}>
              <td><code>{c.name}</code></td>
              <td>{c.purpose}</td>
              <td>{c.who}</td>
              <td>{c.duration}</td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>

      <h2>Browser storage</h2>
      <p>
        We also save a few settings in your browser's local and session
        storage. They stay on your device and aren't sent to our servers.
      </p>
      <div className="overflow-x-auto">
      <table>
        <thead>
          <tr>
            <th scope="col">Name</th>
            <th scope="col">Purpose</th>
            <th scope="col">Kept</th>
          </tr>
        </thead>
        <tbody>
          {STORAGE.map((s) => (
            <tr key={s.name}>
              <td><code>{s.name}</code></td>
              <td>{s.purpose}</td>
              <td>{s.duration}</td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>

      <h2>Other companies' cookies</h2>
      <p>
        If you sign in with Google or connect a Shopify store, you'll briefly
        visit Google's or Shopify's own site, which sets its own cookies
        under its own policies. We don't control those cookies.
      </p>

      <h2>Managing cookies</h2>
      <p>
        You can clear or block cookies and site data in your browser
        settings. If you block the cookies above, you won't be able to stay
        signed in. Clearing browser storage resets your theme and remembered
        email.
      </p>

      <h2>Changes</h2>
      <p>
        If we start using a new kind of cookie, especially analytics or
        advertising cookies, we'll update this page, and ask for your consent
        first where the law requires it.
      </p>

      <h2>Contact us</h2>
      <p>
        Questions? Email {mail}. For how we handle your information more
        broadly, see our <Link to="/privacy">Privacy Policy</Link>.
      </p>
    </LegalPage>
  );
}
