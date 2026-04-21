import LegalLayout, { type LegalSection } from "@/components/legal/LegalLayout";

const SECTIONS: LegalSection[] = [
  {
    id: "summary",
    title: "Summary — fair both ways",
    content: (
      <>
        <p>
          We want Cuetronix to feel low-risk. That&apos;s why we offer a generous
          14-day free trial on every plan, a <strong>30-day money-back guarantee</strong>{" "}
          on your first paid invoice, and instant in-app cancellations — no phone
          calls, no retention gauntlet, no &ldquo;please talk to a manager&rdquo;.
          This page explains exactly when refunds apply, how quickly you get your
          money back, and what happens to refunds on end-customer payments that
          pass through your venue&apos;s booking portal.
        </p>
        <p>
          This Refund &amp; Cancellation Policy is part of, and governed by, our{" "}
          <a href="/terms">Terms of Service</a>. Capitalised terms not defined here
          carry the meaning set out there.
        </p>
      </>
    ),
  },
  {
    id: "trial",
    title: "Free trial",
    content: (
      <>
        <ul>
          <li>
            Every new Cuetronix workspace starts with a <strong>14-day free trial</strong>{" "}
            of the Growth plan. No credit card is required.
          </li>
          <li>
            We will email you at day 10, day 13, and 24 hours before the trial ends.
            If you do not upgrade, the workspace reverts to read-only so you can
            still export data; full deletion happens 30 days later.
          </li>
          <li>
            You can upgrade mid-trial at any time — your billing clock only starts
            the moment you pay.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: "cancellation",
    title: "Cancelling a paid subscription",
    content: (
      <>
        <ul>
          <li>
            You can cancel any paid plan, any time, from{" "}
            <em>Settings &rarr; Billing</em>. No call or form required.
          </li>
          <li>
            On cancellation you keep full access until the end of the current
            billing cycle. We will not bill you again.
          </li>
          <li>
            When the cycle ends, your workspace moves to a 30-day read-only grace
            window; after that, it is deleted as described in our{" "}
            <a href="/privacy">Privacy Policy</a>.
          </li>
          <li>
            Cancelling does not prevent you from signing up again — your historical
            data is recoverable for up to 90 days through a support ticket.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: "monthly",
    title: "Refunds on monthly subscriptions",
    content: (
      <>
        <p>
          Monthly subscription fees are <strong>non-refundable</strong> for the
          current month once paid, because your workspace has already been
          provisioned, hosted, and supported during that period. You remain in full
          control until the end of the billing cycle.
        </p>
        <p>
          Exceptions: if Cuetronix is materially unavailable for more than four
          consecutive hours during a paid month (excluding scheduled maintenance),
          you may request a prorated service credit. Contact{" "}
          <a href="mailto:billing@cuetronix.com">billing@cuetronix.com</a> with the
          incident timestamp; we will verify against our status page and issue the
          credit within 7 business days.
        </p>
      </>
    ),
  },
  {
    id: "yearly",
    title: "Refunds on yearly subscriptions",
    content: (
      <>
        <p>
          Yearly plans come with a <strong>30-day money-back guarantee</strong>{" "}
          from the date of your first annual invoice.
        </p>
        <ul>
          <li>
            Request a refund within 30 days of the first annual invoice and we will
            refund the full amount paid, minus any payment-gateway fees already
            deducted by Razorpay or Stripe (typically 2&ndash;3%).
          </li>
          <li>
            After day 30, yearly plans are non-refundable for the remainder of the
            committed term. You may still cancel and retain access until the term
            ends.
          </li>
          <li>
            For mid-term <strong>plan downgrades</strong> (for example, Pro to
            Growth), the difference in prepaid fees is credited to your account and
            applied automatically to future invoices — it is not refunded in cash.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: "enterprise",
    title: "Enterprise contracts",
    content: (
      <>
        <p>
          Enterprise subscriptions are governed by the signed order form and
          master-service agreement (MSA) between your organisation and Cuephoria
          Tech. Refund, cancellation, and termination-for-convenience windows are
          specified there and override the standard policy on this page.
        </p>
      </>
    ),
  },
  {
    id: "end-customer-refunds",
    title: "Refunds on end-customer payments at your venue",
    content: (
      <>
        <p>
          When a player or guest pays your venue through the Cuetronix booking
          portal or POS (UPI, cards, wallets), those funds are settled by the
          underlying payment gateway directly into <strong>your</strong> merchant
          bank account. <strong>Cuephoria Tech does not custody</strong> those
          funds. Accordingly:
        </p>
        <ul>
          <li>
            Refunds for end-customer bookings, cancellations, no-shows, or disputes
            are initiated by <strong>you, the venue</strong>, from inside Cuetronix.
            We provide a one-click refund flow in the booking and POS screens.
          </li>
          <li>
            The refund is processed by Razorpay / Stripe back to the original
            payment method and typically reaches the guest within 5&ndash;7 business
            days.
          </li>
          <li>
            Your own refund and cancellation policy for bookings (hours of notice,
            penalty percentages, happy-hour rules) should be displayed on your
            customer portal — we provide a template in{" "}
            <em>Settings &rarr; Booking policy</em>.
          </li>
          <li>
            Payment-gateway fees for the original transaction are generally{" "}
            <strong>not refunded by the gateway</strong> once a charge has settled;
            this is a gateway policy, not a Cuetronix policy.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: "chargebacks",
    title: "Chargebacks & disputes",
    content: (
      <>
        <ul>
          <li>
            If a guest files a chargeback against your venue for a booking, we will
            surface the dispute in <em>Payments &rarr; Disputes</em> and attach all
            the evidence we hold (booking logs, QR check-in, session timers, CCTV
            reference codes if uploaded).
          </li>
          <li>
            If a Cuetronix subscription charge is disputed, we first try to resolve
            it over email. If the dispute proceeds, we will engage the gateway with
            the signed order form and billing history.
          </li>
          <li>
            Chargebacks that are ruled <strong>fraudulent</strong> (stolen card, no
            authorisation) are always respected and refunded by the gateway.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: "timelines",
    title: "Refund timelines",
    content: (
      <>
        <ul>
          <li>
            <strong>Credit / debit card:</strong> 5&ndash;10 business days to show
            on the card statement.
          </li>
          <li>
            <strong>UPI:</strong> typically within 24&ndash;48 hours.
          </li>
          <li>
            <strong>Net banking:</strong> 3&ndash;7 business days.
          </li>
          <li>
            <strong>International cards:</strong> up to 14 business days depending
            on issuing bank.
          </li>
        </ul>
        <p>
          These timelines are set by the underlying bank and gateway. We process
          the refund at our end within <strong>one business day</strong> of
          approval.
        </p>
      </>
    ),
  },
  {
    id: "how-to-request",
    title: "How to request a refund",
    content: (
      <>
        <ol>
          <li>
            Cancel your subscription from <em>Settings &rarr; Billing</em> if you
            haven&apos;t already.
          </li>
          <li>
            Email <a href="mailto:billing@cuetronix.com">billing@cuetronix.com</a>{" "}
            from the owner address on the workspace, with your workspace slug and
            the invoice number.
          </li>
          <li>
            Our billing team acknowledges within one business day and approves
            eligible refunds within five business days.
          </li>
          <li>
            You will receive a credit note for GST purposes and an email
            confirmation once the gateway issues the refund.
          </li>
        </ol>
      </>
    ),
  },
  {
    id: "non-refundable",
    title: "Items that are not refundable",
    content: (
      <>
        <ul>
          <li>one-time onboarding or migration fees once the work has been performed;</li>
          <li>custom integration or development work already billed and delivered;</li>
          <li>third-party SMS, WhatsApp, or email credits that have already been consumed;</li>
          <li>yearly plans past the 30-day money-back window;</li>
          <li>monthly fees for a period in which the workspace was actively used.</li>
        </ul>
      </>
    ),
  },
  {
    id: "updates",
    title: "Changes to this policy",
    content: (
      <>
        <p>
          We may update this Refund &amp; Cancellation Policy from time to time.
          Material changes will be notified by email and by an in-app banner at
          least 30 days in advance. The effective date at the top of this page
          always reflects the current version.
        </p>
      </>
    ),
  },
  {
    id: "contact",
    title: "Contact billing",
    content: (
      <>
        <ul>
          <li>
            Billing: <a href="mailto:billing@cuetronix.com">billing@cuetronix.com</a>
          </li>
          <li>
            Support: <a href="mailto:support@cuetronix.com">support@cuetronix.com</a>
          </li>
          <li>
            Postal address: Cuephoria Tech, Tiruchirappalli, Tamil Nadu, India
          </li>
        </ul>
      </>
    ),
  },
];

const RefundPolicy: React.FC = () => {
  return (
    <LegalLayout
      eyebrow="Refunds & cancellations"
      title="Refund & Cancellation Policy"
      lead={
        <>
          Cancel any time in one click, 14-day free trial, 30-day money-back on
          your first yearly invoice, and a clear playbook for refunds on the
          end-customer payments that pass through your venue&apos;s portal.
        </>
      }
      lastUpdated="22 April 2026"
      effectiveFrom="22 April 2026"
      sections={SECTIONS}
      contactEmail="billing@cuetronix.com"
    />
  );
};

export default RefundPolicy;
