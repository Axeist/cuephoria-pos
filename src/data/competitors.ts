/**
 * Competitor comparison dataset.
 *
 * Each entry powers a `/vs/:slug` page at https://www.cuetronix.com/vs/<slug>
 * and is also surfaced in the `/compare` hub, the sitemap, llms.txt and
 * page-scoped JSON-LD.
 *
 * Tone rule: factual, respectful, operator-first. Never disparage — every
 * competitor is a legitimate tool; we just explain who Cuetronix serves
 * better. This is both ethical and protects us from defamation claims.
 */

export type FeatureCell = boolean | "partial" | string;

export interface CompetitorFeature {
  category: "Billing & POS" | "Online Booking" | "Payments" | "Operations" | "Staff & HR" | "Analytics" | "Platform";
  name: string;
  cuetronix: FeatureCell;
  competitor: FeatureCell;
  note?: string;
}

export interface CompetitorFaq {
  q: string;
  a: string;
}

export interface Competitor {
  slug: string;
  name: string;
  tagline: string;
  oneLiner: string;
  category: "Sports booking" | "Gaming centre" | "Esports cafe" | "Court booking" | "Venue booking" | "VR arcade" | "Generic POS";
  region: "India" | "Global" | "North America" | "Europe";
  hqCountry: string;
  foundedYear: number;
  website: string;
  // SEO
  metaTitle: string;
  metaDescription: string;
  keywords: string[];
  // Intro
  tldr: string;
  bestFor: string;
  cuetronixBestFor: string;
  // Comparison
  pricing: { cuetronix: string; competitor: string; note?: string };
  features: CompetitorFeature[];
  // Narrative
  whenToPickCuetronix: string[];
  whenToPickCompetitor: string[];
  // FAQ
  faqs: CompetitorFaq[];
  verdict: string;
}

// Shared "Cuetronix yes" cells so we don't repeat the full list per competitor.
const YES = true;
const NO = false;
const PARTIAL = "partial" as const;

/* ─────────────────────────────────────────────────────────────────────────
 *  1. PLAYO — India's #1 player-facing sports booking app.
 * ─────────────────────────────────────────────────────────────────────── */
