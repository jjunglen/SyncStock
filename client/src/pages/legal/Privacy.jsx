import { Link } from "react-router-dom";
import LegalPage from "../../components/legal/LegalPage.jsx";
import { LEGAL } from "../../lib/legal.js";

// Draft — describes what the app actually collects and who receives it.
// Keep in sync with the server models and services when those change.
export default function Privacy() {
  const mail = <a href={`mailto:${LEGAL.contactEmail}`}>{LEGAL.contactEmail}</a>;

  return (
    <LegalPage title="Privacy Policy" current="/privacy">
      <p>
        {LEGAL.brand} is operated by {LEGAL.company} ("we", "us"). We help
        Shopify stores ("merchants") tell their shoppers when sold-out items
        come back. This policy explains what information we collect, how we
        use it, and the choices you have.
      </p>

      <h2>Who is responsible for your information</h2>
      <p>
        <strong>If you're a shopper</strong> who signed up on a store's
        page (for example <code>yourstore.{LEGAL.site}</code>), you gave
        your information to that store. We process it on the store's behalf
        to send you the alerts you asked for. The store can see your account
        details, sizes, alerts, and purchases made through alerts, and its
        own privacy policy also applies.
      </p>
      <p>
        <strong>If you're a merchant</strong>, or you're visiting{" "}
        {LEGAL.site}, we're responsible for the information described here.
      </p>

      <h2>Information we collect</h2>
      <h3>Account details</h3>
      <ul>
        <li>Your email address and name.</li>
        <li>
          Your password, stored only as a one-way hash, if you sign up with
          email.
        </li>
        <li>
          If you sign in with Google: your Google account ID, name, email,
          and profile photo.
        </li>
      </ul>
      <h3>Shopping preferences and alerts</h3>
      <ul>
        <li>The sizes you save, and the items and sizes you set alerts for.</li>
        <li>Your notification settings for email, in-app, text, and push.</li>
        <li>
          Your phone number, if you turn on text alerts, and whether it has
          been verified.
        </li>
        <li>
          A push subscription from your browser, if you turn on push
          notifications.
        </li>
      </ul>
      <h3>Activity</h3>
      <ul>
        <li>The notifications we send you and whether you've read them.</li>
        <li>
          When you open an item from an alert: the item, size, and time.
        </li>
        <li>
          Purchases linked to an alert: the store's order number, item, size,
          price paid, and the email on the order, which the store's Shopify
          account shares with us.
        </li>
      </ul>
      <h3>Merchant information</h3>
      <ul>
        <li>
          Your store's Shopify domain, name, and storefront address, your
          chosen subdomain, and your plan.
        </li>
        <li>
          A Shopify access token, stored encrypted, which lets us read your
          catalog and orders.
        </li>
        <li>
          Your product catalog: names, SKUs, sizes, conditions, prices, stock
          levels, and images.
        </li>
      </ul>
      <h3>Technical information</h3>
      <p>
        Our servers receive your IP address with each request, which we use
        to limit abuse (rate limiting) and which may appear in server logs.
        We don't use analytics or advertising trackers. See our{" "}
        <Link to="/cookies">Cookie Policy</Link> for the cookies and browser
        storage we use.
      </p>

      <h2>How we use it</h2>
      <ul>
        <li>To create and secure your account and keep you signed in.</li>
        <li>
          To match restocks and price drops to the sizes and items you're
          tracking, and to send the alerts you've turned on.
        </li>
        <li>
          To show merchants how their alerts perform, including which alerts
          led to purchases and which products shoppers are waiting for.
        </li>
        <li>To keep store catalogs in sync with Shopify.</li>
        <li>To prevent abuse, fix problems, and improve the service.</li>
      </ul>
      <p>We don't sell your information or use it for advertising.</p>

      <h2>Who we share it with</h2>
      <p>
        We share information only as needed to run the service, with these
        providers:
      </p>
      <ul>
        <li><strong>Shopify</strong>: store catalogs, orders, and connection.</li>
        <li><strong>Google</strong>: sign-in, if you choose it.</li>
        <li><strong>Resend</strong>: sending email.</li>
        <li><strong>Twilio</strong>: sending text messages and verification codes.</li>
        <li>
          <strong>Your browser's push service</strong> (for example Google,
          Apple, or Mozilla): delivering push notifications.
        </li>
        <li><strong>Supabase</strong>: database hosting.</li>
        <li><strong>Vercel</strong> and <strong>{LEGAL.apiHost}</strong>: website and server hosting.</li>
      </ul>
      <p>
        We also share shopper information with the store the shopper signed
        up with, as described above, and we may disclose information if the
        law requires it or to protect the rights and safety of our users.
      </p>

      <h2>How long we keep it</h2>
      <p>
        We keep your information while your account is active. Password
        reset links expire after one hour. You can ask us to delete your
        information at any time (see below), and we'll delete it unless we
        have to keep it by law.
      </p>

      <h2>Your choices</h2>
      <ul>
        <li>Update your name, email, sizes, and notification settings in your profile.</li>
        <li>Turn off email, in-app, text, or push alerts at any time.</li>
        <li>Reply STOP to any text message to stop texts.</li>
        <li>Turn off push notifications in your profile or browser settings.</li>
        <li>
          Remove yourself from a store in your profile. To delete your whole
          account and all its information, email {mail}.
        </li>
        <li>
          Depending on where you live, you may have the right to access,
          correct, or delete your information, or to object to how it's used.
          Email {mail} and we'll respond within the time the law requires.
        </li>
      </ul>

      <h2>Security</h2>
      <p>
        We protect your information with encrypted connections (HTTPS),
        hashed passwords, encrypted Shopify tokens, and sign-in cookies that
        page scripts can't read. No system is perfectly secure, so please use
        a strong password you don't use anywhere else.
      </p>

      <h2>Children</h2>
      <p>
        {LEGAL.brand} isn't directed at children under 13, and we don't
        knowingly collect their information. If you believe a child has given
        us information, email {mail} and we'll delete it.
      </p>

      <h2>Changes to this policy</h2>
      <p>
        If we make significant changes, we'll update the effective date above
        and, where appropriate, let you know by email or in the app.
      </p>

      <h2>Contact us</h2>
      <p>
        {LEGAL.company}, {LEGAL.mailingAddress}. Email: {mail}.
      </p>
    </LegalPage>
  );
}
