import LegalLayout, { type LegalSection } from "@/components/legal/LegalLayout";

type CookieRow = {
  name: string;
  category: "Essential" | "Functional" | "Analytics";
  purpose: string;
  retention: string;
};

const COOKIES: CookieRow[] = [
  {
    name: "cuetronix_session",
    category: "Essential",
    purpose:
      "Signed JWT session cookie, HttpOnly + Secure + SameSite=Lax, used to keep you logged in and to enforce tenant isolation.",
    retention: "24 hours (sliding)",
  },
  {
    name: "cuetronix_csrf",
    category: "Essential",
    purpose:
      "Double-submit CSRF token for state-changing requests. HttpOnly, Secure.",
    retention: "Session",
  },
  {
    name: "cuetronix_ws_slug",
    category: "Functional",
    purpose:
      "Remembers the last workspace you signed into so the login form can auto-suggest it next time.",
    retention: "30 days",
  },
  {
    name: "cuetronix_theme",
    category: "Functional",
    purpose:
      "Remembers your UI preferences (side-bar state, density, locale, currency).",
    retention: "180 days",
  },
  {
    name: "cuetronix_reduced_motion",
    category: "Functional",
    purpose:
      "Mirrors your OS-level reduced-motion setting so animations on the marketing site remain toned down.",
    retention: "Session",
  },
  {
    name: "plausible_session / ph_*",
    category: "Analytics",
    purpose:
      "Cookieless / first-party analytics (Plausible and PostHog EU). IP address is anonymised, no cross-site tracking.",
    retention: "Up to 30 days",
  },
];

const SECTIONS: LegalSection[] = [
  {
    id: "what-are-cookies",
    title: "What is a cookie (and why should you care)?",
    content: (
      <>
        <p>
          A cookie is a small text file that a website stores in your browser so it
          can remember you on your next visit — for example, so you don&apos;t have
          to log back in every page load. Cookies can also be used for analytics
          and advertising, but Cuetronix does not run third-party advertising
          trackers.
        </p>
        <p>
          This Cookie Policy explains what cookies and similar technologies
          Cuetronix uses, why we use them, and how you can control them. It is part
          of our <a href="/privacy">Privacy Policy</a>.
        </p>
      </>
    ),
  },
  {
    id: "categories",
    title: "How we categorise cookies",
    content: (
      <>
        <ul>
          <li>
            <strong>Essential</strong> cookies are required for the Platform to
            work — authentication, session, CSRF protection. You cannot opt out of
            essential cookies and still use the Platform; disabling them will log
            you out.
          </li>
          <li>
            <strong>Functional</strong> cookies remember your preferences — theme,
            default workspace, locale. They are not shared with third parties.
          </li>
          <li>
            <strong>Analytics</strong> cookies help us understand aggregate product
            usage so we can prioritise bug fixes and new features. We use privacy-
            friendly analytics (Plausible and PostHog EU) that do not track you
            across sites, do not create advertising profiles, and anonymise IPs.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: "cookies-table",
    title: "Cookies we set",
    content: (
      <>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[13px]">
            <thead>
              <tr className="border-b border-white/10 text-white">
                <th className="py-2 pr-3 font-semibold">Name</th>
                <th className="py-2 pr-3 font-semibold">Category</th>
                <th className="py-2 pr-3 font-semibold">Purpose</th>
                <th className="py-2 font-semibold">Retention</th>
              </tr>
            </thead>
            <tbody className="text-zinc-300">
              {COOKIES.map((c) => (
                <tr key={c.name} className="border-b border-white/5 align-top">
                  <td className="py-2.5 pr-3 font-mono text-[12px] text-violet-200">
                    {c.name}
                  </td>
                  <td className="py-2.5 pr-3">
                    <span
                      className={[
                        "inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
                        c.category === "Essential"
                          ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-200"
                          : c.category === "Functional"
                          ? "border-violet-400/30 bg-violet-500/10 text-violet-200"
                          : "border-sky-400/30 bg-sky-500/10 text-sky-200",
                      ].join(" ")}
                    >
                      {c.category}
                    </span>
                  </td>
                  <td className="py-2.5 pr-3">{c.purpose}</td>
                  <td className="py-2.5 text-zinc-400">{c.retention}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p>
          We do <strong>not</strong> set Google Ads, Facebook Pixel, TikTok, or any
          other third-party advertising cookies on cuetronix.com or inside the
          Platform.
        </p>
      </>
    ),
  },
  {
    id: "third-party",
    title: "Third-party services",
    content: (
      <>
        <p>
          Some Cuetronix features rely on third-party services that may set their
          own cookies only when the feature is used:
        </p>
        <ul>
          <li>
            <strong>Razorpay / Stripe checkout</strong> — during a payment, the
            gateway sets fraud-detection cookies on its own domain.
          </li>
          <li>
            <strong>Calendly / Cal.com</strong> — if you book a demo call, our
            scheduling widget may set a session cookie scoped to its domain.
          </li>
          <li>
            <strong>YouTube / Vimeo embeds</strong> — product tour videos on the
            marketing site are served in privacy-enhanced (<code>nocookie</code>)
            mode wherever possible.
          </li>
          <li>
            <strong>Google Sign-in</strong> — Google sets a session cookie on
            google.com when you choose to sign in with Google.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: "consent",
    title: "Consent & control",
    content: (
      <>
        <p>
          On your first visit to our marketing site, you will see a minimal cookie
          banner. Essential cookies load immediately (we cannot ask for consent
          without them), functional and analytics cookies only load after you
          accept.
        </p>
        <p>
          You can withdraw consent at any time by clearing cookies in your browser
          settings, or by clicking <em>&ldquo;Cookie settings&rdquo;</em> in the
          footer of cuetronix.com. You can also use your browser&apos;s private /
          incognito mode to browse without persistent cookies.
        </p>
        <p>
          Blocking essential cookies will prevent you from logging in to the
          Platform.
        </p>
      </>
    ),
  },
  {
    id: "do-not-track",
    title: "\u201cDo Not Track\u201d & Global Privacy Control",
    content: (
      <>
        <p>
          We honour the Global Privacy Control (GPC) signal. If your browser sends
          GPC, we treat it as an opt-out for analytics cookies and for any future
          sale of personal information (we do not sell data today either).
        </p>
      </>
    ),
  },
  {
    id: "changes",
    title: "Changes to this policy",
    content: (
      <>
        <p>
          We may update this Cookie Policy as we add or remove features. Material
          changes are notified by email and by an in-app banner. The table above is
          always the source of truth for what cookies are in use right now.
        </p>
      </>
    ),
  },
  {
    id: "contact",
    title: "Contact",
    content: (
      <>
        <p>
          Questions about cookies? Email{" "}
          <a href="mailto:privacy@cuetronix.com">privacy@cuetronix.com</a>.
        </p>
      </>
    ),
  },
];

const CookiePolicy: React.FC = () => {
  return (
    <LegalLayout
      eyebrow="Cookies & tracking"
      title="Cookie Policy"
      lead={
        <>
          Cuetronix uses the minimum cookies necessary to keep you signed in, to
          remember your workspace and to understand aggregate product usage. We do
          not run advertising trackers.
        </>
      }
      lastUpdated="22 April 2026"
      effectiveFrom="22 April 2026"
      sections={SECTIONS}
      contactEmail="privacy@cuetronix.com"
    />
  );
};

export default CookiePolicy;