const playo: Competitor = {
  slug: "playo",
  name: "Playo",
  tagline: "India's sports community & play-partner app.",
  oneLiner:
    "Playo is a player-facing marketplace where people discover nearby turfs, book slots, and find teammates. It is not operator software.",
  category: "Sports booking",
  region: "India",
  hqCountry: "India",
  foundedYear: 2015,
  website: "https://playo.co",
  metaTitle:
    "Cuetronix vs Playo — Venue OS vs Player Marketplace (2026 Comparison)",
  metaDescription:
    "Cuetronix vs Playo compared. Playo is a player-facing booking app; Cuetronix is the world's first all-in-one operator OS — POS + online booking with Razorpay + corporate-grade staff payroll & attendance — for turfs, snooker halls, gaming centres and more.",
  keywords: [
    "Cuetronix vs Playo",
    "Playo for operators",
    "Playo alternative for venue owners",
    "turf booking software vs Playo",
    "snooker booking software vs Playo",
  ],
  tldr:
    "Playo helps players find and pay for slots at your venue, but it does not run your venue. You still need a POS, a staff/payroll tool, inventory, tournament management, cafe billing and multi-branch reporting. Cuetronix is that operator-side OS — and it can sit happily alongside Playo for discovery.",
  bestFor:
    "Independent turfs and sports venues that want to appear in Playo's marketplace for discovery and accept player-side bookings through the Playo app.",
  cuetronixBestFor:
    "Venue owners who want to run their whole business — POS, cafe, memberships, staff payroll, attendance, tournaments and multi-branch reports — from one login, with a branded online booking portal on their own sub-domain.",
  pricing: {
    cuetronix: "From ₹1,999 / month — 14-day free trial",
    competitor:
      "Free for players. Venue listing commissions / subscription — varies by negotiation.",
    note: "Playo monetises via booking fees; Cuetronix is a flat SaaS subscription with 0% transaction fees.",
  },
  features: [
    { category: "Billing & POS", name: "Per-minute & per-frame table billing", cuetronix: YES, competitor: NO },
    { category: "Billing & POS", name: "Integrated cafe / F&B POS on same ticket", cuetronix: YES, competitor: NO },
    { category: "Billing & POS", name: "Split bills, combos, happy-hour pricing", cuetronix: YES, competitor: NO },
    { category: "Billing & POS", name: "GST-ready receipts & invoices", cuetronix: YES, competitor: PARTIAL },
    { category: "Online Booking", name: "Branded booking portal on your own sub-domain", cuetronix: YES, competitor: NO, note: "Playo bookings happen inside Playo's brand" },
    { category: "Online Booking", name: "Player-facing marketplace discovery", cuetronix: PARTIAL, competitor: YES, note: "Cuetronix is operator-focused; Playo's strength" },
    { category: "Online Booking", name: "Multi-court / multi-station slot grid", cuetronix: YES, competitor: YES },
    { category: "Payments", name: "Native Razorpay (UPI, cards, net-banking)", cuetronix: YES, competitor: PARTIAL },
    { category: "Payments", name: "Webhook-verified bookings (zero double-book)", cuetronix: YES, competitor: YES },
    { category: "Payments", name: "Refunds & partial captures from the same dashboard", cuetronix: YES, competitor: PARTIAL },
    { category: "Operations", name: "Snooker / 8-ball / billiards table engine", cuetronix: YES, competitor: NO },
    { category: "Operations", name: "PS5 / Xbox / PC / VR console engine", cuetronix: YES, competitor: NO },
    { category: "Operations", name: "Football turf / box-cricket slot engine", cuetronix: YES, competitor: PARTIAL },
    { category: "Operations", name: "Pickleball / padel / badminton court engine", cuetronix: YES, competitor: PARTIAL },
    { category: "Operations", name: "Tournament brackets, seeding & prize pools", cuetronix: YES, competitor: NO },
    { category: "Operations", name: "Inventory & pro-shop / cafe menu", cuetronix: YES, competitor: NO },
    { category: "Staff & HR", name: "Employee directory with roles & designations", cuetronix: YES, competitor: NO },
    { category: "Staff & HR", name: "Biometric / QR attendance", cuetronix: YES, competitor: NO },
    { category: "Staff & HR", name: "Automated payroll with overtime & deductions", cuetronix: YES, competitor: NO },
    { category: "Staff & HR", name: "Shift rostering across branches", cuetronix: YES, competitor: NO },
    { category: "Staff & HR", name: "Downloadable payslips for employees", cuetronix: YES, competitor: NO },
    { category: "Analytics", name: "Revenue, utilisation & P&L per branch", cuetronix: YES, competitor: PARTIAL },
    { category: "Analytics", name: "Customer-level spend & loyalty analytics", cuetronix: YES, competitor: PARTIAL },
    { category: "Platform", name: "Customer loyalty & prepaid wallet", cuetronix: YES, competitor: PARTIAL },
    { category: "Platform", name: "Multi-branch / multi-location operations", cuetronix: YES, competitor: YES },
    { category: "Platform", name: "Row-level security + TOTP 2FA", cuetronix: YES, competitor: PARTIAL },
    { category: "Platform", name: "Audit log for every sensitive action", cuetronix: YES, competitor: PARTIAL },
  ],
  whenToPickCuetronix: [
    "You want to run POS, booking, payments, cafe, loyalty and staff payroll from one login.",
    "You run snooker, 8-ball, PS5/Xbox, VR, or a mix — Playo doesn't billing those.",
    "You want a booking portal on your own sub-domain, not inside a third-party app.",
    "You want to pay 0% booking commission and keep the full customer relationship.",
    "You want corporate-grade staff attendance and automated payroll built-in.",
  ],
  whenToPickCompetitor: [
    "You are purely a football/cricket turf and your #1 channel is Playo's in-app discovery.",
    "You do not need a POS, cafe, staff payroll or tournament engine.",
    "You are comfortable paying per-booking commissions in exchange for player traffic.",
  ],
  faqs: [
    {
      q: "Is Cuetronix a replacement for Playo?",
      a: "Cuetronix replaces the operator-side tools you need to run a venue — POS, booking portal, payments, cafe, staff payroll, attendance, tournaments and reports. Playo is a player-side discovery app. Most venues use both: Cuetronix as the operating system, and Playo as a discovery channel that pushes bookings into Cuetronix.",
    },
    {
      q: "Can Cuetronix receive bookings from Playo?",
      a: "Yes. You can accept Playo bookings alongside your own Cuetronix portal and walk-in sales. Everything lands in the same calendar and POS, and reconciliation is straightforward.",
    },
    {
      q: "Which is cheaper — Playo or Cuetronix?",
      a: "They're different models. Playo typically takes booking-level commissions, so cost scales with your revenue. Cuetronix is a flat monthly SaaS fee from ₹1,999 — so once you cross a few dozen bookings a month, Cuetronix is almost always cheaper and you also unlock POS, payroll, cafe and reporting.",
    },
    {
      q: "Does Cuetronix work for non-turf venues like snooker or PS5 lounges?",
      a: "Yes. Cuetronix's station/court engine handles snooker tables, pool tables, PS5/Xbox consoles, PC rigs, VR pods, bowling lanes, turf slots and pickleball/padel/badminton/tennis courts from the same product.",
    },
  ],
  verdict:
    "Playo is the best way to get players to find your turf. Cuetronix is the best way to actually run the turf — and every other type of gaming or sports venue alongside it.",
};

/* ─────────────────────────────────────────────────────────────────────────
 *  2. HUDLE — India's sports booking aggregator (Playo's main rival).
 * ─────────────────────────────────────────────────────────────────────── */
