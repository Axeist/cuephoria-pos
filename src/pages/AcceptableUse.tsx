import LegalLayout, { type LegalSection } from "@/components/legal/LegalLayout";

const SECTIONS: LegalSection[] = [
  {
    id: "purpose",
    title: "Purpose of this policy",
    content: (
      <>
        <p>
          Cuetronix is used by hundreds of venues to take real money, send real
          messages, and safeguard real guests. This Acceptable Use Policy
          (<strong>&ldquo;AUP&rdquo;</strong>) sets out the things you must not do
          with the Platform so that every operator and every guest remains safe and
          the service stays reliable for all tenants.
        </p>
        <p>
          This AUP is part of, and incorporated by reference into, our{" "}
          <a href="/terms">Terms of Service</a>. Breaching it is a material breach
          of those Terms and may result in immediate suspension or termination.
        </p>
      </>
    ),
  },
  {
    id: "illegal",
    title: "Illegal content & conduct",
    content: (
      <>
        <p>You must not use Cuetronix to:</p>
        <ul>
          <li>
            facilitate any activity that is unlawful under the laws of India or the
            jurisdiction in which your venue operates;
          </li>
          <li>
            process payments for gambling, betting, or wagering that require a
            licence you do not hold;
          </li>
          <li>launder money, finance terrorism, or evade taxes;</li>
          <li>
            host or distribute child sexual abuse material (CSAM), non-consensual
            intimate imagery, or content that glorifies violence against
            individuals or groups;
          </li>
          <li>
            infringe the intellectual-property rights of others (including unlicensed
            streams, pirated game content, or unlicensed music at a tournament);
          </li>
          <li>
            discriminate against guests on the basis of caste, religion, gender,
            sexual orientation, disability, or any other protected characteristic.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: "security",
    title: "Security & tenant isolation",
    content: (
      <>
        <p>You must not:</p>
        <ul>
          <li>
            attempt to breach the row-level security, authentication, or tenant
            isolation that separates workspaces;
          </li>
          <li>
            scan, probe, or test the vulnerability of the Platform or any linked
            system without prior written consent from{" "}
            <a href="mailto:security@cuetronix.com">security@cuetronix.com</a>;
          </li>
          <li>
            bypass rate limits, CAPTCHAs, bot protections, or audit logs;
          </li>
          <li>
            reverse-engineer, decompile, or otherwise attempt to derive the source
            code of the Platform except to the extent allowed by law;
          </li>
          <li>
            upload malware, worms, ransomware, or any code designed to harm the
            Platform or other users.
          </li>
        </ul>
        <p>
          Good-faith vulnerability disclosure is welcome and will never be
          penalised. Please use our{" "}
          <a href="mailto:security@cuetronix.com">security@cuetronix.com</a>{" "}
          channel before any testing.
        </p>
      </>
    ),
  },
  {
    id: "messaging",
    title: "Messaging & marketing",
    content: (
      <>
        <p>
          Cuetronix ships with email, SMS, and WhatsApp tools. To protect deliverability
          for every operator on the Platform, you must not:
        </p>
        <ul>
          <li>
            send unsolicited marketing messages to numbers or emails that have not
            opted in to receive them;
          </li>
          <li>
            send messages that violate TRAI DLT regulations, the CAN-SPAM Act,
            GDPR, or WhatsApp&apos;s Business Policy (spammy coupon drops,
            promotional messages outside the 24-hour customer-service window,
            etc.);
          </li>
          <li>
            use purchased, scraped, or third-party lists;
          </li>
          <li>ignore unsubscribe or STOP requests;</li>
          <li>impersonate another brand or person.</li>
        </ul>
      </>
    ),
  },
  {
    id: "platform-abuse",
    title: "Platform abuse",
    content: (
      <>
        <p>You must not:</p>
        <ul>
          <li>
            resell, sublicense, white-label, or relabel Cuetronix to other venues
            without a signed reseller agreement with Cuephoria Tech;
          </li>
          <li>
            use the Platform to build a competing product or reverse-engineer its
            workflows;
          </li>
          <li>
            deliberately input data that is known to be wrong (fake bookings,
            synthetic revenue, inflated reviews);
          </li>
          <li>
            create multiple workspaces to evade station/branch limits or to abuse
            trial credits;
          </li>
          <li>
            use API keys in client-side code that leaks them publicly.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: "fair-use",
    title: "Fair-use limits on shared resources",
    content: (
      <>
        <p>
          Some resources are shared across tenants to keep costs low. The following
          soft limits apply; contact{" "}
          <a href="mailto:support@cuetronix.com">support@cuetronix.com</a> to lift
          them if your venue genuinely needs more.
        </p>
        <ul>
          <li>API: 120 requests per minute per workspace, with burst up to 300.</li>
          <li>
            Transactional email: 10,000 messages per workspace per month on Growth;
            50,000 on Pro.
          </li>
          <li>
            Asset uploads: 2&nbsp;GB total per workspace; 25&nbsp;MB per individual
            file.
          </li>
          <li>
            Report exports: up to 10 parallel export jobs per workspace.
          </li>
        </ul>
        <p>
          Sustained abuse of shared resources may be throttled automatically to
          protect other tenants.
        </p>
      </>
    ),
  },
  {
    id: "minors",
    title: "Minors in your venue",
    content: (
      <>
        <p>
          If your venue admits minors (for example, for kids&apos; gaming parties,
          school tournaments, or supervised console sessions), you must:
        </p>
        <ul>
          <li>
            obtain parental or guardian consent before collecting a minor&apos;s
            personal data under DPDP section 9;
          </li>
          <li>
            ensure that the content available (games, VR titles, streamed media)
            meets the age rating for the minors present;
          </li>
          <li>
            not direct promotional messages at the minor directly; communicate only
            with the parent / guardian contact.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: "enforcement",
    title: "Enforcement & remedies",
    content: (
      <>
        <p>If we believe you have breached this AUP, we may:</p>
        <ul>
          <li>
            warn you and give a reasonable window to remediate (first time, low
            severity);
          </li>
          <li>
            throttle the specific feature being abused (API, messaging, uploads);
          </li>
          <li>
            suspend the workspace while we investigate (high severity, ongoing
            abuse);
          </li>
          <li>
            terminate the workspace and refuse future service (serious or repeated
            breach, illegal activity).
          </li>
        </ul>
        <p>
          In the case of immediate suspension, we will notify the owner email on
          file as soon as practicable, and give you a reasonable window to export
          data unless doing so would itself cause harm.
        </p>
      </>
    ),
  },
  {
    id: "reporting",
    title: "How to report abuse",
    content: (
      <>
        <p>
          If you see content or activity on a Cuetronix-hosted venue portal that
          violates this AUP — for example, fraudulent bookings, impersonation, or
          discriminatory content — please email{" "}
          <a href="mailto:abuse@cuetronix.com">abuse@cuetronix.com</a> with the
          workspace URL and any supporting details. Reports are triaged within one
          business day.
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
          We may update this AUP to respond to new abuse vectors or regulatory
          changes. Material changes are notified by email and by an in-app banner
          at least 15 days in advance.
        </p>
      </>
    ),
  },
];

const AcceptableUse: React.FC = () => {
  return (
    <LegalLayout
      eyebrow="Community standards"
      title="Acceptable Use Policy"
      lead={
        <>
          The rules every Cuetronix workspace agrees to follow — so the Platform
          stays reliable for every venue and every guest. Written in plain English,
          enforced uniformly.
        </>
      }
      lastUpdated="22 April 2026"
      effectiveFrom="22 April 2026"
      sections={SECTIONS}
      contactEmail="abuse@cuetronix.com"
    />
  );
};

export default AcceptableUse;
