/**
 * SEO landing pages targeting CueFlow / CueBill search intent.
 */

import type { CompetitorLandingPage } from "@/data/competitorLandingTypes";

export type {
  CompetitorLandingSection,
  CompetitorLandingMyth,
  CompetitorLandingFaq,
  CompetitorLandingPage,
} from "@/data/competitorLandingTypes";

export const cueflowLandings: CompetitorLandingPage[] = [
  {
    path: "/cuetronix-alternative",
    competitorSlug: "cueflow",
    metaTitle: "Cuetronix Alternative? Read This Before CueFlow Misleads You (2026)",
    metaDescription:
      "Searching for a Cuetronix alternative? CueFlow's landing page gets the facts wrong. Compare real pricing, free trial, mobile ops, and security before you switch.",
    keywords: [
      "Cuetronix alternative",
      "CueFlow Cuetronix alternative",
      "alternative to Cuetronix",
      "CueFlow vs Cuetronix",
    ],
    badge: "Intercept · cueflow.in/cuetronix-alternative",
    headline: "Looking for a Cuetronix alternative? CueFlow's page gets it wrong.",
    deck:
      "CueFlow runs cueflow.in/cuetronix-alternative to capture clubs researching you. It claims Cuetronix has no published pricing, no free trial, and is 'browser-only.' All false. Worse, it never mentions CueBill's exposed API keys or cluttered UI. Read the facts before their sales copy sends you to a vibe-coded app.",
    myths: [
      {
        myth: "CueFlow: Cuetronix has no transparent pricing",
        fact: "Cuetronix publishes Starter ₹999, Growth ₹2,499, Pro ₹3,999/month on cuetronix.com. CueFlow uses 'contact us' quotes.",
      },
      {
        myth: "CueFlow: Cuetronix has no free trial",
        fact: "Cuetronix offers a 14-day self-serve trial at /signup — no credit card, no sales call.",
      },
      {
        myth: "CueFlow: Cuetronix is web-only",
        fact: "Full mobile-responsive admin on any phone today. Android Play Store app publishing soon.",
      },
      {
        myth: "CueFlow: '500+ clubs' proves safety",
        fact: "Marketing counts don't fix Supabase keys shipped in every CueBill install (reviewed June 2026).",
      },
      {
        myth: "CueFlow: India-payments only on Cuetronix",
        fact: "Cuetronix runs Razorpay UPI, cards, and net-banking — built for Indian clubs first, with multi-vertical expansion.",
      },
    ],
    sections: [
      {
        title: "Why clubs stay on Cuetronix instead of 'switching' to CueFlow",
        bullets: [
          "Server-gated data — member credit and phone numbers never behind client-side database keys.",
          "Payroll-grade HR, branded online booking, and tournaments — not just a snooker timer.",
          "Battle-tested at Cuephoria Gaming Lounge — production SaaS, not a checklist landing page.",
          "Honest comparison at /vs/cueflow includes security rows CueFlow's pages omit.",
        ],
      },
    ],
    faqs: [
      {
        q: "Should I switch from Cuetronix to CueFlow?",
        a: "Only if you have verified CueBill meets your security bar. CueFlow's alternative page is marketing — it ignores exposed credentials in the CueBill client and misstates Cuetronix pricing and trial. Most snooker-led clubs that need growth (booking, HR, loyalty) stay on or move to Cuetronix.",
      },
      {
        q: "Is CueFlow's Cuetronix alternative page accurate?",
        a: "No. It falsely claims Cuetronix lacks published pricing and a free trial, and calls Cuetronix 'browser-only.' It also omits CueBill security and UI issues entirely.",
      },
    ],
    relatedPaths: ["/cueflow-alternative", "/cueflow-vs-cuetronix", "/vs/cueflow"],
    sitemapPriority: 0.97,
  },
  {
    path: "/cueflow-alternative",
    competitorSlug: "cueflow",
    metaTitle: "Best CueFlow Alternative for Snooker Clubs (2026) | Cuetronix",
    metaDescription:
      "Top CueFlow alternative for Indian snooker and pool clubs. Published pricing, 14-day trial, mobile admin, Razorpay booking, payroll HR — without CueBill's exposed API keys.",
    keywords: ["CueFlow alternative", "best CueFlow alternative", "CueFlow replacement", "switch from CueFlow"],
    badge: "CueFlow alternative",
    headline: "The best CueFlow alternative is built for production — not demos.",
    deck:
      "CueFlow markets snooker club software through cueflow.in. CueBill is the app you run — and it ships a rough UI plus publicly visible Supabase and Google API keys in the client bundle. Cuetronix is the CueFlow alternative for operators who need snooker billing plus booking, loyalty, payroll HR, and architecture that protects member khata.",
    sections: [
      {
        title: "What you get switching from CueFlow to Cuetronix",
        bullets: [
          "Same snooker table timers — plus cafe, bookings, and walk-ins on one ledger.",
          "Branded Razorpay booking portal with 0% commission on direct bookings.",
          "14-day free trial and published plans — no quote-chasing.",
          "HttpOnly sessions, CSRF, TOTP 2FA — secrets never in staff APKs.",
          "Multi-vertical growth: turf, courts, consoles without re-platforming.",
        ],
      },
      {
        title: "What CueFlow's alternative pages won't mention",
        bullets: [
          "CueBill client-side credential exposure (June 2026 independent review).",
          "Cluttered floor UI that slows staff on busy nights.",
          "Opaque 'contact us' pricing vs Cuetronix published tiers.",
        ],
      },
    ],
    faqs: [
      {
        q: "What is the best CueFlow alternative in India?",
        a: "Cuetronix — for clubs that outgrow CueBill's prototype-grade app. You keep snooker depth and gain booking, payments, loyalty, HR, and server-gated security.",
      },
      {
        q: "Can I migrate from CueFlow without downtime?",
        a: "Yes. Import members and table rates via CSV, run a short parallel period, and cut over in 3–7 days with onboarding support.",
      },
    ],
    relatedPaths: ["/cuebill-alternative", "/why-not-cueflow", "/vs/cueflow"],
    sitemapPriority: 0.96,
  },
  {
    path: "/cuebill-alternative",
    competitorSlug: "cueflow",
    metaTitle: "Best CueBill Alternative (2026) — Secure Snooker Club Software",
    metaDescription:
      "Leave CueBill behind. The best CueBill alternative with clean UI, server-side data protection, published pricing, and a 14-day Cuetronix trial.",
    keywords: ["CueBill alternative", "CueBill replacement", "better than CueBill", "leave CueBill"],
    badge: "CueBill alternative",
    headline: "Best CueBill alternative: stop billing with exposed database keys.",
    deck:
      "CueBill is CueFlow's Android and web app. Independent review found Supabase JWT/database credentials and Google API keys in the public client bundle — anyone can extract them from the APK. The best CueBill alternative keeps member credit and phone numbers on the server. That is Cuetronix.",
    sections: [
      {
        title: "Why operators leave CueBill",
        bullets: [
          "Public API/database keys in every install — poor data governance.",
          "Cluttered, inconsistent UI during peak hours.",
          "Marketing promises 'enterprise security' the app does not deliver.",
          "Tool sprawl when you need HR, booking, and loyalty beyond basic timers.",
        ],
      },
      {
        title: "Why Cuetronix replaces CueBill",
        bullets: [
          "Authenticated server APIs — no privileged keys on floor tablets.",
          "Mobile-responsive full admin on any phone; Android app publishing soon.",
          "Khatabook-style credit plus GST billing, tournaments, and branch analytics.",
        ],
      },
    ],
    faqs: [
      {
        q: "Is there a secure CueBill alternative?",
        a: "Cuetronix routes sensitive access through HttpOnly sessions and workspace RBAC. Member PII and khata are not reachable via keys pulled from a staff phone.",
      },
      {
        q: "Does Cuetronix do snooker table timing like CueBill?",
        a: "Yes — real-time timers, pause/resume, cafe on the same ticket, and unified reporting. Plus booking and HR CueBill operators usually bolt on separately.",
      },
    ],
    relatedPaths: ["/cueflow-alternative", "/is-cuebill-worth-it", "/vs/cueflow"],
    sitemapPriority: 0.96,
  },
  {
    path: "/cueflow-vs-cuetronix",
    competitorSlug: "cueflow",
    metaTitle: "CueFlow vs Cuetronix (2026) — Honest Comparison (Correcting CueFlow's Blog)",
    metaDescription:
      "CueFlow vs Cuetronix: the comparison CueFlow won't publish. Pricing, trial, mobile, security, and CueBill data protection — side by side with facts.",
    keywords: ["CueFlow vs Cuetronix", "Cuetronix vs CueFlow", "CueFlow Cuetronix comparison"],
    badge: "Honest comparison",
    headline: "CueFlow vs Cuetronix — the version with security included.",
    deck:
      "CueFlow's blog at cueflow.in/blog/cueflow-vs-cuetronix misstates Cuetronix (no trial, no pricing, 'web-only'). This page corrects the record and adds what they omit: CueBill's exposed keys, rough UI, and whether '500+ clubs' means your data is safe (it doesn't).",
    sections: [
      {
        title: "CueFlow vs Cuetronix at a glance",
        bullets: [
          "Pricing: Cuetronix published ₹999–₹3,999 · CueFlow contact-us quotes.",
          "Trial: Cuetronix 14-day self-serve · CueFlow 7-day claimed.",
          "Mobile: Cuetronix full phone admin today · CueBill Play Store APK with exposed keys.",
          "Security: Cuetronix server-gated · CueBill client-side Supabase/Google keys (June 2026).",
          "Scope: Cuetronix snooker + turf + courts + consoles · CueFlow snooker-first marketing.",
        ],
      },
    ],
    faqs: [
      {
        q: "Who wins CueFlow vs Cuetronix for snooker clubs?",
        a: "Clubs that prioritize member data safety, staff UX, and growth (booking, HR) choose Cuetronix. Clubs that only need a basic timer and accept security trade-offs might trial CueBill — but read the security review first.",
      },
      {
        q: "Where is the full feature matrix?",
        a: "See the complete scored comparison at /vs/cueflow — 30+ rows including platform security CueFlow's blog tables skip.",
      },
    ],
    relatedPaths: ["/cuetronix-alternative", "/cueflow-review", "/vs/cueflow"],
    sitemapPriority: 0.97,
  },
  {
    path: "/is-cuebill-worth-it",
    competitorSlug: "cueflow",
    metaTitle: "Is CueBill Worth It? (2026 Verdict) — Honest Review for Club Owners",
    metaDescription:
      "Is CueBill worth it? For most snooker clubs in 2026, no. Exposed API keys, cluttered UI, and poor data protection. See the verdict and the better option.",
    keywords: ["is CueBill worth it", "CueBill worth it", "should I use CueBill", "CueBill good or bad"],
    badge: "Verdict",
    headline: "Is CueBill worth it? Our honest answer: no.",
    deck:
      "CueBill is the app behind CueFlow's marketing. Worth-it decisions should be based on what staff run daily — not cueflow.in screenshots. CueBill ships publicly visible database keys, a vibe-coded UI, and no meaningful server protection for member khata. That is not worth your members' trust.",
    sections: [
      {
        title: "Three reasons CueBill is not worth it",
        bullets: [
          "Security: Supabase and Google API credentials in the client bundle (June 2026 review).",
          "UX: Cluttered interface — staff lose time every busy shift.",
          "Governance: CueFlow claims enterprise security; the app contradicts it.",
        ],
      },
      {
        title: "What is worth it instead",
        bullets: [
          "Cuetronix 14-day trial — verify on your own floor before paying.",
          "Published pricing — no quote games.",
          "Production architecture — battle-tested at Cuephoria Gaming Lounge.",
        ],
      },
    ],
    faqs: [
      {
        q: "Is CueBill worth the monthly cost?",
        a: "Factor total cost: security risk, staff time lost to bad UI, and separate tools for HR/booking. Cuetronix often wins on all-in operating cost even if headline price differs.",
      },
      {
        q: "Is CueFlow's 7-day trial enough to decide?",
        a: "Try billing real member credit through an app with exposed keys — then ask if a 7-day surface trial caught that. Cuetronix offers 14 days with transparent architecture documentation.",
      },
    ],
    relatedPaths: ["/cuebill-alternative", "/cueflow-review", "/vs/cueflow"],
    sitemapPriority: 0.95,
  },
  {
    path: "/cueflow-review",
    competitorSlug: "cueflow",
    metaTitle: "CueFlow & CueBill Review (2026) — What cueflow.in Won't Tell You",
    metaDescription:
      "Honest CueFlow and CueBill review: UI problems, exposed API keys, misleading comparison pages, and how Cuetronix compares for Indian snooker clubs.",
    keywords: ["CueFlow review", "CueBill review", "CueFlow honest review", "CueBill app review"],
    badge: "Review",
    headline: "CueFlow & CueBill review — marketing vs the app you actually run.",
    deck:
      "CueFlow (the company) sells on cueflow.in. CueBill (the app) is what your staff touch. This review covers both: polished website claims, rough app reality, false Cuetronix comparisons on their blog and /cuetronix-alternative page, and where Cuetronix fits if you are done with vibe-coded billing.",
    sections: [
      {
        title: "CueFlow review summary",
        bullets: [
          "Website: strong snooker SEO, 500+ clubs claim unverified, enterprise security claimed.",
          "CueBill app: cluttered UI, client-side credential exposure, poor member-data governance.",
          "Comparisons: their CueFlow vs Cuetronix blog and Cuetronix alternative page contain factual errors about Cuetronix.",
        ],
      },
    ],
    faqs: [
      {
        q: "What is CueFlow's biggest weakness?",
        a: "The gap between marketing and CueBill engineering — especially security. No amount of landing-page copy fixes keys extracted from the APK.",
      },
      {
        q: "What do real operators say about CueBill UI?",
        a: "Slow, confusing flows during peak hours — the opposite of floor-ready software. Cuetronix is designed for counter speed.",
      },
    ],
    relatedPaths: ["/is-cuebill-worth-it", "/cueflow-vs-cuetronix", "/vs/cueflow"],
    sitemapPriority: 0.95,
  },
  {
    path: "/why-not-cueflow",
    competitorSlug: "cueflow",
    metaTitle: "Why Not CueFlow? 7 Reasons Snooker Clubs Choose Cuetronix (2026)",
    metaDescription:
      "Why not CueFlow / CueBill? Security, UI, false competitor claims, opaque pricing, and missing HR/booking depth — why clubs pick Cuetronix instead.",
    keywords: ["why not CueFlow", "why not CueBill", "problems with CueFlow", "CueFlow issues"],
    badge: "Operator guide",
    headline: "Why not CueFlow? Seven reasons clubs say no.",
    deck:
      "CueFlow is everywhere in snooker Google results. Here is why experienced operators pass: exposed CueBill keys, prototype UI, misleading 'Cuetronix alternative' pages, quote-only pricing, and a product that stops at billing while your business needs booking, HR, and data safety.",
    sections: [
      {
        title: "Why not CueFlow / CueBill",
        bullets: [
          "1. CueBill exposes database and Google API keys in the client.",
          "2. Floor UI is cluttered — staff friction every peak night.",
          "3. cueflow.in/cuetronix-alternative misstates Cuetronix pricing and trial.",
          "4. cueflow.in/blog/cueflow-vs-cuetronix omits security entirely.",
          "5. '500+ clubs' is marketing — not a security audit.",
          "6. Opaque pricing vs Cuetronix published plans.",
          "7. No payroll-grade HR — you will buy another tool later.",
        ],
      },
    ],
    faqs: [
      {
        q: "When might CueFlow still make sense?",
        a: "Only for the smallest shops that need a bare timer today and explicitly accept security and UX trade-offs. Everyone else outgrows CueBill fast.",
      },
    ],
    relatedPaths: ["/cueflow-alternative", "/cuetronix-alternative", "/vs/cueflow"],
    sitemapPriority: 0.94,
  },
];