const hudle: Competitor = {
  slug: "hudle",
  name: "Hudle",
  tagline: "Play more sports, more often.",
  oneLiner:
    "Hudle is a player-facing sports booking app focused on turfs, badminton and pickleball. Like Playo, it's a discovery marketplace — not operator software.",
  category: "Sports booking",
  region: "India",
  hqCountry: "India",
  foundedYear: 2015,
  website: "https://hudle.in",
  metaTitle: "Cuetronix vs Hudle — Venue OS vs Player Marketplace (2026)",
  metaDescription:
    "Cuetronix vs Hudle compared. Hudle is a player-facing booking marketplace; Cuetronix is the operator's all-in-one OS with POS, online booking, Razorpay and corporate-grade staff payroll & attendance for turfs, courts and gaming centres.",
  keywords: [
    "Cuetronix vs Hudle",
    "Hudle alternative for venue owners",
    "Hudle for operators",
    "turf booking software vs Hudle",
  ],
  tldr:
    "Hudle brings players through the door, Cuetronix runs the door — billing, cafe, loyalty, tournaments, staff attendance and payroll. The two sit side-by-side happily.",
  bestFor:
    "Turf and court venues that want to tap Hudle's player base for discovery and in-app booking.",
  cuetronixBestFor:
    "Venue owners who want a single operator OS for bookings, POS, cafe, loyalty, staff payroll and multi-branch reporting — with a branded booking portal that keeps customers inside their own brand.",
  pricing: {
    cuetronix: "From ₹1,999 / month — 14-day free trial, 0% commission",
    competitor: "Free for players; listing fees / booking commissions for venues (varies).",
  },
  features: [
    { category: "Billing & POS", name: "Per-slot & per-hour court billing", cuetronix: YES, competitor: PARTIAL },
    { category: "Billing & POS", name: "Per-minute / per-frame table billing", cuetronix: YES, competitor: NO },
    { category: "Billing & POS", name: "Integrated cafe / F&B POS on same ticket", cuetronix: YES, competitor: NO },
    { category: "Billing & POS", name: "Split bills, combos, happy-hour pricing", cuetronix: YES, competitor: NO },
    { category: "Online Booking", name: "Branded booking portal on your own sub-domain", cuetronix: YES, competitor: NO },
    { category: "Online Booking", name: "Player marketplace discovery", cuetronix: PARTIAL, competitor: YES },
    { category: "Online Booking", name: "Deposits, recurring passes & group bookings", cuetronix: YES, competitor: PARTIAL },
    { category: "Payments", name: "Native Razorpay (UPI, cards, net-banking)", cuetronix: YES, competitor: PARTIAL },
    { category: "Payments", name: "Webhook-verified bookings (zero double-book)", cuetronix: YES, competitor: YES },
    { category: "Operations", name: "Multi-sport engine (cue sports / turfs / courts / consoles)", cuetronix: YES, competitor: PARTIAL },
    { category: "Operations", name: "Tournament brackets & leagues", cuetronix: YES, competitor: PARTIAL },
    { category: "Operations", name: "Inventory, pro-shop & menu", cuetronix: YES, competitor: NO },
    { category: "Staff & HR", name: "Employee directory, roles & offer letters", cuetronix: YES, competitor: NO },
    { category: "Staff & HR", name: "Biometric / QR attendance + payroll", cuetronix: YES, competitor: NO },
    { category: "Staff & HR", name: "Shift rostering with multi-branch cost centres", cuetronix: YES, competitor: NO },
    { category: "Analytics", name: "Branch-level P&L, utilisation heatmaps", cuetronix: YES, competitor: PARTIAL },
    { category: "Platform", name: "0% booking commission on your own portal", cuetronix: YES, competitor: NO },
    { category: "Platform", name: "Row-level security, TOTP 2FA, audit log", cuetronix: YES, competitor: PARTIAL },
  ],
  whenToPickCuetronix: [
    "You want to own the customer relationship, not rent it from a marketplace.",
    "You run multi-sport venues (turf + cue sports + consoles + cafe).",
    "You need automated staff payroll and biometric attendance.",
    "You want a flat SaaS fee instead of per-booking commissions.",
  ],
  whenToPickCompetitor: [
    "Hudle is your primary customer-acquisition channel and you don't need a POS.",
    "You are a single-sport turf that doesn't need cafe, tournaments or payroll.",
  ],
  faqs: [
    {
      q: "Do I need to choose between Hudle and Cuetronix?",
      a: "No. Most Cuetronix customers keep their Hudle listing for discovery and use Cuetronix to actually operate the venue. Bookings from Hudle land in the Cuetronix calendar alongside direct and walk-in bookings.",
    },
    {
      q: "Can Cuetronix replace Hudle entirely?",
      a: "Cuetronix gives you everything you need to run the venue, including your own branded booking portal. Many venues eventually cut their dependence on aggregators as their Cuetronix portal grows direct traffic.",
    },
    {
      q: "Does Cuetronix handle pickleball and badminton courts?",
      a: "Yes — Cuetronix runs pickleball, padel, badminton, tennis and squash courts with hourly pricing, memberships, league brackets and coach allocation.",
    },
  ],
  verdict:
    "Keep Hudle for player acquisition, pick Cuetronix to actually run the venue and own the data.",
};

/* ─────────────────────────────────────────────────────────────────────────
 *  3. ggLeap — global esports cafe management software.
 * ─────────────────────────────────────────────────────────────────────── */
