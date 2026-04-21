import LegalLayout, { type LegalSection } from "@/components/legal/LegalLayout";

const SECTIONS: LegalSection[] = [
  {
    id: "about",
    title: "About Cuetronix & these terms",
    content: (
      <>
        <p>
          Cuetronix (<strong>"Cuetronix"</strong>, <strong>"the Platform"</strong>,{" "}
          <strong>"we"</strong>, <strong>"us"</strong>) is the billing and operations
          software for snooker halls, 8-ball pool rooms, billiards clubs, gaming
          centres, esports cafes, VR arcades and console rental lounges. Cuetronix is
          owned and operated by <strong>Cuephoria Tech</strong>, a technology studio
          registered in India, and is battle-tested at{" "}
          <a
            href="https://cuephoria.in"
            target="_blank"
            rel="noopener noreferrer"
          >
            Cuephoria Gaming Lounge
          </a>
          .
        </p>
        <p>
          These Terms of Service (<strong>"Terms"</strong>) form a legally binding
          agreement between you or the business you represent (<strong>"Customer"</strong>,{" "}
          <strong>"you"</strong>) and Cuephoria Tech, governing your access to and use
          of the Cuetronix software-as-a-service platform, its customer-facing portals,
          APIs, mobile apps, documentation and any successor products
          (collectively, the <strong>"Services"</strong>).
        </p>
        <p>
          By clicking <em>&ldquo;I agree&rdquo;</em>, signing an order form, or using
          the Services, you confirm that you have read, understood and agree to be
          bound by these Terms. If you do not agree, do not use the Services.
        </p>
      </>
    ),
  },
  {
    id: "accounts",
    title: "Account, workspace & tenants",
    content: (
      <>
        <p>
          To use Cuetronix, you must create a workspace. Each workspace is a{" "}
          <strong>multi-tenant instance</strong> isolated to your business, identified
          by a unique slug (for example <code>acme.cuetronix.com</code>). You are
          responsible for:
        </p>
        <ul>
          <li>
            the accuracy of the business, ownership, GST, and contact information you
            provide;
          </li>
          <li>
            maintaining the confidentiality of your admin and staff credentials
            (PINs, passwords, TOTP codes, API keys) and for every action taken under
            those credentials;
          </li>
          <li>
            promptly notifying us at{" "}
            <a href="mailto:security@cuetronix.com">security@cuetronix.com</a> of any
            suspected unauthorised access or compromise;
          </li>
          <li>
            ensuring that every staff member, venue operator, or end-customer you
            invite into your workspace complies with these Terms.
          </li>
        </ul>
        <p>
          You must be at least 18 years old and legally capable of contracting on
          behalf of the business you represent.
        </p>
      </>
    ),
  },
  {
    id: "subscription",
    title: "Subscription, trial & renewals",
    content: (
      <>
        <p>
          Cuetronix is offered on a <strong>subscription basis</strong> (Starter,
          Growth, Pro and Enterprise plans) and billed monthly or yearly in Indian
          Rupees, US Dollars or the currency specified on your order form. Plan
          inclusions, station limits, branch limits and feature sets are published at{" "}
          <a href="/#pricing">cuetronix.com/#pricing</a> and are subject to change on
          30 days&apos; notice for new billing cycles.
        </p>
        <p>
          <strong>Free trial.</strong> Every new workspace receives a 14-day free
          trial of the Growth plan with no credit card required. We will notify you
          at least 48 hours before the trial ends. If you do not upgrade, the
          workspace reverts to read-only mode and is retained for 30 days before
          deletion.
        </p>
        <p>
          <strong>Auto-renewal.</strong> Paid subscriptions renew automatically at
          the end of each billing cycle unless cancelled from{" "}
          <em>Settings &rarr; Billing</em> before the renewal date. Taxes (GST,
          VAT) are charged in addition where applicable.
        </p>
      </>
    ),
  },
  {
    id: "payments",
    title: "Payments, invoicing & taxes",
    content: (
      <>
        <p>
          Subscription fees and, if enabled, payment-gateway fees for your
          end-customer transactions are processed through verified partners including{" "}
          <strong>Razorpay</strong>, Stripe, and bank transfers. You authorise us and
          our partners to charge the payment method on file for all fees due.
        </p>
        <ul>
          <li>
            Invoices are issued in the name of <em>Cuephoria Tech</em> and delivered
            to the billing email on record.
          </li>
          <li>
            Indian customers are invoiced with GST as applicable; international
            customers are responsible for any local taxes, duties, or withholding.
          </li>
          <li>
            Failed payments trigger up to three retry attempts over seven days,
            after which non-payment will suspend your workspace.
          </li>
        </ul>
        <p>
          <strong>End-customer payments.</strong> When you accept payments from your
          own customers through Cuetronix (UPI, cards, wallets), those funds are
          settled by the underlying gateway directly into your merchant account.
          Cuetronix is a technology facilitator and is not a payment processor,
          money-transmitter, or financial institution.
        </p>
      </>
    ),
  },
  {
    id: "customer-data",
    title: "Your data, our role",
    content: (
      <>
        <p>
          All business data you enter or generate on the Platform
          (&ldquo;<strong>Customer Data</strong>&rdquo;) remains <strong>your property</strong>.
          This includes bookings, invoices, customer details, inventory, menu,
          tournament records, staff rosters, and any uploaded branding assets.
        </p>
        <p>
          Cuephoria Tech acts as a <strong>data processor</strong> on your behalf
          under India&apos;s Digital Personal Data Protection Act, 2023 (&ldquo;DPDP&rdquo;)
          and, where applicable, the EU GDPR. We only process Customer Data to
          operate, maintain, and improve the Services, to provide support when you
          ask for it, and to comply with the law.
        </p>
        <p>
          See our{" "}
          <a href="/privacy">Privacy Policy</a> for the full breakdown of what we
          collect, why, and for how long.
        </p>
      </>
    ),
  },
  {
    id: "acceptable-use",
    title: "Acceptable use",
    content: (
      <>
        <p>
          You must not use Cuetronix to host or facilitate any illegal activity.
          Specifically, you agree <strong>not to</strong>:
        </p>
        <ul>
          <li>resell, sublicense, or white-label the Platform without a signed reseller agreement with Cuephoria Tech;</li>
          <li>reverse-engineer, decompile, or scrape the Platform beyond rate limits published in our API docs;</li>
          <li>upload unlawful, obscene, defamatory, infringing, or fraudulent content;</li>
          <li>use the Platform to process gambling or wagering transactions that are illegal in your jurisdiction;</li>
          <li>attempt to breach tenant isolation, row-level security, or another workspace&apos;s data;</li>
          <li>use automated tooling to send unsolicited marketing (SMS, WhatsApp, email) from your workspace.</li>
        </ul>
        <p>
          The full list of prohibited activities lives in our{" "}
          <a href="/acceptable-use">Acceptable Use Policy</a>, which is incorporated
          by reference into these Terms.
        </p>
      </>
    ),
  },
  {
    id: "uptime-support",
    title: "Service levels, uptime & support",
    content: (
      <>
        <p>
          We target <strong>99.9% monthly uptime</strong> for the Cuetronix control
          plane (dashboard, API, booking portal). Scheduled maintenance is announced
          at least 72 hours in advance and, where possible, performed between 02:00
          and 05:00 IST.
        </p>
        <p>
          <strong>Support channels.</strong>
        </p>
        <ul>
          <li>
            <em>Starter</em>: email at{" "}
            <a href="mailto:support@cuetronix.com">support@cuetronix.com</a>, 1
            business-day response.
          </li>
          <li>
            <em>Growth</em>: priority email + WhatsApp support, 4-hour weekday
            response.
          </li>
          <li>
            <em>Pro</em>: dedicated success manager, 1-hour business-hour response,
            guided onboarding calls.
          </li>
          <li>
            <em>Enterprise</em>: 24 &times; 7 on-call with a contractual SLA, custom
            incident runbooks.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: "suspension",
    title: "Suspension & termination",
    content: (
      <>
        <p>
          Either party may terminate these Terms with 30 days&apos; written notice.
          In addition, Cuephoria Tech may suspend or terminate your access
          immediately if:
        </p>
        <ul>
          <li>you fail to pay undisputed fees for more than 14 days;</li>
          <li>you materially breach these Terms or our Acceptable Use Policy;</li>
          <li>continued operation would expose other tenants or the Platform to security, legal, or reputational harm.</li>
        </ul>
        <p>
          On termination, we will give you 30 days to export your Customer Data via
          our self-service exports or a concierge export for Pro/Enterprise. After
          that window, your workspace and all Customer Data are permanently deleted
          from production systems, with backups purged on a rolling 90-day schedule.
        </p>
      </>
    ),
  },
  {
    id: "refunds",
    title: "Refunds & cancellation",
    content: (
      <>
        <p>
          Refunds and cancellations are governed by our dedicated{" "}
          <a href="/refund-policy">Refund &amp; Cancellation Policy</a>. Briefly:
        </p>
        <ul>
          <li>
            You may cancel any paid plan at any time from{" "}
            <em>Settings &rarr; Billing</em>. You retain access until the end of the
            current billing cycle.
          </li>
          <li>
            Monthly plans are non-refundable for the current month.
          </li>
          <li>
            Yearly plans cancelled within 14 days of the first invoice are fully
            refundable (minus transaction fees).
          </li>
          <li>
            End-customer payments processed through the booking portal are refunded
            by the venue (you) using the in-app refund flow; Cuetronix does not
            custody those funds.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: "ip",
    title: "Intellectual property",
    content: (
      <>
        <p>
          The Cuetronix software, dashboard UI, icons, marketing copy, and
          documentation are the exclusive property of Cuephoria Tech and are
          protected by Indian and international copyright, trademark, and trade-dress
          law. <strong>&ldquo;Cuetronix&rdquo;</strong>, <strong>&ldquo;Cuephoria&rdquo;</strong>,
          and <strong>&ldquo;Cuephoria Tech&rdquo;</strong> are trademarks of
          Cuephoria Tech.
        </p>
        <p>
          Customer Data, your logo, menu photographs, and branding assets remain
          your property; you grant us a non-exclusive, royalty-free licence to use
          them only to operate your workspace. No licence is granted to train
          generative AI models on your data without your explicit, written consent.
        </p>
      </>
    ),
  },
  {
    id: "warranties",
    title: "Warranties & disclaimers",
    content: (
      <>
        <p>
          We warrant that the Services will perform materially in line with the
          published documentation. Except as expressly stated in these Terms, the
          Services are provided <strong>&ldquo;as is&rdquo;</strong> and{" "}
          <strong>&ldquo;as available&rdquo;</strong>. To the maximum extent
          permitted by law, we disclaim all other warranties, express or implied,
          including merchantability, fitness for a particular purpose, and
          non-infringement.
        </p>
      </>
    ),
  },
  {
    id: "liability",
    title: "Limitation of liability",
    content: (
      <>
        <p>
          To the maximum extent permitted by law, neither party shall be liable for
          any indirect, incidental, special, consequential, or punitive damages,
          including loss of profits, revenue, goodwill, or data, even if advised of
          the possibility of such damages.
        </p>
        <p>
          Cuephoria Tech&apos;s aggregate liability under these Terms shall not
          exceed the subscription fees you paid in the <strong>twelve (12)</strong>{" "}
          months preceding the event giving rise to the claim, or INR 50,000,
          whichever is higher. This cap does not apply to breaches of confidentiality,
          infringement indemnities, or wilful misconduct.
        </p>
      </>
    ),
  },
  {
    id: "indemnity",
    title: "Mutual indemnity",
    content: (
      <>
        <p>
          Each party will indemnify the other against third-party claims arising
          from (a) its breach of these Terms, (b) its violation of law, or (c)
          infringement of third-party intellectual property rights caused by its
          content or conduct. The indemnified party must promptly notify the
          indemnifying party and cooperate in defence.
        </p>
      </>
    ),
  },
  {
    id: "law",
    title: "Governing law & disputes",
    content: (
      <>
        <p>
          These Terms are governed by the laws of the Republic of India, without
          regard to conflict-of-laws principles. Any dispute shall first be
          negotiated in good faith between the parties for 30 days. Failing
          resolution, disputes shall be submitted to the exclusive jurisdiction of
          the courts at <strong>Tiruchirappalli, Tamil Nadu, India</strong>, and, at
          Cuephoria Tech&apos;s option, resolved by arbitration under the
          Arbitration and Conciliation Act, 1996, with a sole arbitrator in English,
          seated in Chennai.
        </p>
      </>
    ),
  },
  {
    id: "changes",
    title: "Changes to these Terms",
    content: (
      <>
        <p>
          We may update these Terms from time to time. Material changes will be
          notified at least 30 days in advance by email and by an in-app banner.
          Non-material changes (clarifications, typos, reference updates) may take
          effect immediately on publication. Your continued use after the effective
          date of a change constitutes acceptance.
        </p>
      </>
    ),
  },
  {
    id: "contact",
    title: "Contact us",
    content: (
      <>
        <p>
          Questions about these Terms or the Services?
        </p>
        <ul>
          <li>
            Legal &amp; contracts: <a href="mailto:legal@cuetronix.com">legal@cuetronix.com</a>
          </li>
          <li>
            Support: <a href="mailto:support@cuetronix.com">support@cuetronix.com</a>
          </li>
          <li>
            Security disclosure: <a href="mailto:security@cuetronix.com">security@cuetronix.com</a>
          </li>
          <li>
            Postal address: Cuephoria Tech, Tiruchirappalli, Tamil Nadu, India
          </li>
        </ul>
      </>
    ),
  },
];

const Terms: React.FC = () => {
  return (
    <LegalLayout
      eyebrow="Master agreement"
      title="Terms of Service"
      lead={
        <>
          The master agreement that governs your use of Cuetronix — the snooker,
          8-ball and gaming-centre billing software built by Cuephoria Tech.
          Written in plain English, structured for operators, and designed to be
          fair both ways.
        </>
      }
      lastUpdated="22 April 2026"
      effectiveFrom="22 April 2026"
      sections={SECTIONS}
      contactEmail="legal@cuetronix.com"
    />
  );
};

export default Terms;
