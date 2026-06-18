import LegalLayout, { type LegalSection } from "@/components/legal/LegalLayout";

const SECTIONS: LegalSection[] = [
  {
    id: "who-we-are",
    title: "Who we are",
    content: (
      <>
        <p>
          Cuetronix is a software-as-a-service platform for snooker halls, 8-ball
          pool rooms, billiards clubs, gaming centres, esports cafes and VR arcades.
          Cuetronix is owned and operated by <strong>Cuephoria Tech</strong>, a
          technology studio registered in India. For the purposes of India&apos;s
          Digital Personal Data Protection Act, 2023 (<strong>&ldquo;DPDP&rdquo;</strong>)
          and the EU General Data Protection Regulation (<strong>&ldquo;GDPR&rdquo;</strong>),
          Cuephoria Tech acts as:
        </p>
        <ul>
          <li>
            a <strong>data fiduciary / controller</strong> for information we collect
            directly (website visitors, marketing leads, trial signups, the billing
            contact for a paying workspace);
          </li>
          <li>
            a <strong>data processor</strong> for personal data you upload into your
            workspace about your own customers, staff, and venue operations.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: "what-we-collect",
    title: "What we collect & why",
    content: (
      <>
        <p>We collect only what we need to run the Services you&apos;ve paid for:</p>
        <ul>
          <li>
            <strong>Account data:</strong> owner name, workspace name, business
            email, mobile number, billing address, GSTIN (optional), and role.
          </li>
          <li>
            <strong>Authentication data:</strong> password hashes (PBKDF2-SHA-256,
            salted per-user), TOTP secrets, Google Sign-in identifiers, session
            tokens, and audit events.
          </li>
          <li>
            <strong>Customer &amp; venue data you upload:</strong> guest names,
            contact numbers, booking history, invoices, loyalty balances, menu,
            inventory, staff rosters, tournament entries.
          </li>
          <li>
            <strong>Payment metadata:</strong> the last four digits of cards, UPI
            VPAs, gateway reference IDs, refund logs. Full card/CVV data never
            touches our servers — it is tokenised by Razorpay / Stripe.
          </li>
          <li>
            <strong>Usage telemetry:</strong> page views, device type, browser, IP
            address (truncated for aggregation), feature usage, and error traces for
            debugging.
          </li>
          <li>
            <strong>Support &amp; correspondence:</strong> tickets, chat logs,
            screen-recording snippets you share with our support team.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: "legal-bases",
    title: "Why we are allowed to process it (legal bases)",
    content: (
      <>
        <p>Our lawful bases under DPDP and GDPR are:</p>
        <ul>
          <li>
            <strong>Contract.</strong> We need to process account, workspace and
            payment data to deliver the Services you subscribed to.
          </li>
          <li>
            <strong>Legitimate interest.</strong> Usage telemetry and security logs
            are used to keep the Platform reliable and free from abuse.
          </li>
          <li>
            <strong>Consent.</strong> Marketing emails and non-essential cookies are
            only set after you opt in.
          </li>
          <li>
            <strong>Legal obligation.</strong> We retain invoices, GST ledgers and
            audit trails as required by Indian tax and companies law.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: "how-we-use",
    title: "How we use your data",
    content: (
      <>
        <ul>
          <li>to create and operate your Cuetronix workspace and its portals;</li>
          <li>to process subscription payments and issue GST-compliant invoices;</li>
          <li>
            to authenticate admins, staff, and customers, and to prevent account
            takeover;
          </li>
          <li>
            to send transactional messages (bookings, receipts, password resets,
            incident notices);
          </li>
          <li>
            to provide human support and debug issues you report (with your explicit
            permission before we access your data);
          </li>
          <li>to publish anonymous, aggregated benchmarks (e.g. average station utilisation) — never linked back to an individual venue or customer;</li>
          <li>to meet regulatory, accounting, and anti-fraud obligations.</li>
        </ul>
        <p>
          <strong>We do not sell your data.</strong> We do not rent it either. We do
          not use your Customer Data to train generative AI models without your
          explicit, written consent.
        </p>
      </>
    ),
  },
  {
    id: "sharing",
    title: "Who we share data with",
    content: (
      <>
        <p>
          Cuetronix is built on a short, carefully chosen list of sub-processors.
          Each one is bound by a data-processing agreement and is only given the
          minimum data it needs:
        </p>
        <ul>
          <li>
            <strong>Cloud hosting &amp; databases.</strong> Amazon Web Services
            (AWS, ap-south-1 Mumbai region) and managed Postgres on hardened
            instances.
          </li>
          <li>
            <strong>Payments.</strong> Razorpay (India) and Stripe (international)
            for subscription and end-customer payments.
          </li>
          <li>
            <strong>Email &amp; SMS.</strong> Resend or Amazon SES for transactional
            email; MSG91 / Twilio for SMS and WhatsApp Business.
          </li>
          <li>
            <strong>Error monitoring.</strong> Sentry for crash reports, with PII
            scrubbed at the SDK level.
          </li>
          <li>
            <strong>Analytics.</strong> Privacy-friendly, cookieless analytics
            (Plausible / PostHog EU) with IP address anonymised.
          </li>
          <li>
            <strong>Authentication.</strong> Google OAuth, if you choose to sign in
            with Google.
          </li>
        </ul>
        <p>
          We may also disclose data when required by court order, regulator, or law
          enforcement — but only after validating the legal basis and, where
          permitted, notifying you first.
        </p>
      </>
    ),
  },
  {
    id: "retention",
    title: "How long we keep your data",
    content: (
      <>
        <ul>
          <li>
            <strong>Live workspace data</strong> — as long as your subscription is
            active.
          </li>
          <li>
            <strong>Cancelled workspace</strong> — retained for 30 days read-only,
            then deleted from production systems. Backups are purged on a rolling
            90-day cycle.
          </li>
          <li>
            <strong>Invoices &amp; tax records</strong> — 8 years, as required by
            the Indian Income Tax Act and GST law.
          </li>
          <li>
            <strong>Authentication audit logs</strong> — 13 months.
          </li>
          <li>
            <strong>Marketing leads who never signed up</strong> — 18 months of
            inactivity, or until you unsubscribe.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: "security",
    title: "How we protect it",
    content: (
      <>
        <ul>
          <li>
            Every workspace is isolated with Postgres row-level security so a
            tenant cannot read another tenant&apos;s data, even in the event of an
            application bug.
          </li>
          <li>
            Data is encrypted in transit (TLS 1.2+) and at rest (AES-256 on managed
            volumes and database backups).
          </li>
          <li>
            Passwords are stored using PBKDF2-SHA-256 with per-user salts and a
            configurable work factor; TOTP-based 2FA can be enforced on all admin
            accounts.
          </li>
          <li>
            All administrative actions are written to an append-only audit log
            visible inside the app.
          </li>
          <li>
            Access to production is limited to a small set of engineers, requires
            hardware-key 2FA, and is time-boxed.
          </li>
        </ul>
        <p>
          If you believe you&apos;ve found a vulnerability, please email{" "}
          <a href="mailto:security@cuetronix.com">security@cuetronix.com</a>. We
          operate a good-faith responsible-disclosure programme.
        </p>
      </>
    ),
  },
  {
    id: "international",
    title: "International transfers",
    content: (
      <>
        <p>
          Your data is hosted in the AWS Mumbai (ap-south-1) region by default.
          When a sub-processor is located outside India, we rely on Standard
          Contractual Clauses (SCCs) and equivalent safeguards under the DPDP Act
          and, where relevant, EU GDPR Chapter V to protect the transfer.
        </p>
      </>
    ),
  },
  {
    id: "your-rights",
    title: "Your rights",
    content: (
      <>
        <p>
          Depending on where you live, you have the right to access, correct,
          download, restrict, object to the processing of, or delete your personal
          data. You also have the right to withdraw consent for marketing at any
          time. For data uploaded into a venue&apos;s workspace, the venue (not
          Cuephoria Tech) is the primary point of contact.
        </p>
        <p>
          To exercise any right, email{" "}
          <a href="mailto:privacy@cuetronix.com">privacy@cuetronix.com</a>. We will
          verify your identity and respond within 30 days.
        </p>
      </>
    ),
  },
  {
    id: "cookies",
    title: "Cookies & tracking",
    content: (
      <>
        <p>
          We use the minimum cookies necessary to keep you signed in and to remember
          your workspace preference. We do not run third-party advertising pixels or
          fingerprinting scripts. See our{" "}
          <a href="/cookies">Cookie Policy</a> for the full table of cookies, their
          purpose, and retention.
        </p>
      </>
    ),
  },
  {
    id: "children",
    title: "Children\u2019s data",
    content: (
      <>
        <p>
          Cuetronix is a business tool and is not directed at children. Venues
          admitting minors (for example, kids&apos; gaming parties) are responsible
          for obtaining parental consent under DPDP section 9 before entering a
          minor&apos;s personal data into the Platform.
        </p>
      </>
    ),
  },
  {
    id: "updates",
    title: "Updates to this policy",
    content: (
      <>
        <p>
          We may update this Privacy Policy from time to time. Material changes will
          be notified at least 30 days in advance by email and by an in-app banner.
          The &ldquo;Last updated&rdquo; timestamp at the top of this page will
          always reflect the most recent version.
        </p>
      </>
    ),
  },
  {
    id: "contact",
    title: "Contact the Data Protection Officer",
    content: (
      <>
        <p>Cuephoria Tech&apos;s Data Protection Officer can be reached at:</p>
        <ul>
          <li>
            Email: <a href="mailto:privacy@cuetronix.com">privacy@cuetronix.com</a>
          </li>
          <li>
            Legal &amp; contracts:{" "}
            <a href="mailto:legal@cuetronix.com">legal@cuetronix.com</a>
          </li>
          <li>Postal address: Cuephoria Tech, Tiruchirappalli, Tamil Nadu, India</li>
        </ul>
        <p>
          If you believe we have not resolved your concern, you also have the right
          to complain to the Data Protection Board of India or your local supervisory
          authority.
        </p>
      </>
    ),
  },
];

const Privacy: React.FC = () => {
  return (
    <LegalLayout
      eyebrow="Your data, your control"
      title="Privacy Policy"
      lead={
        <>
          How Cuephoria Tech collects, uses, and protects personal information on
          Cuetronix — written for operators, staff and end-customers, and compliant
          with India&apos;s DPDP Act and the EU GDPR.
        </>
      }
      lastUpdated="22 April 2026"
      effectiveFrom="22 April 2026"
      sections={SECTIONS}
      contactEmail="privacy@cuetronix.com"
    />
  );
};

export default Privacy;