const ggLeap: Competitor = {
  slug: "ggleap",
  name: "ggLeap",
  tagline: "Cloud esports centre management, made by the community.",
  oneLiner:
    "ggLeap is a well-established PC esports cafe management tool — great for Windows-only LAN centres.",
  category: "Esports cafe",
  region: "Global",
  hqCountry: "USA",
  foundedYear: 2018,
  website: "https://ggleap.com",
  metaTitle: "Cuetronix vs ggLeap — All-in-One Gaming OS vs PC-Only Esports Cafe Tool",
  metaDescription:
    "Cuetronix vs ggLeap. ggLeap is a PC-centric esports cafe tool; Cuetronix is the world's first all-in-one venue OS — POS, online booking with Razorpay, cafe and corporate-grade staff payroll for PCs, consoles, VR, pool, snooker, turfs and more.",
  keywords: [
    "Cuetronix vs ggLeap",
    "ggLeap alternative",
    "gaming cafe software vs ggLeap",
    "esports cafe billing software",
  ],
  tldr:
    "ggLeap is a mature PC-centric esports cafe tool focused on Windows clients, game licensing and timer control. Cuetronix covers the entire venue — not just PCs — and adds booking, Razorpay, cafe, tournaments, staff payroll and attendance out of the box.",
  bestFor:
    "Pure PC esports cafes in North America or Europe where every station is a Windows rig and local game licensing is the core workflow.",
  cuetronixBestFor:
    "Gaming centres that run a mix of PCs, PS5/Xbox consoles, VR pods, pool/snooker tables and a cafe — and want one product that also handles online booking, payments, loyalty and staff payroll.",
  pricing: {
    cuetronix: "From ₹1,999 / month (~$24) — 14-day free trial",
    competitor: "Per-station / per-seat pricing — varies by tier.",
  },
  features: [
    { category: "Billing & POS", name: "Per-minute PC gaming timers", cuetronix: YES, competitor: YES },
    { category: "Billing & POS", name: "Console timers (PS5 / Xbox)", cuetronix: YES, competitor: PARTIAL },
    { category: "Billing & POS", name: "Pool / snooker / 8-ball table billing", cuetronix: YES, competitor: NO },
    { category: "Billing & POS", name: "VR headset timers + liability waivers", cuetronix: YES, competitor: NO },
    { category: "Billing & POS", name: "Integrated cafe / F&B POS", cuetronix: YES, competitor: PARTIAL },
    { category: "Online Booking", name: "Branded online booking portal", cuetronix: YES, competitor: PARTIAL },
    { category: "Online Booking", name: "Advance booking for consoles, courts, turfs, VR", cuetronix: YES, competitor: PARTIAL },
    { category: "Payments", name: "Native Razorpay integration (India)", cuetronix: YES, competitor: NO },
    { category: "Payments", name: "Stripe / card processors (global)", cuetronix: PARTIAL, competitor: YES },
    { category: "Operations", name: "PC client with launcher & game licensing", cuetronix: PARTIAL, competitor: YES, note: "ggLeap's core strength" },
    { category: "Operations", name: "Tournament brackets for any sport", cuetronix: YES, competitor: PARTIAL },
    { category: "Operations", name: "Multi-sport / multi-vertical support", cuetronix: YES, competitor: NO },
    { category: "Staff & HR", name: "Employee directory with roles", cuetronix: YES, competitor: NO },
    { category: "Staff & HR", name: "Biometric / QR attendance", cuetronix: YES, competitor: NO },
    { category: "Staff & HR", name: "Automated payroll with overtime & deductions", cuetronix: YES, competitor: NO },
    { category: "Staff & HR", name: "Shift rostering with multi-branch cost centres", cuetronix: YES, competitor: NO },
    { category: "Analytics", name: "Multi-branch revenue & P&L", cuetronix: YES, competitor: PARTIAL },
    { category: "Platform", name: "GST-ready receipts (India)", cuetronix: YES, competitor: NO },
    { category: "Platform", name: "Customer loyalty & prepaid wallet", cuetronix: YES, competitor: YES },
  ],
  whenToPickCuetronix: [
    "You have consoles, VR, pool/snooker tables or a cafe alongside PCs.",
    "You need online booking with Razorpay (or any non-US gateway).",
    "You want staff payroll and attendance as part of the product.",
    "You're in India, SEA, GCC or any GST-regulated market.",
  ],
  whenToPickCompetitor: [
    "You run a pure-PC esports cafe in the US/EU where client-side game launcher matters more than POS.",
    "You don't have consoles, cafe, VR or cue sports.",
  ],
  faqs: [
    {
      q: "Is Cuetronix a ggLeap alternative?",
      a: "Yes, for most hybrid gaming centres. Cuetronix covers PCs plus consoles, VR, pool/snooker, turfs and cafe from one product, and ships with booking, Razorpay, tournaments and staff payroll out of the box.",
    },
    {
      q: "Does Cuetronix have a PC launcher like ggLeap?",
      a: "Cuetronix focuses on the operator OS — billing, bookings, cafe, payroll — and supports PC timers at the POS layer. A dedicated per-PC client launcher (with curated game libraries) is on our roadmap. Pure-PC cafes that need client-side launcher control today may still prefer ggLeap.",
    },
    {
      q: "Which is cheaper?",
      a: "Cuetronix starts at ₹1,999 / month (~$24) as a flat fee for the whole venue. ggLeap's cost scales with your station count. For hybrid venues with 10+ stations and a cafe, Cuetronix is usually materially cheaper overall.",
    },
  ],
  verdict:
    "For pure PC esports cafes in the US/EU, ggLeap remains strong. For hybrid venues in India and APAC — and anyone who wants booking + payroll built in — Cuetronix wins.",
};

/* ─────────────────────────────────────────────────────────────────────────
 *  4. SENET — global esports / gaming centre management.
 * ─────────────────────────────────────────────────────────────────────── */
