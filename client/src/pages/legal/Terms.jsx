import { Link } from "react-router-dom";
import LegalPage from "../../components/legal/LegalPage.jsx";
import { LEGAL } from "../../lib/legal.js";
import { PLAN } from "../../lib/plan.js";

// Draft — have a lawyer review before launch (see lib/legal.js)
export default function Terms() {
  const mail = <a href={`mailto:${LEGAL.contactEmail}`}>{LEGAL.contactEmail}</a>;

  return (
    <LegalPage title="Terms of Service" current="/terms">
      <p>
        These terms are an agreement between you and {LEGAL.company} ("we",
        "us") for your use of {LEGAL.brand}, including {LEGAL.site}, store
        pages on our subdomains, and our notifications. By creating an
        account or using {LEGAL.brand}, you agree to these terms and to our{" "}
        <Link to="/privacy">Privacy Policy</Link>.
      </p>

      <h2>What {LEGAL.brand} does</h2>
      <p>
        {LEGAL.brand} connects to a merchant's Shopify store, lets the
        store's shoppers save their sizes and set alerts, and notifies them
        by email, text, in-app, or push when tracked items restock or drop in
        price. Merchants get a dashboard showing how those alerts perform.
      </p>

      <h2>Your account</h2>
      <ul>
        <li>You must be at least 13, and old enough to form a contract where you live.</li>
        <li>Give accurate information and keep it up to date.</li>
        <li>
          Keep your password secure. You're responsible for activity on your
          account, so tell us right away at {mail} if you think someone else
          has used it.
        </li>
      </ul>

      <h2>For shoppers</h2>
      <ul>
        <li>
          Stores decide what they sell, and their prices and stock. Alerts
          reflect what the store's Shopify catalog tells us, and items can
          sell out again before you check out.
        </li>
        <li>
          We try to send alerts quickly but can't guarantee that every alert
          will arrive, or arrive on time.
        </li>
        <li>
          Purchases happen on the store's own Shopify checkout. The store is
          the seller and is responsible for orders, payment, shipping,
          returns, and product authenticity.
        </li>
      </ul>

      <h2>Text messages</h2>
      <p>
        If you add and verify a phone number and turn on text alerts, we'll
        text you about restocks you're tracking. How often depends on your
        alerts. Message and data rates may apply. Reply STOP to stop texts at
        any time, or HELP for help. Carriers aren't responsible for delayed
        or undelivered messages.
      </p>

      <h2>For merchants</h2>
      <ul>
        <li>
          You must have the right to connect the Shopify store you connect,
          and you authorize us to read its catalog and orders and to register
          webhooks to keep them in sync.
        </li>
        <li>
          You're responsible for your products, listings, prices, and orders,
          and for following the laws that apply to your store, including
          consumer protection and marketing laws.
        </li>
        <li>
          You're responsible for having your shoppers' consent where the law
          requires it for the messages you use {LEGAL.brand} to send them.
        </li>
        <li>
          Use shopper information you see in {LEGAL.brand} only to run your
          store and serve those shoppers, in line with our{" "}
          <Link to="/privacy">Privacy Policy</Link> and your own.
        </li>
      </ul>

      <h2>Fees</h2>
      <p>
        The {PLAN.name} plan costs ${PLAN.price} per month, plus any
        applicable taxes, unless a different price is shown when you sign up.
        Fees are billed in advance and aren't refundable except where the law
        requires. We'll give you at least 30 days' notice before changing
        your price. You can cancel at any time, and cancellation takes effect
        at the end of your current billing period.
      </p>

      <h2>Acceptable use</h2>
      <p>Don't use {LEGAL.brand} to:</p>
      <ul>
        <li>Break the law or anyone's rights, or sell counterfeit goods.</li>
        <li>Send spam or messages people didn't agree to receive.</li>
        <li>
          Access accounts or data that aren't yours, or probe, overload, or
          interfere with the service.
        </li>
        <li>Scrape the service, or resell it without our written permission.</li>
      </ul>

      <h2>Ownership</h2>
      <p>
        We own {LEGAL.brand} and its software, design, and branding.
        Merchants keep ownership of their product content and give us
        permission to use it to provide the service. We may use feedback you
        send us without any obligation to you.
      </p>

      <h2>Ending your use</h2>
      <p>
        You can stop using {LEGAL.brand} at any time. Shoppers can remove
        themselves from a store in their profile. We may suspend or end
        accounts that break these terms or put other users at risk, and
        we'll tell you when we reasonably can.
      </p>

      <h2>Disclaimers</h2>
      <p>
        {LEGAL.brand} is provided "as is" and "as available". To the extent
        the law allows, we disclaim all warranties, including
        merchantability, fitness for a particular purpose, and
        non-infringement, and we don't promise the service will be
        uninterrupted or error-free.
      </p>

      <h2>Limitation of liability</h2>
      <p>
        To the extent the law allows, we aren't liable for indirect,
        incidental, special, consequential, or punitive damages, or for lost
        profits, sales, or data. Our total liability for any claim relating
        to {LEGAL.brand} is limited to the greater of the amount you paid us
        in the 12 months before the claim, or $100.
      </p>

      <h2>Changes to these terms</h2>
      <p>
        We may update these terms. If a change is significant, we'll update
        the effective date above and let you know by email or in the app
        before it takes effect. Continuing to use {LEGAL.brand} after that
        means you accept the new terms.
      </p>

      <h2>Governing law</h2>
      <p>
        These terms are governed by the laws of {LEGAL.governingLaw},
        without regard to its conflict-of-laws rules, and any dispute will be
        heard in the courts located there, unless the law where you live
        says otherwise.
      </p>

      <h2>Contact us</h2>
      <p>
        {LEGAL.company}, {LEGAL.mailingAddress}. Email: {mail}.
      </p>
    </LegalPage>
  );
}
