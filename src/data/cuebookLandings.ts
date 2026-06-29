import type { CompetitorLandingPage } from "@/data/competitorLandingTypes";

const VS = "/vs/cuebook";

/** Cuetronix-only stack — repeated honestly across landings. */
const HR_BOOKING =
  "Cuetronix is the only all-in-one gaming venue OS that combines corporate-level staff HRMS (payroll, payslips, biometric attendance, leave & overtime) with a dedicated branded online booking portal and Razorpay webhook verification — not just counter billing.";

export const cuebookLandings: CompetitorLandingPage[] = [
  {
    path: "/cuebook-alternative",
    competitorSlug: "cuebook",
    metaTitle: "Best CueBook Alternative (2026) — All-in-One Gaming Venue OS | Cuetronix",
    metaDescription:
      "Top CueBook alternative for pool and snooker halls. Cuetronix adds corporate HRMS, Razorpay booking portal, PS5/PC/turf — not just table timers and khata.",
    keywords: ["CueBook alternative", "CueBook replacement", "better than CueBook", "cuebook.in alternative"],
    badge: "CueBook alternative",
    headline: "Best CueBook alternative: billing is step one. Cuetronix runs the whole venue.",
    deck: `CueBook (cuebook.in) is a solid pool-hall counter tool — live tables, per-minute billing, khata, and snack tabs. It stops there. ${HR_BOOKING} CueBook has no payroll-grade HR and no venue-branded Razorpay booking flow. If you run or plan a gaming lounge — not just billiards — Cuetronix is the upgrade.`,
    sections: [
      {
        title: "What Cuetronix adds beyond CueBook",
        bullets: [
          "Corporate HRMS: attendance, shifts, payroll runs, payslips — in-product on Pro.",
          "Dedicated booking portal on your sub-domain with Razorpay UPI/cards and webhook-safe prepay.",
          "Multi-vertical: snooker + PS5/Xbox + PC + turf + courts + cafe on one ledger.",
          "Tournaments, loyalty, memberships, branch P&L — not just table + khata.",
          "Published ₹999–₹3,999 plans and 14-day trial — no quote chase.",
        ],
      },
      {
        title: "Where CueBook stops",
        bullets: [
          "Browser POS for pool/snooker — no gaming-cafe station engine.",
          "Staff shifts not corporate payroll HRMS.",
          "No branded customer booking site with Razorpay integration described on cuebook.in.",
          "Snack bar on tab — not full venue operating system.",
        ],
      },
    ],
    faqs: [
      {
        q: "What is the best CueBook alternative for Indian pool halls?",
        a: "Cuetronix — if you need more than timers and khata. You keep snooker/pool billing and gain Razorpay booking, corporate staff HRMS, and expansion into console/PC/turf without a second app.",
      },
      {
        q: "Does CueBook have payroll and online booking like Cuetronix?",
        a: "CueBook focuses on floor billing, khata, and snack tabs. It does not market corporate payroll HRMS or a dedicated Razorpay-powered booking portal — both are core Cuetronix modules.",
      },
    ],
    relatedPaths: ["/cuebook-review", "/cuebook-vs-cuetronix", "/is-cuebook-worth-it", VS],
    sitemapPriority: 0.96,
  },
  {
    path: "/cuebook-review",
    competitorSlug: "cuebook",
    metaTitle: "CueBook Review (2026) — Honest Take for Pool & Snooker Hall Owners",
    metaDescription:
      "CueBook review: good table billing and khata, but no corporate HRMS or Razorpay booking portal. See how Cuetronix compares as an all-in-one gaming venue OS.",
    keywords: ["CueBook review", "cuebook.in review", "CueBook app review", "CueBook honest review"],
    badge: "Review",
    headline: "CueBook review: great counter software — not a full venue OS.",
    deck: `CueBook markets itself as the #1 billiard and snooker hall system on cuebook.in. For a single-location pool hall that only needs timers, split payments, and khata, it can fit. ${HR_BOOKING} No competitor in this tier ships that combination.`,
    sections: [
      {
        title: "CueBook review summary",
        bullets: [
          "Strengths: live table board, pause/resume billing, khata, multi-branch, responsive browser UI.",
          "Gaps: no corporate payroll HRMS, no dedicated Razorpay booking portal, snooker/pool-only scope.",
          "Growth ceiling: gaming cafes adding consoles, turf, or online prepay need another platform.",
        ],
      },
    ],
    faqs: [
      {
        q: "Is CueBook worth it for a small pool hall?",
        a: "Maybe for timer + khata only. If you will add online booking deposits, staff payroll, or console stations within 12 months, start on Cuetronix to avoid a painful migration.",
      },
      {
        q: "How does CueBook compare to Cuetronix on HR?",
        a: "CueBook does not offer corporate-level HRMS — payroll cycles, payslips, biometric attendance, and leave workflows. Cuetronix Pro includes these; CueBook operators typically run HR in spreadsheets or a separate tool.",
      },
    ],
    relatedPaths: ["/cuebook-alternative", "/why-not-cuebook", VS],
    sitemapPriority: 0.95,
  },
  {
    path: "/cuebook-vs-cuetronix",
    competitorSlug: "cuebook",
    metaTitle: "CueBook vs Cuetronix (2026) — Pool Hall POS vs All-in-One Gaming OS",
    metaDescription:
      "CueBook vs Cuetronix: table billing vs full gaming venue OS with corporate HRMS, Razorpay booking portal, and multi-vertical stations. Honest India-focused comparison.",
    keywords: ["CueBook vs Cuetronix", "Cuetronix vs CueBook", "CueBook comparison"],
    badge: "Comparison",
    headline: "CueBook vs Cuetronix — counter tool vs corporate venue OS.",
    deck: `CueBook vs Cuetronix is not a fair fight on features — it is a scope question. CueBook does pool-hall billing well. Cuetronix is the all-in-one gaming and sports venue operating system: snooker timers plus Razorpay booking, corporate HRMS, loyalty, tournaments, and PS5/PC/turf engines. ${HR_BOOKING}`,
    sections: [
      {
        title: "CueBook vs Cuetronix at a glance",
        bullets: [
          "Table billing: both YES — CueBook pool-focused; Cuetronix multi-vertical.",
          "Khata / credit: both YES.",
          "Corporate HRMS (payroll, payslips): Cuetronix YES · CueBook NO.",
          "Branded online booking + Razorpay webhooks: Cuetronix YES · CueBook not offered.",
          "Gaming cafe (PC/PS5) stations: Cuetronix YES · CueBook NO.",
          "Published pricing + 14-day trial: Cuetronix YES · CueBook trial only.",
        ],
      },
    ],
    faqs: [
      {
        q: "Who wins CueBook vs Cuetronix?",
        a: "CueBook for a pool-only hall that will never need HR, online prepay booking, or consoles. Cuetronix for every operator building a modern gaming venue or multi-activity club.",
      },
    ],
    relatedPaths: ["/cuebook-alternative", "/cuebook-review", VS],
    sitemapPriority: 0.97,
  },
  {
    path: "/is-cuebook-worth-it",
    competitorSlug: "cuebook",
    metaTitle: "Is CueBook Worth It? (2026) — When to Choose Cuetronix Instead",
    metaDescription:
      "Is CueBook worth it? For timer-only pool halls, maybe. For venues needing HRMS and Razorpay booking, Cuetronix is the only all-in-one gaming OS that fits.",
    keywords: ["is CueBook worth it", "CueBook worth it", "should I use CueBook"],
    badge: "Verdict",
    headline: "Is CueBook worth it? Only if you will never outgrow pool-hall billing.",
    deck: `CueBook is worth evaluating for a narrow use case: per-minute pool/snooker billing, khata, and snack tabs in the browser. It is not worth it as your long-term platform if you need corporate staff HRMS or a dedicated Razorpay booking portal — because CueBook does not ship them. ${HR_BOOKING}`,
    sections: [
      {
        title: "Choose Cuetronix over CueBook when you need",
        bullets: [
          "Payroll-grade HR — not just 'staff on the floor'.",
          "Customers booking and prepaying online on your brand.",
          "PS5, PC, turf, or courts alongside pool tables.",
          "One login for owner, accountant, and floor staff.",
        ],
      },
    ],
    faqs: [
      {
        q: "Is CueBook enough for a gaming cafe with pool tables?",
        a: "No. CueBook is billiards-first. Console and PC session engines, combined cafe+station tickets, and corporate HRMS live in Cuetronix — not CueBook.",
      },
    ],
    relatedPaths: ["/cuebook-alternative", "/cuebook-vs-cuetronix", VS],
    sitemapPriority: 0.95,
  },
  {
    path: "/why-not-cuebook",
    competitorSlug: "cuebook",
    metaTitle: "Why Not CueBook? 6 Reasons Clubs Pick Cuetronix (2026)",
    metaDescription:
      "Why not CueBook? No corporate HRMS, no Razorpay booking portal, pool-only scope. Why gaming venues choose Cuetronix as the all-in-one OS.",
    keywords: ["why not CueBook", "CueBook problems", "CueBook limitations"],
    badge: "Operator guide",
    headline: "Why not CueBook? Six ceilings pool-hall software hits.",
    deck: `CueBook is popular on cuebook.in for a reason — simple table ops. Operators leave when they hit these walls: no corporate HRMS, no branded Razorpay booking, no console/PC/turf, and tool sprawl. Cuetronix removes all six in one gaming venue OS.`,
    sections: [
      {
        title: "Why not CueBook",
        bullets: [
          "1. No corporate payroll HRMS — attendance without payslips is not HR.",
          "2. No dedicated online booking portal with Razorpay webhook verification.",
          "3. Pool/snooker only — gaming lounges outgrow it fast.",
          "4. No tournaments, loyalty, or membership depth.",
          "5. Multi-branch reporting without full venue OS analytics.",
          "6. You will re-platform anyway — start on Cuetronix.",
        ],
      },
    ],
    faqs: [
      {
        q: "Can I use CueBook and Cuetronix together?",
        a: "Unnecessary. Cuetronix includes CueBook-class table billing plus HRMS and booking. Running both doubles reconciliation work.",
      },
    ],
    relatedPaths: ["/cuebook-alternative", "/cuebook-review", VS],
    sitemapPriority: 0.94,
  },
];