const senet: Competitor = {
  slug: "senet",
  name: "SENET",
  tagline: "Cloud-based esports centre automation platform.",
  oneLiner:
    "SENET is a full-stack esports centre management suite that leans heavily on PC-station automation and centre branding.",
  category: "Esports cafe",
  region: "Global",
  hqCountry: "Ukraine",
  foundedYear: 2017,
  website: "https://senet.cloud",
  metaTitle: "Cuetronix vs SENET — Multi-Vertical Venue OS vs Esports-Only Suite",
  metaDescription:
    "Cuetronix vs SENET. SENET focuses on PC esports centre automation; Cuetronix is the world's first all-in-one gaming, sports and entertainment venue OS — POS, booking, Razorpay, tournaments and corporate-grade staff payroll.",
  keywords: [
    "Cuetronix vs SENET",
    "SENET alternative",
    "esports centre software vs SENET",
    "gaming cafe management",
  ],
  tldr:
    "SENET is a strong PC-centric esports platform. Cuetronix covers PCs plus consoles, VR, pool/snooker, turfs, courts and cafe — and bundles Razorpay payments and corporate-grade staff payroll/attendance.",
  bestFor:
    "Dedicated PC esports centres in Europe and the Middle East that want deep client-side station automation.",
  cuetronixBestFor:
    "Multi-vertical venues that bill PCs, consoles, VR, cue sports tables, turfs, courts and a cafe together — and need online booking, payments and payroll in one product.",
  pricing: {
    cuetronix: "From ₹1,999 / month (~$24) flat",
    competitor: "Custom, typically per-station/per-centre.",
  },
  features: [
    { category: "Billing & POS", name: "PC station timers & session control", cuetronix: YES, competitor: YES },
    { category: "Billing & POS", name: "Console, VR, cue sports timers", cuetronix: YES, competitor: PARTIAL },
    { category: "Billing & POS", name: "Cafe / F&B POS combined on ticket", cuetronix: YES, competitor: PARTIAL },
    { category: "Online Booking", name: "Branded online booking portal", cuetronix: YES, competitor: PARTIAL },
    { category: "Online Booking", name: "Turf / court / multi-sport slot booking", cuetronix: YES, competitor: NO },
    { category: "Payments", name: "Native Razorpay UPI + cards", cuetronix: YES, competitor: NO },
    { category: "Payments", name: "Stripe + international gateways", cuetronix: PARTIAL, competitor: YES },
    { category: "Operations", name: "Tournament brackets across verticals", cuetronix: YES, competitor: PARTIAL },
    { category: "Operations", name: "Multi-vertical station engine", cuetronix: YES, competitor: NO },
    { category: "Staff & HR", name: "Biometric / QR attendance", cuetronix: YES, competitor: NO },
    { category: "Staff & HR", name: "Automated payroll & payslips", cuetronix: YES, competitor: NO },
    { category: "Staff & HR", name: "Shift rostering", cuetronix: YES, competitor: PARTIAL },
    { category: "Analytics", name: "Multi-branch revenue + cost centres", cuetronix: YES, competitor: PARTIAL },
    { category: "Platform", name: "GST-ready invoicing (India)", cuetronix: YES, competitor: NO },
    { category: "Platform", name: "Customer loyalty & prepaid wallet", cuetronix: YES, competitor: YES },
  ],
  whenToPickCuetronix: [
    "You run more than just PCs — consoles, VR, pool, snooker, turf or courts.",
    "You need Razorpay and GST-ready invoices.",
    "You want staff payroll and biometric attendance built in.",
    "You want a predictable flat SaaS fee.",
  ],
  whenToPickCompetitor: [
    "You are a pure PC esports centre in Europe / MENA with deep client-side automation needs.",
  ],
  faqs: [
    {
      q: "How is Cuetronix different from SENET?",
      a: "SENET specialises in PC esports automation. Cuetronix is a full venue OS that bills PCs, consoles, VR, cue sports, turfs, courts and cafe from one platform, and adds online booking with Razorpay plus corporate-grade staff payroll and attendance.",
    },
    {
      q: "Which is cheaper?",
      a: "Cuetronix is a flat ₹1,999–₹9,999/month SaaS fee for the whole venue. SENET pricing scales by station and centre, and is usually higher for mixed-vertical venues.",
    },
  ],
  verdict:
    "SENET is excellent for pure PC esports centres. Cuetronix is better for any venue that also runs consoles, cue sports, turfs, courts or a cafe.",
};

/* ─────────────────────────────────────────────────────────────────────────
 *  5. SmartLaunch — legacy cyber cafe / internet cafe management.
 * ─────────────────────────────────────────────────────────────────────── */
