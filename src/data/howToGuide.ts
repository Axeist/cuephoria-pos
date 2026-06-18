/** Operator playbook content for the How to Use / Training Hub page. */

export type GuideAudience = 'all' | 'admin' | 'staff';

export type GuideCallout = {
  type: 'tip' | 'warning' | 'pro' | 'admin';
  text: string;
};

export type GuideStep = {
  title: string;
  detail: string;
};

export type GuideLink = {
  label: string;
  path: string;
};

export type GuideSection = {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  tags: string[];
  audience: GuideAudience;
  path?: string;
  steps: GuideStep[];
  bullets?: string[];
  callouts?: GuideCallout[];
  links?: GuideLink[];
};

export type GuideFaq = {
  q: string;
  a: string;
  tags: string[];
};

export type LearningPath = {
  id: string;
  role: string;
  subtitle: string;
  duration: string;
  gradient: string;
  modules: string[];
};

export const HOW_TO_STATS = [
  { label: 'Modules', value: '18' },
  { label: 'SOP steps', value: '120+' },
  { label: 'FAQ answers', value: '24' },
  { label: 'Roles covered', value: '3' },
];

export const LEARNING_PATHS: LearningPath[] = [
  {
    id: 'cashier',
    role: 'Front desk & cashier',
    subtitle: 'Day-one essentials for billing and sessions',
    duration: '~45 min',
    gradient: 'from-cyan-500/20 to-blue-600/10',
    modules: ['POS billing', 'Start/end sessions', 'Add customers', 'Reprint receipts'],
  },
  {
    id: 'floor',
    role: 'Floor manager',
    subtitle: 'Run the shift — stations, bookings, exceptions',
    duration: '~90 min',
    gradient: 'from-violet-500/20 to-fuchsia-600/10',
    modules: ['Station Command', 'Live filters & group start', 'Bookings desk', 'Shift reports'],
  },
  {
    id: 'owner',
    role: 'Owner / admin',
    subtitle: 'Setup, branding, staff, payments, governance',
    duration: '~3 hrs',
    gradient: 'from-amber-500/20 to-orange-600/10',
    modules: ['Onboarding', 'Settings & Razorpay', 'Staff & PIN', 'Multi-branch & subscription'],
  },
];