const smartLaunch: Competitor = {
  slug: "smartlaunch",
  name: "SmartLaunch",
  tagline: "Internet cafe & gaming centre management.",
  oneLiner:
    "SmartLaunch is a long-running internet-cafe-era management platform with strong roots in Windows-based PC cafes.",
  category: "Gaming centre",
  region: "Global",
  hqCountry: "Denmark",
  foundedYear: 2001,
  website: "https://www.smartlaunch.com",
  metaTitle: "Cuetronix vs SmartLaunch — Modern Cloud Gaming OS vs Legacy Cyber Cafe Tool",
  metaDescription:
    "Cuetronix vs SmartLaunch. SmartLaunch is a legacy internet-cafe tool; Cuetronix is the world's first all-in-one cloud gaming venue OS with POS, online booking, Razorpay and corporate-grade staff payroll built in.",
  keywords: [
    "Cuetronix vs SmartLaunch",
    "SmartLaunch alternative",
    "modern gaming cafe software",
    "cloud gaming centre software",
  ],
  tldr:
    "SmartLaunch was built for the internet-cafe era. Cuetronix is a modern cloud venue OS — multi-vertical, mobile-first, with online booking, Razorpay, tournaments, staff payroll and attendance built in.",
  bestFor:
    "Legacy Windows-based internet cafes comfortable with a desktop-first workflow.",
  cuetronixBestFor:
    "Gaming lounges, esports cafes and multi-sport venues that want a cloud-native product with booking, payments, tournaments, staff payroll and attendance out of the box.",
  pricing: {
    cuetronix: "From ₹1,999 / month — modern SaaS",
    competitor: "Per-client licence model, typically higher TCO once hardware and maintenance are factored in.",
  },
  features: [
    { category: "Platform", name: "Cloud-native, no on-prem server required", cuetronix: YES, competitor: NO },
    { category: "Platform", name: "Mobile-first operator UI", cuetronix: YES, competitor: NO },
    { category: "Billing & POS", name: "PC, console, VR, cue sports, turf, court timers", cuetronix: YES, competitor: PARTIAL },
    { category: "Billing & POS", name: "Integrated cafe POS", cuetronix: YES, competitor: PARTIAL },
    { category: "Online Booking", name: "Branded online booking portal with payments", cuetronix: YES, competitor: NO },
    { category: "Payments", name: "Razorpay, UPI, cards, net-banking", cuetronix: YES, competitor: NO },
    { category: "Operations", name: "Tournament brackets across verticals", cuetronix: YES, competitor: NO },
    { category: "Staff & HR", name: "Corporate-grade payroll & attendance", cuetronix: YES, competitor: NO },
    { category: "Analytics", name: "Real-time multi-branch dashboards", cuetronix: YES, competitor: PARTIAL },
  ],
  whenToPickCuetronix: [
    "You want a cloud SaaS you can operate from any browser or phone.",
    "You want online booking and modern payment methods (UPI, cards, net-banking).",
    "You want tournaments, cafe, loyalty and payroll in one place.",
  ],
  whenToPickCompetitor: [
    "You're running a legacy Windows PC cafe and you're comfortable with on-prem installs.",
  ],
  faqs: [
    {
      q: "Is Cuetronix a modern SmartLaunch alternative?",
      a: "Yes. Cuetronix is a cloud-native, multi-vertical venue OS that replaces the patchwork of cyber cafe tools, booking plugins, payment gateways and HR spreadsheets with one product.",
    },
    {
      q: "Can I migrate my SmartLaunch data to Cuetronix?",
      a: "Yes. Our onboarding team helps with customer, member and inventory imports via CSV. Most migrations complete in under a week.",
    },
  ],
  verdict:
    "If you're still running SmartLaunch, moving to Cuetronix is the single biggest upgrade your venue can make this year.",
};

/* ─────────────────────────────────────────────────────────────────────────
 *  6. COURTRESERVE — global court (pickleball, tennis) management.
 * ─────────────────────────────────────────────────────────────────────── */
const courtReserve: Competitor = {
  slug: "courtreserve",
  name: "CourtReserve",
  tagline: "Court management for tennis, pickleball & padel clubs.",
  oneLiner:
    "CourtReserve is a respected US-based tool for racquet-sport clubs — tennis, pickleball, padel.",
  category: "Court booking",
  region: "North America",
  hqCountry: "USA",
  foundedYear: 2015,
  website: "https://www.courtreserve.com",
  metaTitle: "Cuetronix vs CourtReserve — Multi-Sport Venue OS vs Racquet-Only Tool",
  metaDescription:
    "Cuetronix vs CourtReserve. CourtReserve is for racquet clubs; Cuetronix runs pickleball, padel, tennis AND turfs, snooker, gaming centres, VR — with POS, Razorpay online booking, and corporate-grade staff payroll.",
  keywords: [
    "Cuetronix vs CourtReserve",
    "CourtReserve alternative",
    "pickleball court booking software",
    "padel court software",
  ],
  tldr:
    "CourtReserve is an excellent racquet-club tool. Cuetronix runs racquet clubs plus turfs, cue sports, gaming, VR and cafe — all from one product — with Razorpay and GST-ready invoicing that work in India and emerging markets.",
  bestFor: "US-based tennis / pickleball / padel clubs with a member-driven model.",
  cuetronixBestFor:
    "Venues that combine courts with other verticals (turf, cafe, gaming, cue sports) or are based in India / APAC / GCC where Razorpay and GST matter.",
  pricing: {
    cuetronix: "From ₹1,999 / month flat for the whole venue",
    competitor: "Monthly fee scales with number of courts / members.",
  },
  features: [
    { category: "Online Booking", name: "Pickleball / padel / tennis court booking", cuetronix: YES, competitor: YES },
    { category: "Online Booking", name: "Football / cricket turf booking", cuetronix: YES, competitor: NO },
    { category: "Online Booking", name: "Snooker / 8-ball / pool table booking", cuetronix: YES, competitor: NO },
    { category: "Online Booking", name: "PS5 / Xbox / VR / PC gaming booking", cuetronix: YES, competitor: NO },
    { category: "Billing & POS", name: "Cafe / F&B POS combined on ticket", cuetronix: YES, competitor: PARTIAL },
    { category: "Billing & POS", name: "Pro-shop / inventory management", cuetronix: YES, competitor: PARTIAL },
    { category: "Payments", name: "Native Razorpay UPI + cards", cuetronix: YES, competitor: NO },
    { category: "Payments", name: "US card gateways (Stripe, etc.)", cuetronix: PARTIAL, competitor: YES },
    { category: "Operations", name: "Coach / instructor allocation", cuetronix: YES, competitor: YES },
    { category: "Operations", name: "Memberships & recurring passes", cuetronix: YES, competitor: YES },
    { category: "Operations", name: "League brackets & tournaments", cuetronix: YES, competitor: YES },
    { category: "Staff & HR", name: "Biometric attendance + automated payroll", cuetronix: YES, competitor: NO },
    { category: "Staff & HR", name: "Shift rostering + multi-branch cost centres", cuetronix: YES, competitor: NO },
    { category: "Platform", name: "GST-ready invoices (India)", cuetronix: YES, competitor: NO },
    { category: "Platform", name: "Multi-branch across cities", cuetronix: YES, competitor: YES },
  ],
  whenToPickCuetronix: [
    "You have courts AND other verticals (turf, gaming, cafe).",
    "You are in India / APAC / GCC and need Razorpay + GST.",
    "You need integrated staff payroll & attendance.",
    "You want a flat SaaS fee instead of per-court pricing.",
  ],
  whenToPickCompetitor: [
    "You run a US-only racquet club with no other verticals.",
    "Your customers expect the specific CourtReserve app experience.",
  ],
  faqs: [
    {
      q: "Can Cuetronix run a pure pickleball club?",
      a: "Yes. Cuetronix handles multi-court scheduling, memberships, coach allocation, equipment hire, league brackets and pro-shop POS — plus the cafe if you have one.",
    },
    {
      q: "Is Cuetronix cheaper than CourtReserve?",
      a: "CourtReserve scales by court count; Cuetronix is a flat SaaS fee for the whole venue. For most multi-court clubs, Cuetronix is materially cheaper.",
    },
  ],
  verdict:
    "For US-only racquet clubs, CourtReserve is familiar and well-fit. For anyone else, Cuetronix wins on breadth, cost and payments.",
};

/* ─────────────────────────────────────────────────────────────────────────
 *  7. SKEDDA — global venue / space booking.
 * ─────────────────────────────────────────────────────────────────────── */
const skedda: Competitor = {
  slug: "skedda",
  name: "Skedda",
  tagline: "Online venue booking, simplified.",
  oneLiner:
    "Skedda is a clean, generic venue scheduling tool — popular for co-working, studios and sports spaces.",
  category: "Venue booking",
  region: "Global",
  hqCountry: "Australia",
  foundedYear: 2014,
  website: "https://www.skedda.com",
  metaTitle: "Cuetronix vs Skedda — Venue OS vs Generic Space Booker",
  metaDescription:
    "Cuetronix vs Skedda. Skedda is a generic space-booking tool; Cuetronix is the world's first all-in-one gaming and sports venue OS — POS, Razorpay online booking, cafe, tournaments and corporate-grade staff payroll.",
  keywords: [
    "Cuetronix vs Skedda",
    "Skedda alternative for gaming lounges",
    "Skedda alternative for turfs",
    "venue booking software",
  ],
  tldr:
    "Skedda is a generic scheduling tool — great for meeting rooms and studios. Cuetronix is purpose-built for gaming and sports venues: per-minute timers, cafe POS, tournaments, loyalty and staff payroll all bundled in.",
  bestFor: "Co-working / studio / classroom spaces that just need a booking calendar.",
  cuetronixBestFor:
    "Gaming lounges, cue sports halls, turfs, courts, VR arcades, bowling alleys and FECs that need POS + booking + payments + cafe + payroll in one product.",
  pricing: {
    cuetronix: "From ₹1,999 / month — full venue OS",
    competitor: "Monthly fee scaling with number of spaces / users.",
  },
  features: [
    { category: "Online Booking", name: "Generic space booking calendar", cuetronix: YES, competitor: YES },
    { category: "Online Booking", name: "Per-minute / per-frame station billing", cuetronix: YES, competitor: NO },
    { category: "Online Booking", name: "Turf / court / multi-sport slot engine", cuetronix: YES, competitor: PARTIAL },
    { category: "Billing & POS", name: "Integrated POS with cafe billing", cuetronix: YES, competitor: NO },
    { category: "Billing & POS", name: "Happy-hour, combos, deposits, split bills", cuetronix: YES, competitor: NO },
    { category: "Payments", name: "Razorpay + UPI", cuetronix: YES, competitor: NO },
    { category: "Operations", name: "Tournament brackets & prize pools", cuetronix: YES, competitor: NO },
    { category: "Operations", name: "Inventory & menu management", cuetronix: YES, competitor: NO },
    { category: "Staff & HR", name: "Attendance, payroll, shifts, payslips", cuetronix: YES, competitor: NO },
    { category: "Analytics", name: "Revenue + utilisation + P&L per branch", cuetronix: YES, competitor: PARTIAL },
  ],
  whenToPickCuetronix: [
    "You run a venue, not a meeting room.",
    "You need POS, cafe, tournaments, loyalty or payroll — Skedda has none.",
    "You want Razorpay + GST + multi-vertical workflows.",
  ],
  whenToPickCompetitor: [
    "You only need a booking calendar for co-working or studio spaces.",
  ],
  faqs: [
    {
      q: "Can Skedda replace a gaming lounge POS?",
      a: "No. Skedda is a scheduling calendar — it doesn't bill games by the minute, it doesn't run a cafe, and it has no tournament, loyalty or payroll features.",
    },
    {
      q: "Why is Cuetronix a better fit for turfs?",
      a: "Cuetronix handles turf-specific workflows — peak/off-peak pricing, captain details, deposits, weather-aware cancellations, recurring passes and WhatsApp confirmations — while Skedda treats every slot as a generic calendar entry.",
    },
  ],
  verdict:
    "Skedda is a good generic scheduler. Cuetronix is the purpose-built venue OS gaming and sports operators actually need.",
};