export const GUIDE_SECTIONS: GuideSection[] = [
  {
    id: 'getting-started',
    title: 'Getting started & onboarding',
    subtitle: 'From empty workspace to first bill in under 30 minutes',
    icon: 'rocket',
    tags: ['onboarding', 'setup', 'new', 'first'],
    audience: 'admin',
    path: '/onboarding',
    steps: [
      {
        title: 'Complete signup & verify email',
        detail:
          'Create your workspace, confirm your email, and sign in. Admins land on onboarding; staff accounts are created by an admin from Staff Management.',
      },
      {
        title: 'Run the onboarding wizard',
        detail:
          'Add your venue name, at least one branch/location, one station type, one station, one product category, and 1–2 products. Skip nothing — an empty POS is the #1 support ticket.',
      },
      {
        title: 'Switch to your live branch',
        detail:
          'Use the location switcher in the sidebar header. Every page — stations, products, reports — is scoped to the active branch.',
      },
      {
        title: 'Add a real test customer',
        detail:
          'Create one walk-in customer with name + phone. Use them for a practice bill, then use real customers on shift.',
      },
      {
        title: 'Fire a test session + bill',
        detail:
          'Open Gaming Stations → start a 5-minute session → end to POS or checkout → finalize with cash. Confirm the receipt and Reports entry.',
      },
    ],
    callouts: [
      {
        type: 'pro',
        text: 'Pin this Training Hub in the sidebar (How to Use). New hires should read Getting Started before touching live money.',
      },
      {
        type: 'admin',
        text: 'Only admins can add stations, change Razorpay keys, or manage subscription. Assign one “ops owner” per branch.',
      },
    ],
    links: [
      { label: 'Onboarding', path: '/onboarding' },
      { label: 'Settings', path: '/settings' },
    ],
  },
  {
    id: 'daily-launch',
    title: 'Daily launch checklist',
    subtitle: 'Open-shift routine — run this every morning',
    icon: 'checklist',
    tags: ['daily', 'shift', 'open', 'sop'],
    audience: 'all',
    path: '/dashboard',
    steps: [
      {
        title: 'Open Dashboard first',
        detail:
          'Scan live session count, today’s revenue, low-stock alerts, and recent transactions. Red flags here save hours later.',
      },
      {
        title: 'Confirm Gaming Stations',
        detail:
          'No ghost sessions (Live badge but idle card). If stuck, end session or contact admin. Check Live filter for occupied bays.',
      },
      {
        title: 'Verify POS catalog',
        detail:
          'Spot-check top sellers and session rates. Out-of-stock items block billing — restock or disable before rush.',
      },
      {
        title: 'Review today’s bookings',
        detail:
          'Open Bookings → filter today. Pre-paid online slots should appear on station cards with a teal Pre-paid badge.',
      },
      {
        title: 'Staff clock-in (if using Staff Portal)',
        detail:
          'Floor staff mark attendance; managers confirm roster in Staff Management before peak hours.',
      },
      {
        title: 'End-of-shift close',
        detail:
          'End all sessions, run Reports for the shift window, reconcile cash/UPI, export if accounts needs it, log out.',
      },
    ],
    bullets: [
      'Keep one charged tablet at the front desk logged into the correct branch.',
      'Never share admin PIN — use staff roles with limited permissions.',
      'Screenshot any error before refreshing the page.',
    ],
    callouts: [
      { type: 'warning', text: 'Inactive sessions auto sign-out after 5 hours. Save long reports before breaks.' },
    ],
    links: [{ label: 'Dashboard', path: '/dashboard' }],
  },
  {
    id: 'dashboard',
    title: 'Dashboard — your command center',
    subtitle: 'Overview, analytics, expenses, and vault',
    icon: 'home',
    tags: ['dashboard', 'analytics', 'kpi', 'expenses'],
    audience: 'all',
    path: '/dashboard',
    steps: [
      {
        title: 'Overview tab',
        detail:
          'Hero stats, active sessions widget, recent bills, quick actions to POS and Stations. Use during the shift for pulse checks.',
      },
      {
        title: 'Analytics tab',
        detail:
          'Hourly/daily/weekly/monthly revenue charts, customer activity, product performance, spending correlation. Best for owners reviewing trends.',
      },
      {
        title: 'Expenses tab',
        detail:
          'Log rent, utilities, supplies. Filter by date and category. Feeds business summary for true profit view.',
      },
      {
        title: 'Cash / Vault tab',
        detail:
          'Track cash movements and vault balance where enabled. Reconcile with physical drawer counts.',
      },
      {
        title: 'Export from dashboard',
        detail:
          'Excel exports available on several widgets — use for investor updates or accountant handoff.',
      },
    ],
    links: [{ label: 'Open Dashboard', path: '/dashboard' }],
  },
  {
    id: 'pos',
    title: 'POS billing — full flow',
    subtitle: 'Customers, cart, discounts, split pay, receipts',
    icon: 'cart',
    tags: ['pos', 'billing', 'bill', 'payment', 'receipt'],
    audience: 'all',
    path: '/pos',
    steps: [
      {
        title: 'Select or add customer',
        detail:
          'Search by name/phone. Walk-ins can be added inline. Membership and loyalty tags show on profile.',
      },
      {
        title: 'Add products & session charges',
        detail:
          'Tap categories, search SKUs, add station session lines from active/end-session handoff. Quantities editable before pay.',
      },
      {
        title: 'Apply discounts & coupons',
        detail:
          'Percent or flat discounts where permitted. Coupon codes from campaigns apply before total lock.',
      },
      {
        title: 'Split payments',
        detail:
          'Mix cash + UPI + card in one bill. Each split line must sum to total before finalize.',
      },
      {
        title: 'Finalize & print',
        detail:
          'Confirm total, payment mode, GST breakdown. Reprint anytime from Reports → transaction detail.',
      },
      {
        title: 'Station → POS handoff',
        detail:
          'Ending a session can push time + F&B add-ons to POS automatically. Review cart before collecting payment.',
      },
    ],
    callouts: [
      { type: 'tip', text: 'Train staff to always attach a customer — history powers loyalty and dispute resolution.' },
      { type: 'warning', text: 'Do not refresh mid-bill. Cart state may reset.' },
    ],
    links: [{ label: 'Open POS', path: '/pos' }],
  },
  {
    id: 'stations',
    title: 'Gaming Stations (Station Command)',
    subtitle: 'Sessions, timers, group start, tints, booking visibility',
    icon: 'clock',
    tags: ['stations', 'session', 'ps5', 'vr', 'snooker', 'live'],
    audience: 'all',
    path: '/stations',
    steps: [
      {
        title: 'Station Command layout',
        detail:
          'Each card = one bay/table/console. Header shows name, type, rate, Open/Live badge. Body shows customer intel or “Station ready” stats.',
      },
      {
        title: 'Start a session',
        detail:
          'Add customer (optional first) → Start session → pick duration/pricing mode → timer runs live with cost ticker.',
      },
      {
        title: 'End, pause, extend',
        detail:
          'End sends to checkout/POS. Pause freezes timer (amber state). Extend adds prepaid minutes where configured.',
      },
      {
        title: 'Group start',
        detail:
          'Enable Group start → select multiple open stations → Start together for parties or tournaments.',
      },
      {
        title: 'Filters & sort',
        detail:
          'All / Live / type pills filter the grid. Sort by custom drag order, type, or name. Drag grip handle to reorder — saved per branch.',
      },
      {
        title: 'Edit station',
        detail:
          'Rate, slot duration, max players, per-player vs flat pricing, accent tint/gradient, booking-page toggle, time-based tiers.',
      },
      {
        title: 'Quick shop on station',
        detail:
          'During live sessions, add F&B from station card quick shop — items stack to session bill at end.',
      },
      {
        title: 'Online pre-paid bookings',
        detail:
          'Teal Pre-paid badge + slot time. Session auto-starts with locked rate; complete without double-charging.',
      },
    ],
    bullets: [
      'Name stations clearly: C1, R2, VR-1 — staff find them faster.',
      'Use Types manager for custom venue categories (Recliner, Sim Racing, etc.).',
      'Live header stat box and Live pill filter stay in sync.',
    ],
    callouts: [
      { type: 'pro', text: 'Custom card tints help floor staff spot zones instantly — orange couch, purple recliner, cyan sim.' },
    ],
    links: [
      { label: 'Gaming Stations', path: '/stations' },
      { label: 'Bookings', path: '/booking-management' },
    ],
  },
  {
    id: 'products',
    title: 'Products & categories',
    subtitle: 'Menu, stock, pricing, accents, quick shop',
    icon: 'package',
    tags: ['products', 'inventory', 'stock', 'menu', 'category'],
    audience: 'all',
    path: '/products',
    steps: [
      {
        title: 'Category structure',
        detail:
          'Food, drinks, tobacco, membership, etc. — fully renameable. Accent colors tint POS chips and category cards.',
      },
      {
        title: 'Add / edit products',
        detail:
          'Name, price, GST, stock, SKU, image. Enable quick shop for station-side ordering.',
      },
      {
        title: 'Stock management',
        detail:
          'Decrements on sale. Low stock surfaces on Dashboard. Zero stock blocks add-to-cart.',
      },
      {
        title: 'Bulk & consistency',
        detail:
          'Use consistent naming (Coke 330ml not “coke”). Helps search at speed during rush.',
      },
    ],
    links: [{ label: 'Products', path: '/products' }],
  },
  {
    id: 'customers',
    title: 'Customers, loyalty & memberships',
    subtitle: 'Profiles, history, memberships, engagement',
    icon: 'users',
    tags: ['customers', 'crm', 'loyalty', 'membership'],
    audience: 'all',
    path: '/customers',
    steps: [
      {
        title: 'Customer profile',
        detail:
          'Name, phone, email, visit history, total spend, active membership. Edit anytime.',
      },
      {
        title: 'Memberships',
        detail:
          'Sell membership products from POS. Active members show badges on station cards and POS.',
      },
      {
        title: 'Guest vs member pricing',
        detail:
          'Configure in products/stations. Staff see member status before starting session.',
      },
      {
        title: 'Customer portal (optional)',
        detail:
          'Customers with accounts view bookings, offers, profile at /customer/login — separate from staff app.',
      },
    ],
    callouts: [
      { type: 'tip', text: 'Phone number is the universal key — always collect it for walk-ins you expect back.' },
    ],
    links: [{ label: 'Customers', path: '/customers' }],
  },
  {
    id: 'bookings',
    title: 'Bookings & online portal',
    subtitle: 'Razorpay pre-pay, slot management, public booking page',
    icon: 'calendar',
    tags: ['booking', 'razorpay', 'online', 'prepaid', 'portal'],
    audience: 'all',
    path: '/booking-management',
    steps: [
      {
        title: 'Booking Management desk',
        detail:
          'View all reservations, filter by date/status, confirm/cancel, link to customer and station.',
      },
      {
        title: 'Public booking URL',
        detail:
          'Share your branded /public/booking link. Customers pick station type, slot, pay via Razorpay UPI/card.',
      },
      {
        title: 'Station visibility toggle',
        detail:
          'Per station: “On booking page” switch controls whether it appears online.',
      },
      {
        title: 'Pre-paid flow at venue',
        detail:
          'Staff see pre-paid session on station card — start or auto-recognize slot; rate is locked from booking.',
      },
      {
        title: 'Booking settings',
        detail:
          'Configure slots, buffers, cancellation rules, and payment keys under Settings → Booking & Payments.',
      },
    ],
    callouts: [
      { type: 'admin', text: 'Razorpay keys live in Settings. Test mode first, then flip live keys before marketing the link.' },
    ],
    links: [
      { label: 'Bookings', path: '/booking-management' },
      { label: 'Booking settings', path: '/settings' },
    ],
  },
  {
    id: 'tournaments',
    title: 'Tournaments & events',
    subtitle: 'Create brackets, public signup, payments, leaderboards',
    icon: 'trophy',
    tags: ['tournament', 'event', 'bracket', 'leaderboard'],
    audience: 'admin',
    path: '/settings',
    steps: [
      {
        title: 'Create tournament',
        detail:
          'Settings → Tournaments tab: name, dates, entry fee, max players, station linkage, banner image.',
      },
      {
        title: 'Public tournament page',
        detail:
          'Share /public/tournaments — players register and pay online where fees apply.',
      },
      {
        title: 'Run event stations',
        detail:
          'Mark stations as event-enabled for temporary pricing or blocked slots during comps.',
      },
      {
        title: 'Leaderboard & history',
        detail:
          'Update scores from Settings. Past events archived in tournament history.',
      },
    ],
    links: [{ label: 'Settings → Tournaments', path: '/settings' }],
  },
  {
    id: 'reports',
    title: 'Reports & exports',
    subtitle: 'Sales, sessions, staff, GST, Excel',
    icon: 'chart',
    tags: ['reports', 'export', 'excel', 'gst', 'audit'],
    audience: 'all',
    path: '/reports',
    steps: [
      {
        title: 'Date & branch filters',
        detail:
          'Always set range first. Multi-branch orgs: confirm location switcher matches the branch you’re reporting.',
      },
      {
        title: 'Sales & product breakdown',
        detail:
          'Revenue by category, top SKUs, payment mode split. Drill into individual bills.',
      },
      {
        title: 'Session reports',
        detail:
          'Hours played, station utilization, average ticket — essential for pricing decisions.',
      },
      {
        title: 'Export',
        detail:
          'Excel/CSV for accountants. Include GST columns for filing. Export before month-end close.',
      },
      {
        title: 'Reprint receipts',
        detail:
          'Find transaction → reprint. Useful for customer disputes and shift audits.',
      },
    ],
    links: [{ label: 'Reports', path: '/reports' }],
  },
  {
    id: 'staff',
    title: 'Staff management & portal',
    subtitle: 'Roles, attendance, payroll, payslips, my portal',
    icon: 'staff',
    tags: ['staff', 'hr', 'payroll', 'attendance', 'portal'],
    audience: 'admin',
    path: '/staff',
    steps: [
      {
        title: 'Add staff accounts',
        detail:
          'Staff Management: name, role (admin/staff), branch access, login credentials.',
      },
      {
        title: 'Roles & permissions',
        detail:
          'Admins: full access. Staff: POS, stations, customers — no billing keys or subscription.',
      },
      {
        title: 'Attendance & shifts',
        detail:
          'Configure shifts, biometric/manual check-in, late rules. Staff use My Portal for clock-in.',
      },
      {
        title: 'Payroll & payslips',
        detail:
          'Salary structures, deductions, generate payslips, export for bank transfer.',
      },
      {
        title: 'Staff Portal (/staff-portal)',
        detail:
          'Non-admin staff view schedule, attendance, payslips, leave requests — not full admin panels.',
      },
    ],
    callouts: [
      { type: 'admin', text: 'Review login logs (/login-logs) monthly for suspicious access.' },
    ],
    links: [
      { label: 'Staff Management', path: '/staff' },
      { label: 'My Portal', path: '/staff-portal' },
    ],
  },
  {
    id: 'settings',
    title: 'Settings & workspace',
    subtitle: 'Branding, branches, payments, security, email',
    icon: 'settings',
    tags: ['settings', 'branding', 'razorpay', 'branch', 'logo'],
    audience: 'admin',
    path: '/settings',
    steps: [
      {
        title: 'General & branding',
        detail:
          'Logo, colors, receipt header/footer, timezone, currency. Reflects on POS receipts and public pages.',
      },
      {
        title: 'Branch management',
        detail:
          'Add locations (Sanpada, Thane, etc.). Each branch has isolated stations, products, reports.',
      },
      {
        title: 'Payment gateway',
        detail:
          'Razorpay key ID/secret for online booking and tournaments. Webhook URL documented in panel.',
      },
      {
        title: 'Booking rules',
        detail:
          'Slot length, advance booking window, cancellation policy, deposit rules.',
      },
      {
        title: 'Organization & billing',
        detail:
          'Legal name, GSTIN, invoice details. Link to Subscription for Cuetronix plan.',
      },
      {
        title: 'Security',
        detail:
          'Admin PIN for sensitive actions (add station, price changes). Change password under Account Security.',
      },
    ],
    links: [
      { label: 'Settings', path: '/settings' },
      { label: 'Organization', path: '/settings/organization' },
      { label: 'Account security', path: '/account/security' },
    ],
  },
  {
    id: 'public',
    title: 'Public customer pages',
    subtitle: 'Booking, stations browser, tournaments — your branded web',
    icon: 'globe',
    tags: ['public', 'website', 'customer', 'link'],
    audience: 'admin',
    steps: [
      {
        title: 'Public booking',
        detail: '/public/booking — customers book and pay without calling.',
      },
      {
        title: 'Public stations',
        detail: '/public/stations — live availability showcase for marketing.',
      },
      {
        title: 'Public tournaments',
        detail: '/public/tournaments — registration and fees.',
      },
      {
        title: 'Lite URLs',
        detail: 'Lite tier uses /lite/public/* paths — same flow, lighter skin.',
      },
      {
        title: 'Branded tenant app',
        detail: '/app/t/your-slug — white-label entry when configured.',
      },
    ],
    callouts: [
      { type: 'pro', text: 'Put booking link in Instagram bio, Google Maps, and WhatsApp auto-reply.' },
    ],
  },
  {
    id: 'ai',
    title: 'Cuetronix AI assistant',
    subtitle: 'Ask questions about ops, reports, and setup',
    icon: 'bot',
    tags: ['ai', 'chat', 'help', 'assistant'],
    audience: 'all',
    path: '/chat-ai',
    steps: [
      {
        title: 'Open Cuetronix AI',
        detail: 'Sidebar → Cuetronix AI. Ask in plain English about features or troubleshooting.',
      },
      {
        title: 'Good prompts',
        detail:
          '“How do I start a group session?” · “Export last week GST sales” · “Setup Razorpay for bookings”',
      },
      {
        title: 'When to use AI vs this guide',
        detail: 'This page = official SOP. AI = quick answers. Still verify money actions manually.',
      },
    ],
    links: [{ label: 'Cuetronix AI', path: '/chat-ai' }],
  },
  {
    id: 'subscription',
    title: 'Subscription & plan',
    subtitle: 'Cuetronix billing, trial, upgrades',
    icon: 'credit',
    tags: ['subscription', 'plan', 'billing', 'trial'],
    audience: 'admin',
    path: '/subscription',
    steps: [
      {
        title: 'View current plan',
        detail: 'Subscription page shows tier, renewal, feature limits (Lite vs full).',
      },
      {
        title: 'Trial',
        detail: '14-day trial from signup. Upgrade before expiry to avoid read-only mode.',
      },
      {
        title: 'Invoices',
        detail: 'Download Cuetronix invoices for your accounts. Separate from venue customer bills.',
      },
    ],
    links: [{ label: 'Subscription', path: '/subscription' }],
  },
  {
    id: 'security',
    title: 'Security & PIN governance',
    subtitle: 'Sessions, PIN, roles, audit',
    icon: 'shield',
    tags: ['security', 'pin', 'logout', 'password'],
    audience: 'all',
    steps: [
      {
        title: 'Auto sign-out',
        detail: '5-hour inactivity logout. Save exports before long breaks.',
      },
      {
        title: 'Admin PIN',
        detail: 'Required for delete station, sensitive price edits, some settings. Never share verbally.',
      },
      {
        title: 'Per-staff logins',
        detail: 'No shared passwords. Disable leavers same day.',
      },
      {
        title: 'Change password',
        detail: 'Account → Security. Enforce strong passwords for admins.',
      },
    ],
    links: [{ label: 'Account security', path: '/account/security' }],
  },
  {
    id: 'cafe',
    title: 'Cafe / kitchen module',
    subtitle: 'Separate login for F&B-heavy venues',
    icon: 'layers',
    tags: ['cafe', 'kitchen', 'kot', 'food'],
    audience: 'admin',
    path: '/cafe/login',
    steps: [
      {
        title: 'Cafe workspace',
        detail: 'Staff at /cafe/login get POS, KOT kitchen display, menu, tables, orders.',
      },
      {
        title: 'Kitchen (KOT)',
        detail: 'Orders fire to kitchen screen; mark ready → served.',
      },
      {
        title: 'Link to gaming POS',
        detail: 'Many venues run cafe + gaming billing together — F&B can flow via station quick shop or main POS.',
      },
    ],
    links: [{ label: 'Cafe login', path: '/cafe/login' }],
  },
  {
    id: 'troubleshooting',
    title: 'Troubleshooting & FAQ shortcuts',
    subtitle: 'Fix the top issues without calling support',
    icon: 'zap',
    tags: ['help', 'fix', 'error', 'empty', 'bug'],
    audience: 'all',
    steps: [
      {
        title: 'Empty stations or products after login',
        detail: 'Wrong branch selected — switch location in header. Or complete onboarding.',
      },
      {
        title: 'Cannot end ghost session',
        detail: 'Refresh stations. Admin may clear orphaned session in DB — contact support with station name.',
      },
      {
        title: 'Razorpay payment failed online',
        detail: 'Check keys in Settings, test vs live mode, and webhook reachability.',
      },
      {
        title: 'Rates/colors reset on refresh',
        detail: 'Run pending Supabase migrations for accent_color, sort_order. Until then, tints cache locally.',
      },
      {
        title: 'Bill total mismatch',
        detail: 'Check session duration, pause state, per-player count, and discounts before voiding.',
      },
    ],
    callouts: [
      {
        type: 'warning',
        text: 'Support checklist: branch name, screenshot, exact button clicked, time of issue, staff login used.',
      },
    ],
  },
];