/* ─────────────────────────────────────────────────────────────────────────
 *  8. SPRINGBOARDVR — global VR arcade management.
 * ─────────────────────────────────────────────────────────────────────── */
const springboardVR: Competitor = {
  slug: "springboardvr",
  name: "SpringboardVR",
  tagline: "The world's leading VR arcade content platform.",
  oneLiner:
    "SpringboardVR is the dominant VR arcade content-licensing platform — great for discovering and launching VR titles.",
  category: "VR arcade",
  region: "Global",
  hqCountry: "USA",
  foundedYear: 2016,
  website: "https://www.springboardvr.com",
  metaTitle: "Cuetronix vs SpringboardVR — Full Venue OS vs VR-Only Content Platform",
  metaDescription:
    "Cuetronix vs SpringboardVR. SpringboardVR licenses VR games to arcades; Cuetronix is a full venue OS — POS, online booking, Razorpay, cafe, tournaments and staff payroll — for VR arcades and mixed gaming venues.",
  keywords: [
    "Cuetronix vs SpringboardVR",
    "SpringboardVR alternative",
    "VR arcade management software",
    "VR arcade POS",
  ],
  tldr:
    "SpringboardVR solves VR content licensing. Cuetronix solves the rest — booking, POS, cafe, payments, tournaments and staff payroll. They're complementary for most VR arcades.",
  bestFor:
    "Pure VR arcades that need a large library of licensed VR titles distributed to headsets.",
  cuetronixBestFor:
    "VR arcades that also want to bill sessions, take online bookings with payment, run a cafe, manage staff payroll and scale to multi-branch — or mixed venues where VR is one of several verticals.",
  pricing: {
    cuetronix: "From ₹1,999 / month flat",
    competitor: "Revenue-share / per-headset licensing on top of platform fees.",
  },
  features: [
    { category: "Platform", name: "Licensed VR game library", cuetronix: NO, competitor: YES, note: "SpringboardVR's core" },
    { category: "Billing & POS", name: "Per-minute VR headset billing", cuetronix: YES, competitor: YES },
    { category: "Billing & POS", name: "Cafe / F&B POS combined on ticket", cuetronix: YES, competitor: NO },
    { category: "Billing & POS", name: "Consoles, PCs, cue sports, turfs, courts billing", cuetronix: YES, competitor: NO },
    { category: "Online Booking", name: "Branded online booking portal", cuetronix: YES, competitor: PARTIAL },
    { category: "Online Booking", name: "Liability waivers on booking", cuetronix: YES, competitor: YES },
    { category: "Payments", name: "Razorpay UPI + cards", cuetronix: YES, competitor: NO },
    { category: "Staff & HR", name: "Attendance + payroll + shifts", cuetronix: YES, competitor: NO },
    { category: "Operations", name: "Tournaments & leaderboards", cuetronix: YES, competitor: PARTIAL },
    { category: "Analytics", name: "Multi-branch revenue & utilisation", cuetronix: YES, competitor: PARTIAL },
  ],
  whenToPickCuetronix: [
    "You want POS, booking, cafe, payments and payroll for your VR arcade.",
    "You also run consoles, PCs, cue sports, turfs or courts.",
    "You are in India / APAC / GCC and need Razorpay + GST.",
  ],
  whenToPickCompetitor: [
    "Your #1 need is a wide licensed VR content library for headsets.",
  ],
  faqs: [
    {
      q: "Is Cuetronix a SpringboardVR replacement?",
      a: "Only partially. SpringboardVR's core value is VR game licensing — Cuetronix does not license VR content. Cuetronix handles everything else a VR arcade needs: billing, bookings, cafe, payroll and reporting. Many operators use both.",
    },
    {
      q: "Can Cuetronix run a pure VR arcade?",
      a: "Yes, for the operations side — POS, headset timers, waivers, bookings, cafe, loyalty and staff payroll. You'd typically pair it with a content platform like SpringboardVR for VR game distribution.",
    },
  ],
  verdict:
    "Keep SpringboardVR for VR content. Use Cuetronix for everything else — and for the mixed-venue future most arcades are moving toward.",
};

export const competitors: Competitor[] = [
  playo,
  hudle,
  ggLeap,
  senet,
  smartLaunch,
  courtReserve,
  skedda,
  springboardVR,
];

export const competitorBySlug = (slug: string): Competitor | undefined =>
  competitors.find((c) => c.slug === slug);