export const GUIDE_FAQS: GuideFaq[] = [
  {
    q: 'How do I avoid an empty app after onboarding?',
    a: 'Complete every onboarding step: branch, station type, station, category, product, test customer. Switch to the correct branch in the header. Add inventory before opening POS.',
    tags: ['onboarding', 'empty'],
  },
  {
    q: 'Can I customize categories and stations later?',
    a: 'Yes — Products and Gaming Stations are fully editable anytime. Rates, tints, sort order, and booking visibility can change without downtime.',
    tags: ['stations', 'products'],
  },
  {
    q: 'What should new staff learn first?',
    a: 'Order: POS billing → start/end session → add customer → read Dashboard live count → end-of-shift Reports. Give them the Front desk learning path above.',
    tags: ['training', 'staff'],
  },
  {
    q: 'Where do I configure branding and Razorpay?',
    a: 'Settings → General (logo/colors), Settings → Payment gateway (Razorpay keys), Settings → Booking (slots/rules). Admin access required.',
    tags: ['settings', 'razorpay'],
  },
  {
    q: 'Where are historical sales and GST exports?',
    a: 'Reports → set date range → filter → Export Excel. Reprint individual receipts from transaction detail.',
    tags: ['reports', 'export'],
  },
  {
    q: 'How do online pre-paid bookings appear on floor?',
    a: 'Station card shows teal Pre-paid badge with slot time and locked rate. Start or acknowledge — do not charge again at POS.',
    tags: ['booking', 'prepaid'],
  },
  {
    q: 'How does group start work?',
    a: 'Stations → Group start → tap open stations to select → Start together. All selected bays begin with same customer flow.',
    tags: ['stations', 'group'],
  },
  {
    q: 'How do I filter only live stations?',
    a: 'Use Live pill next to All stations, or click the Live stat box in the Station Command header.',
    tags: ['stations', 'live'],
  },
  {
    q: 'What is admin PIN used for?',
    a: 'Protects destructive/sensitive actions: delete station, major price edits, some settings. Set in Settings; verify when prompted.',
    tags: ['security', 'pin'],
  },
  {
    q: 'Multi-branch: do products sync across locations?',
    a: 'No — each branch has its own catalog, stations, and reports. Switch branch in sidebar header to operate each venue.',
    tags: ['branch', 'multi'],
  },
  {
    q: 'How do station accent colors work?',
    a: 'Edit station → pick solid or gradient tint. Card glow, text, and buttons harmonize. Apply-to-all-type for uniform zones.',
    tags: ['stations', 'design'],
  },
  {
    q: 'Can customers book without staff help?',
    a: 'Yes — share your public booking URL. They pay via Razorpay; you see booking in Booking Management and on station cards.',
    tags: ['booking', 'public'],
  },
  {
    q: 'Where is staff payroll?',
    a: 'Staff Management for admins; My Portal for staff to view payslips and attendance.',
    tags: ['staff', 'payroll'],
  },
  {
    q: 'What is Cuetronix AI for?',
    a: 'In-app chat for how-to questions and ops queries. Use alongside this Training Hub for official procedures.',
    tags: ['ai'],
  },
  {
    q: 'How long until auto logout?',
    a: '5 hours of inactivity. Export long reports before breaks.',
    tags: ['security'],
  },
  {
    q: 'Lite vs full plan — what changes?',
    a: 'Lite may use /lite/public/* URLs and feature caps. Check Subscription page for your entitlements.',
    tags: ['subscription'],
  },
  {
    q: 'How do tournaments accept payment?',
    a: 'Create in Settings → Tournaments, share public link, set entry fee — Razorpay collects on registration.',
    tags: ['tournament'],
  },
  {
    q: 'Station quick shop — when to use?',
    a: 'During live session, add snacks/drinks from station card without leaving floor view. Charges merge at session end.',
    tags: ['stations', 'pos'],
  },
  {
    q: 'Per-player vs flat station pricing?',
    a: 'Edit station → pricing mode. Per-player multiplies rate by headcount; flat is one rate per slot regardless of players.',
    tags: ['stations', 'pricing'],
  },
  {
    q: 'How do I reorder station cards?',
    a: 'Set sort to Custom order, drag grip handle on card, drop — order saves per branch automatically.',
    tags: ['stations', 'sort'],
  },
  {
    q: 'Customer portal vs staff app?',
    a: 'Customers use /customer/login for their bookings/offers. Staff use main app login — separate systems.',
    tags: ['customer', 'portal'],
  },
  {
    q: 'Cafe module — same login as gaming?',
    a: 'No — cafe staff use /cafe/login for kitchen/KOT workflow. Can run parallel with gaming POS.',
    tags: ['cafe'],
  },
  {
    q: 'Who can add new stations?',
    a: 'Admins with PIN verification. Prevents floor staff from accidentally creating duplicate bays.',
    tags: ['stations', 'admin'],
  },
  {
    q: 'Best way to train a new branch opening?',
    a: 'Clone setup: export reports template from existing branch, recreate station types, run Front desk + Floor manager learning paths, dry-run day with test customers.',
    tags: ['training', 'branch'],
  },
];
