import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Award,
  Boxes,
  BarChart3,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock,
  Coins,
  Globe2,
  Heart,
  LifeBuoy,
  Minus,
  Quote,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
  Trophy,
  UserCheck,
  Users,
  Workflow,
  X,
  Zap,
} from "lucide-react";

import Header from "@/components/landing/Header";
import Footer from "@/components/landing/Footer";
import SiteAmbientBackground from "@/components/landing/SiteAmbientBackground";
import { Button } from "@/components/ui/button";
import {
  competitors,
  competitorBySlug,
  type AdvantageIcon,
  type CompetitorFeature,
  type FeatureCell,
} from "@/data/competitors";

/* ───── Helpers ──────────────────────────────────────────────────────── */

const ADVANTAGE_ICON: Record<AdvantageIcon, React.ComponentType<{ size?: number; className?: string }>> = {
  zap: Zap,
  shield: ShieldCheck,
  coins: Coins,
  chart: BarChart3,
  globe: Globe2,
  users: Users,
  sparkles: Sparkles,
  workflow: Workflow,
  trophy: Trophy,
  clock: Clock,
  boxes: Boxes,
  heart: Heart,
};

function renderCell(v: FeatureCell) {
  if (v === true)
    return (
      <span className="inline-flex items-center gap-1.5 text-sm text-emerald-200/90 font-medium">
        <CheckCircle2 size={15} className="text-emerald-300" /> Included
      </span>
    );
  if (v === false)
    return (
      <span className="inline-flex items-center gap-1.5 text-sm text-rose-300/75">
        <X size={15} className="text-rose-400/80" /> Not included
      </span>
    );
  if (v === "partial")
    return (
      <span className="inline-flex items-center gap-1.5 text-sm text-amber-200/90">
        <Minus size={15} className="text-amber-300" /> Partial / add-on
      </span>
    );
  return <span className="text-sm text-white/80">{v}</span>;
}

function groupByCategory(features: CompetitorFeature[]) {
  const map = new Map<CompetitorFeature["category"], CompetitorFeature[]>();
  for (const f of features) {
    if (!map.has(f.category)) map.set(f.category, []);
    map.get(f.category)!.push(f);
  }
  return Array.from(map.entries());
}

function scoreFeatures(features: CompetitorFeature[]) {
  let c = 0, k = 0;
  for (const f of features) {
    if (f.cuetronix === true) c += 1; else if (f.cuetronix === "partial") c += 0.5;
    if (f.competitor === true) k += 1; else if (f.competitor === "partial") k += 0.5;
  }
  return { cuetronix: c, competitor: k, total: features.length };
}

/* ───── Donut chart ──────────────────────────────────────────────────── */

const CoverageDonut: React.FC<{ label: string; value: number; total: number; color: string; accent: string }> = ({
  label,
  value,
  total,
  color,
  accent,
}) => {
  const pct = Math.max(0, Math.min(1, total === 0 ? 0 : value / total));
  const r = 58;
  const c = 2 * Math.PI * r;
  const dash = pct * c;
  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: 148, height: 148 }}>
        <svg width="148" height="148" viewBox="0 0 148 148" className="-rotate-90">
          <circle cx="74" cy="74" r={r} stroke="rgba(255,255,255,0.07)" strokeWidth="12" fill="none" />
          <motion.circle
            cx="74"
            cy="74"
            r={r}
            stroke={color}
            strokeWidth="12"
            strokeLinecap="round"
            fill="none"
            strokeDasharray={`${dash} ${c}`}
            initial={{ strokeDasharray: `0 ${c}` }}
            animate={{ strokeDasharray: `${dash} ${c}` }}
            transition={{ duration: 1.1, ease: "easeOut" }}
            style={{ filter: `drop-shadow(0 0 14px ${accent})` }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="text-3xl font-extrabold text-white leading-none">{Math.round(pct * 100)}%</div>
          <div className="text-[10px] uppercase tracking-[0.22em] text-white/50 mt-1">coverage</div>
        </div>
      </div>
      <div className="mt-3 text-sm font-semibold text-white">{label}</div>
      <div className="text-xs text-white/50 mt-0.5">
        {value.toFixed(value % 1 === 0 ? 0 : 1)} / {total} features
      </div>
    </div>
  );
};

/* ───── Brand badge ──────────────────────────────────────────────────── */

const BrandBadge: React.FC<{ mark: string; color: string; name: string; size?: "md" | "lg" }> = ({
  mark,
  color,
  name,
  size = "md",
}) => {
  const cls = size === "lg" ? "h-16 w-16 text-2xl" : "h-12 w-12 text-lg";
  return (
    <div className="flex items-center gap-3">
      <div
        className={`${cls} rounded-2xl flex items-center justify-center font-black text-white shadow-xl`}
        style={{
          background: `linear-gradient(135deg, ${color}E6 0%, ${color}88 60%, rgba(15,10,30,0.85) 100%)`,
          border: `1px solid ${color}55`,
        }}
        aria-hidden="true"
      >
        {mark}
      </div>
      <div>
        <div className="text-white font-bold text-lg leading-tight">{name}</div>
      </div>
    </div>
  );
};

/* ───── TOC (sticky desktop) ─────────────────────────────────────────── */

const TOC_ITEMS = [
  { id: "at-a-glance",  label: "At a glance" },
  { id: "coverage",     label: "Feature coverage" },
  { id: "pricing",      label: "Pricing" },
  { id: "analysis",     label: "Strengths & limits" },
  { id: "advantages",   label: "Why Cuetronix wins" },
  { id: "features",     label: "Feature matrix" },
  { id: "migration",    label: "How to switch" },
  { id: "operator",     label: "Operator profile" },
  { id: "ecosystem",    label: "Integrations & support" },
  { id: "faq",          label: "FAQ" },
  { id: "verdict",      label: "Verdict" },
];

/* ───── Page ─────────────────────────────────────────────────────────── */

const VsCompetitor: React.FC = () => {
  const { slug = "" } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const reduceMotion = useReducedMotion();
  const comp = useMemo(() => competitorBySlug(slug), [slug]);
  const [activeId, setActiveId] = useState<string>(TOC_ITEMS[0].id);

  /* ─ Per-page SEO injection ─ */
  useEffect(() => {
    if (!comp) return;

    const prevTitle = document.title;
    document.title = comp.metaTitle;

    const upsert = (selector: string, attr: "name" | "property", key: string, value: string) => {
      let el = document.head.querySelector<HTMLMetaElement>(selector);
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute(attr, key);
        document.head.appendChild(el);
      }
      el.setAttribute("content", value);
      return el;
    };

    const description = comp.metaDescription;
    const keywords = [...comp.keywords, ...comp.longTailKeywords].join(", ");

    const created = [
      upsert(`meta[name="description"]`,        "name",     "description",        description),
      upsert(`meta[name="keywords"]`,           "name",     "keywords",           keywords),
      upsert(`meta[property="og:title"]`,       "property", "og:title",           comp.metaTitle),
      upsert(`meta[property="og:description"]`, "property", "og:description",     description),
      upsert(`meta[property="og:type"]`,        "property", "og:type",            "article"),
      upsert(`meta[property="og:url"]`,         "property", "og:url",             `https://www.cuetronix.com/vs/${comp.slug}`),
      upsert(`meta[property="og:image"]`,       "property", "og:image",           "https://www.cuetronix.com/og-image.png"),
      upsert(`meta[name="twitter:card"]`,       "name",     "twitter:card",       "summary_large_image"),
      upsert(`meta[name="twitter:title"]`,      "name",     "twitter:title",      comp.metaTitle),
      upsert(`meta[name="twitter:description"]`,"name",     "twitter:description", description),
      upsert(`meta[name="twitter:image"]`,      "name",     "twitter:image",      "https://www.cuetronix.com/og-image.png"),
      upsert(`meta[name="robots"]`,             "name",     "robots",             "index, follow, max-snippet:-1, max-image-preview:large"),
      upsert(`meta[name="author"]`,             "name",     "author",             "Cuephoria Tech"),
    ];

    const canonicalUrl = `https://www.cuetronix.com/vs/${comp.slug}`;
    let canonicalLink = document.head.querySelector<HTMLLinkElement>(`link[rel="canonical"]`);
    if (!canonicalLink) {
      canonicalLink = document.createElement("link");
      canonicalLink.rel = "canonical";
      document.head.appendChild(canonicalLink);
    }
    const previousCanonical = canonicalLink.href;
    canonicalLink.href = canonicalUrl;

    const jsonLd = document.createElement("script");
    jsonLd.type = "application/ld+json";
    jsonLd.setAttribute("data-vs-slug", comp.slug);
    jsonLd.text = JSON.stringify([
      {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": [
          { "@type": "ListItem", "position": 1, "name": "Home",    "item": "https://www.cuetronix.com/" },
          { "@type": "ListItem", "position": 2, "name": "Compare", "item": "https://www.cuetronix.com/compare" },
          { "@type": "ListItem", "position": 3, "name": `Cuetronix vs ${comp.name}`, "item": canonicalUrl },
        ],
      },
      {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "mainEntity": comp.faqs.map((f) => ({
          "@type": "Question",
          "name": f.q,
          "acceptedAnswer": { "@type": "Answer", "text": f.a },
        })),
      },
      {
        "@context": "https://schema.org",
        "@type": "HowTo",
        "name": `How to switch from ${comp.name} to Cuetronix`,
        "description": `Migrate your venue operations from ${comp.name} to Cuetronix in ${comp.migration.duration}.`,
        "totalTime": `P${comp.migration.duration.replace(/\D/g, "") || "7"}D`,
        "step": comp.migration.steps.map((s, i) => ({
          "@type": "HowToStep",
          "position": i + 1,
          "name": s.title,
          "text": s.description,
        })),
      },
      {
        "@context": "https://schema.org",
        "@type": "SoftwareApplication",
        "name": "Cuetronix",
        "operatingSystem": "Web, iOS, Android",
        "applicationCategory": "BusinessApplication",
        "url": "https://www.cuetronix.com/",
        "offers": {
          "@type": "Offer",
          "price": "999",
          "priceCurrency": "INR",
          "availability": "https://schema.org/InStock",
        },
        "publisher": {
          "@type": "Organization",
          "name": "Cuephoria Tech",
          "url": "https://cuephoriatech.in",
        },
      },
      {
        "@context": "https://schema.org",
        "@type": "WebPage",
        "name": comp.metaTitle,
        "description": description,
        "url": canonicalUrl,
        "inLanguage": "en",
        "isPartOf": { "@type": "WebSite", "@id": "https://www.cuetronix.com/#website" },
        "about": [
          { "@type": "SoftwareApplication", "name": "Cuetronix", "url": "https://www.cuetronix.com/" },
          { "@type": "SoftwareApplication", "name": comp.name,    "url": comp.website },
        ],
      },
    ]);
    document.head.appendChild(jsonLd);

    /* Scroll-spy TOC */
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible[0]) setActiveId(visible[0].target.id);
      },
      { rootMargin: "-40% 0% -50% 0%", threshold: [0, 0.25, 0.5, 0.75, 1] },
    );
    TOC_ITEMS.forEach((t) => {
      const el = document.getElementById(t.id);
      if (el) observer.observe(el);
    });

    return () => {
      observer.disconnect();
      document.title = prevTitle;
      canonicalLink!.href = previousCanonical || "https://www.cuetronix.com/";
      created.forEach((el) => el?.remove());
      jsonLd.remove();
    };
  }, [comp]);

  if (!comp) {
    return (
      <div className="relative min-h-screen bg-[#07030f] text-white flex flex-col items-center justify-center px-6">
        <h1 className="text-3xl font-extrabold mb-4">Comparison not found</h1>
        <p className="text-gray-400 mb-8 max-w-md text-center">
          We couldn't find a comparison page for "{slug}". Browse all Cuetronix comparisons on the compare hub.
        </p>
        <Button
          onClick={() => navigate("/compare")}
          className="bg-gradient-to-r from-violet-600 via-fuchsia-600 to-pink-600"
        >
          See all comparisons <ArrowRight size={16} className="ml-2" />
        </Button>
      </div>
    );
  }

  const grouped = groupByCategory(comp.features);
  const score = scoreFeatures(comp.features);
  const otherComparisons = competitors.filter((c) => c.slug !== comp.slug).slice(0, 6);

  const DIFFICULTY_COPY = {
    easy:   { label: "Easy migration",   accent: "from-emerald-500/30 to-emerald-500/10", dot: "bg-emerald-400" },
    medium: { label: "Moderate migration", accent: "from-amber-500/30 to-amber-500/10",    dot: "bg-amber-400" },
    hard:   { label: "Complex migration", accent: "from-rose-500/30 to-rose-500/10",       dot: "bg-rose-400" },
  }[comp.migration.difficulty];

  return (
    <div className="relative min-h-screen bg-[#07030f] text-white antialiased selection:bg-violet-500/40 selection:text-white">
      <SiteAmbientBackground parallax />

      {/* noscript fallback for crawlers that don't render JS */}
      <noscript>
        <div className="p-8 text-white">
          <h1>Cuetronix vs {comp.name} — {comp.headline}</h1>
          <p>{comp.deck}</p>
          <p>{comp.tldr}</p>
        </div>
      </noscript>

      <div className="relative z-10">
        <Header />

        <main className="pt-32 sm:pt-36 pb-24">
          {/* Back link */}
          <div className="max-w-7xl mx-auto px-5 sm:px-8 mb-6">
            <Link
              to="/compare"
              className="inline-flex items-center gap-2 text-sm text-white/60 hover:text-white transition-colors"
            >
              <ArrowLeft size={14} /> All comparisons
            </Link>
          </div>

          {/* ─── HERO ─── */}
          <section id="at-a-glance" className="max-w-7xl mx-auto px-5 sm:px-8 scroll-mt-32">
            <motion.div
              initial={reduceMotion ? false : { opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7 }}
              className="glass-card p-8 sm:p-12 relative overflow-hidden"
            >
              {/* ambient brand orb */}
              <div
                className="pointer-events-none absolute -top-40 -right-40 h-96 w-96 rounded-full opacity-50 blur-3xl"
                style={{ background: `radial-gradient(circle, ${comp.brandColor}33 0%, transparent 70%)` }}
              />
              <div
                className="pointer-events-none absolute -bottom-40 -left-40 h-96 w-96 rounded-full opacity-40 blur-3xl"
                style={{ background: `radial-gradient(circle, #B4408Cff 0%, transparent 70%)` }}
              />

              <div className="relative">
                <div className="flex flex-wrap items-center gap-3 mb-6">
                  <div className="inline-flex items-center gap-2 rounded-full border border-fuchsia-300/25 bg-fuchsia-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-fuchsia-200">
                    <Sparkles size={11} /> {comp.category} · 2026
                  </div>
                  <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-white/70">
                    <Globe2 size={11} /> {comp.region}
                  </div>
                  {comp.stats.publicRating && (
                    <div className="inline-flex items-center gap-2 rounded-full border border-amber-300/25 bg-amber-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-amber-200">
                      <Award size={11} /> {comp.stats.publicRating.score}/{comp.stats.publicRating.max} · {comp.stats.publicRating.source}
                    </div>
                  )}
                </div>

                <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold leading-[1.05] tracking-[-0.02em]">
                  <span className="bg-gradient-to-r from-violet-300 via-fuchsia-300 to-pink-300 bg-clip-text text-transparent">Cuetronix</span>
                  <span className="text-white/30"> vs </span>
                  <span className="text-white">{comp.name}</span>
                </h1>

                <p className="mt-5 text-xl sm:text-2xl text-white font-semibold max-w-3xl">
                  {comp.headline}
                </p>
                <p className="mt-4 max-w-3xl text-gray-300 text-base sm:text-lg leading-relaxed">
                  {comp.deck}
                </p>

                {/* Brand badges side-by-side */}
                <div className="mt-10 grid sm:grid-cols-2 gap-4">
                  <div className="theme-inset p-5 flex items-center gap-4">
                    <BrandBadge mark="Cu" color="#A855F7" name="Cuetronix" size="lg" />
                    <div className="ml-auto text-right">
                      <div className="text-[11px] uppercase tracking-[0.2em] text-violet-200/70">All-in-one venue OS</div>
                      <div className="text-sm text-white/80 mt-1">Since 2024 · Cuephoria Tech</div>
                    </div>
                  </div>
                  <div className="theme-inset p-5 flex items-center gap-4">
                    <BrandBadge mark={comp.brandMark} color={comp.brandColor} name={comp.name} size="lg" />
                    <div className="ml-auto text-right">
                      <div className="text-[11px] uppercase tracking-[0.2em] text-white/50">{comp.category}</div>
                      <div className="text-sm text-white/70 mt-1">Since {comp.stats.foundedYear} · {comp.stats.hqCountry}</div>
                    </div>
                  </div>
                </div>

                {/* Stats grid */}
                <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <StatTile label="Founded"  value={String(comp.stats.foundedYear)} icon={Clock}    accent="violet" />
                  <StatTile label="HQ"       value={comp.stats.hqCountry}           icon={Globe2}   accent="blue" />
                  {comp.stats.employees && (
                    <StatTile label="Team size" value={comp.stats.employees} icon={Users} accent="pink" />
                  )}
                  {comp.stats.customerEstimate && (
                    <StatTile label="Customers" value={comp.stats.customerEstimate} icon={TrendingUp} accent="emerald" />
                  )}
                </div>

                <div className="mt-10 flex flex-col sm:flex-row gap-3">
                  <Button
                    size="lg"
                    onClick={() => navigate("/signup")}
                    className="bg-gradient-to-r from-violet-600 via-fuchsia-600 to-pink-600 hover:opacity-95 text-white text-base px-8 h-14 font-bold shadow-2xl shadow-fuchsia-600/40 rounded-xl"
                  >
                    Start 14-day free trial <ArrowRight size={18} className="ml-2" />
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    onClick={() => navigate("/contact")}
                    className="border-white/15 bg-white/[0.05] text-white hover:bg-white/[0.1] text-base px-8 h-14 rounded-xl backdrop-blur-md"
                  >
                    Book an operator demo
                  </Button>
                </div>
              </div>
            </motion.div>
          </section>

          {/* ─── Layout: TOC + content ─── */}
          <div className="max-w-7xl mx-auto px-5 sm:px-8 mt-12 grid lg:grid-cols-[220px_1fr] gap-10">
            {/* Sticky TOC (desktop) */}
            <aside className="hidden lg:block">
              <div className="sticky top-28 theme-inset p-5">
                <div className="text-[11px] uppercase tracking-[0.22em] text-violet-200/70 mb-3 font-semibold">On this page</div>
                <nav className="space-y-1">
                  {TOC_ITEMS.map((item) => (
                    <a
                      key={item.id}
                      href={`#${item.id}`}
                      className={`block text-sm py-1.5 pl-3 border-l-2 transition-colors ${
                        activeId === item.id
                          ? "border-fuchsia-400 text-white font-semibold"
                          : "border-white/10 text-white/55 hover:text-white hover:border-white/30"
                      }`}
                    >
                      {item.label}
                    </a>
                  ))}
                </nav>
              </div>
            </aside>

            <div className="min-w-0 space-y-16">
              {/* ─── FEATURE COVERAGE ─── */}
              <section id="coverage" className="scroll-mt-32">
                <SectionHeading
                  kicker="At a glance"
                  title={`Feature coverage: Cuetronix vs ${comp.name}`}
                  subtitle={`Of the ${score.total} operator-grade features analysed, here's how each product delivers.`}
                />
                <div className="surface-panel p-6 sm:p-10 grid sm:grid-cols-[1fr_auto_1fr] gap-6 items-center">
                  <CoverageDonut
                    label="Cuetronix"
                    value={score.cuetronix}
                    total={score.total}
                    color="#D946EF"
                    accent="rgba(217,70,239,0.45)"
                  />
                  <div className="flex flex-col items-center gap-2">
                    <Trophy size={28} className="text-fuchsia-300/80" />
                    <div className="text-[11px] uppercase tracking-[0.22em] text-white/50">head-to-head</div>
                  </div>
                  <CoverageDonut
                    label={comp.name}
                    value={score.competitor}
                    total={score.total}
                    color={comp.brandColor}
                    accent={`${comp.brandColor}66`}
                  />
                </div>
              </section>

              {/* ─── PRICING ─── */}
              <section id="pricing" className="scroll-mt-32">
                <SectionHeading
                  kicker="Pricing"
                  title="What each one costs"
                  subtitle="Pricing models compared honestly — including the total cost of ownership, not just the sticker price."
                />
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="glass-card p-6">
                    <div className="text-[11px] uppercase tracking-[0.22em] text-violet-200/70 mb-2">Cuetronix</div>
                    <div className="text-2xl font-extrabold text-white">{comp.pricing.cuetronix}</div>
                    <p className="text-sm text-gray-400 mt-3">
                      Flat SaaS fee for the whole venue. 0% booking commission on your own portal. 14-day free trial, no card required.
                    </p>
                  </div>
                  <div className="theme-inset p-6">
                    <div className="text-[11px] uppercase tracking-[0.22em] text-white/50 mb-2">{comp.name}</div>
                    <div className="text-2xl font-extrabold text-white/80">{comp.pricing.competitor}</div>
                    {comp.pricing.note && <p className="text-sm text-gray-400 mt-3">{comp.pricing.note}</p>}
                  </div>
                </div>
              </section>

              {/* ─── STRENGTHS & LIMITATIONS ─── */}
              <section id="analysis" className="scroll-mt-32">
                <SectionHeading
                  kicker="Honest analysis"
                  title={`Where ${comp.name} shines and where it falls short`}
                  subtitle="We don't believe in disparaging competitors. Here's an honest, balanced read."
                />
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="glass-card p-6 sm:p-7">
                    <div className="flex items-center gap-2 mb-4">
                      <CheckCircle2 size={18} className="text-emerald-300" />
                      <h3 className="text-base font-bold text-emerald-200 uppercase tracking-[0.14em]">{comp.name} strengths</h3>
                    </div>
                    <ul className="space-y-3">
                      {comp.strengths.map((s) => (
                        <li key={s} className="flex gap-3 text-sm text-gray-200 leading-relaxed">
                          <Check size={16} className="text-emerald-300 mt-0.5 flex-shrink-0" />
                          <span>{s}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="theme-inset p-6 sm:p-7">
                    <div className="flex items-center gap-2 mb-4">
                      <Target size={18} className="text-amber-300" />
                      <h3 className="text-base font-bold text-amber-200 uppercase tracking-[0.14em]">Gaps vs a full venue OS</h3>
                    </div>
                    <ul className="space-y-3">
                      {comp.limitations.map((l) => (
                        <li key={l} className="flex gap-3 text-sm text-gray-200 leading-relaxed">
                          <Minus size={16} className="text-amber-300 mt-0.5 flex-shrink-0" />
                          <span>{l}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </section>

              {/* ─── CUETRONIX ADVANTAGES ─── */}
              <section id="advantages" className="scroll-mt-32">
                <SectionHeading
                  kicker="Why Cuetronix wins"
                  title={`Six reasons operators pick Cuetronix over ${comp.name}`}
                  subtitle="The concrete, not-marketing reasons our customers say they moved."
                />
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {comp.cuetronixAdvantages.map((a, i) => {
                    const Icon = ADVANTAGE_ICON[a.icon] ?? Sparkles;
                    return (
                      <motion.div
                        key={a.title}
                        initial={reduceMotion ? false : { opacity: 0, y: 16 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, margin: "-80px" }}
                        transition={{ duration: 0.5, delay: i * 0.05 }}
                        className="glass-card glass-card-interactive p-6 flex flex-col"
                      >
                        <div className="flex items-center gap-3 mb-3">
                          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-violet-500/30 to-fuchsia-500/20 border border-fuchsia-300/20 flex items-center justify-center">
                            <Icon size={18} className="text-fuchsia-200" />
                          </div>
                          <h3 className="text-base font-bold text-white leading-tight">{a.title}</h3>
                        </div>
                        <p className="text-sm text-gray-300 leading-relaxed flex-1">{a.description}</p>
                        {a.proof && (
                          <div className="mt-4 pt-4 border-t border-white/8 text-[12px] font-semibold text-emerald-200/90">
                            → {a.proof}
                          </div>
                        )}
                      </motion.div>
                    );
                  })}
                </div>
              </section>

              {/* ─── FEATURE MATRIX ─── */}
              <section id="features" className="scroll-mt-32">
                <SectionHeading
                  kicker="Feature matrix"
                  title="Feature-by-feature, category-by-category"
                  subtitle="Every row is scored from the operator's perspective — what you can actually do out of the box."
                />
                <div className="space-y-5">
                  {grouped.map(([cat, rows]) => (
                    <div key={cat} className="glass-card overflow-hidden">
                      <div className="px-5 sm:px-6 py-3 border-b border-white/10 bg-white/[0.02] flex items-center justify-between">
                        <div className="text-[11px] uppercase tracking-[0.22em] text-violet-200/70 font-semibold">{cat}</div>
                        <div className="text-xs text-white/40">{rows.length} {rows.length === 1 ? "feature" : "features"}</div>
                      </div>
                      <div className="divide-y divide-white/5">
                        {rows.map((r) => (
                          <div key={r.name} className="grid grid-cols-1 sm:grid-cols-[1.4fr_1fr_1fr] gap-3 px-5 sm:px-6 py-4">
                            <div>
                              <div className="text-sm text-white font-medium">{r.name}</div>
                              {r.note && <div className="text-[12px] text-white/50 mt-0.5 italic">{r.note}</div>}
                            </div>
                            <div className="sm:pl-3 sm:border-l sm:border-white/5">
                              <div className="text-[11px] uppercase tracking-[0.18em] text-violet-200/70 mb-1 sm:hidden">Cuetronix</div>
                              {renderCell(r.cuetronix)}
                            </div>
                            <div className="sm:pl-3 sm:border-l sm:border-white/5">
                              <div className="text-[11px] uppercase tracking-[0.18em] text-white/50 mb-1 sm:hidden">{comp.name}</div>
                              {renderCell(r.competitor)}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* ─── MIGRATION ─── */}
              <section id="migration" className="scroll-mt-32">
                <SectionHeading
                  kicker="How to switch"
                  title={`Migrating from ${comp.name} to Cuetronix`}
                  subtitle="A step-by-step plan used by real operators — done in a few working days with no downtime."
                />

                <div className="glass-card p-6 sm:p-8">
                  <div className="flex flex-wrap items-center gap-3 mb-6">
                    <div className={`inline-flex items-center gap-2 rounded-full border border-white/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.22em] text-white bg-gradient-to-r ${DIFFICULTY_COPY.accent}`}>
                      <span className={`h-2 w-2 rounded-full ${DIFFICULTY_COPY.dot}`} />
                      {DIFFICULTY_COPY.label}
                    </div>
                    <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.22em] text-white/80">
                      <Clock size={11} /> Takes {comp.migration.duration}
                    </div>
                    <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.22em] text-white/80">
                      <UserCheck size={11} /> Dedicated onboarding manager
                    </div>
                  </div>

                  <ol className="relative border-l-2 border-white/8 pl-6 space-y-6 ml-3">
                    {comp.migration.steps.map((s, i) => (
                      <li key={s.title} className="relative">
                        <div className="absolute -left-[33px] top-0 h-8 w-8 rounded-full bg-gradient-to-br from-violet-500 via-fuchsia-500 to-pink-500 text-white font-extrabold text-sm flex items-center justify-center shadow-lg shadow-fuchsia-600/30">
                          {i + 1}
                        </div>
                        <div className="pb-1">
                          <h4 className="text-base font-bold text-white">{s.title}</h4>
                          <p className="text-sm text-gray-300 mt-1 leading-relaxed">{s.description}</p>
                        </div>
                      </li>
                    ))}
                  </ol>
                </div>
              </section>

              {/* ─── OPERATOR PROFILE ─── */}
              <section id="operator" className="scroll-mt-32">
                <SectionHeading
                  kicker="Operator profile"
                  title={comp.operatorProfile.headline}
                  subtitle={comp.operatorProfile.venueType}
                />
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="theme-inset p-6 sm:p-7">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="h-2 w-2 rounded-full bg-rose-400" />
                      <h3 className="text-[11px] font-bold text-rose-200/90 uppercase tracking-[0.22em]">Before Cuetronix</h3>
                    </div>
                    <ul className="space-y-3">
                      {comp.operatorProfile.before.map((b) => (
                        <li key={b} className="flex gap-3 text-sm text-gray-300 leading-relaxed">
                          <X size={15} className="text-rose-400/80 mt-0.5 flex-shrink-0" />
                          <span>{b}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="glass-card p-6 sm:p-7">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="h-2 w-2 rounded-full bg-emerald-400" />
                      <h3 className="text-[11px] font-bold text-emerald-200 uppercase tracking-[0.22em]">After Cuetronix</h3>
                    </div>
                    <ul className="space-y-3">
                      {comp.operatorProfile.after.map((a) => (
                        <li key={a} className="flex gap-3 text-sm text-gray-200 leading-relaxed">
                          <Check size={15} className="text-emerald-300 mt-0.5 flex-shrink-0" />
                          <span>{a}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </section>

              {/* ─── ECOSYSTEM ─── */}
              <section id="ecosystem" className="scroll-mt-32">
                <SectionHeading
                  kicker="Ecosystem"
                  title="Integrations & support you get with Cuetronix"
                  subtitle="Everything that plugs in around your venue — already configured on day one."
                />
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="glass-card p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <Workflow size={16} className="text-fuchsia-300" />
                      <h3 className="text-[11px] font-bold text-fuchsia-200 uppercase tracking-[0.22em]">Integrations</h3>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {comp.integrations.map((int) => (
                        <span
                          key={int}
                          className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs text-white/80"
                        >
                          <Zap size={11} className="text-fuchsia-300/70" />
                          {int}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="glass-card p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <LifeBuoy size={16} className="text-violet-300" />
                      <h3 className="text-[11px] font-bold text-violet-200 uppercase tracking-[0.22em]">Support & languages</h3>
                    </div>
                    <div className="space-y-3 text-sm">
                      <div>
                        <div className="text-[11px] uppercase tracking-[0.18em] text-white/45 mb-1">Channels</div>
                        <div className="text-white/90">{comp.support.channels.join(" · ")}</div>
                      </div>
                      <div>
                        <div className="text-[11px] uppercase tracking-[0.18em] text-white/45 mb-1">SLA</div>
                        <div className="text-white/90">{comp.support.sla}</div>
                      </div>
                      <div>
                        <div className="text-[11px] uppercase tracking-[0.18em] text-white/45 mb-1">Languages</div>
                        <div className="text-white/90">{comp.support.languages.join(" · ")}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              {/* ─── Pick Cuetronix if / Pick Competitor if ─── */}
              <section>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="glass-card p-6 sm:p-7">
                    <div className="text-[11px] uppercase tracking-[0.22em] text-violet-200/70 mb-3 font-semibold">Pick Cuetronix if…</div>
                    <ul className="space-y-2">
                      {comp.whenToPickCuetronix.map((r) => (
                        <li key={r} className="flex gap-2 text-sm text-gray-200">
                          <Check size={14} className="text-emerald-300 mt-0.5 flex-shrink-0" />
                          <span>{r}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="theme-inset p-6 sm:p-7">
                    <div className="text-[11px] uppercase tracking-[0.22em] text-white/50 mb-3 font-semibold">Pick {comp.name} if…</div>
                    <ul className="space-y-2">
                      {comp.whenToPickCompetitor.map((r) => (
                        <li key={r} className="flex gap-2 text-sm text-gray-300">
                          <Minus size={14} className="text-white/40 mt-0.5 flex-shrink-0" />
                          <span>{r}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </section>

              {/* ─── FAQ ─── */}
              <section id="faq" className="scroll-mt-32">
                <SectionHeading
                  kicker="Questions we hear"
                  title={`Cuetronix vs ${comp.name} — Frequently asked`}
                  subtitle="Real questions from operators evaluating a switch."
                />
                <div className="space-y-3">
                  {comp.faqs.map((f) => (
                    <details
                      key={f.q}
                      className="theme-inset group px-5 py-4 open:bg-white/[0.04]"
                    >
                      <summary className="cursor-pointer list-none flex items-center justify-between gap-4 text-base font-semibold text-white">
                        <span>{f.q}</span>
                        <ChevronDown size={18} className="text-white/40 group-open:rotate-180 transition-transform flex-shrink-0" />
                      </summary>
                      <p className="mt-3 text-sm text-gray-300 leading-relaxed">{f.a}</p>
                    </details>
                  ))}
                </div>
              </section>

              {/* ─── VERDICT ─── */}
              <section id="verdict" className="scroll-mt-32">
                <div className="glass-card p-8 sm:p-10 text-center relative overflow-hidden">
                  <div
                    className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 h-80 w-80 rounded-full opacity-30 blur-3xl"
                    style={{ background: "radial-gradient(circle, #D946EF 0%, transparent 70%)" }}
                  />
                  <div className="relative">
                    <div className="inline-flex items-center gap-2 rounded-full border border-amber-300/25 bg-amber-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-amber-200 mb-5">
                      <Trophy size={11} /> The verdict
                    </div>
                    <Quote size={24} className="text-fuchsia-300/40 mx-auto mb-4" />
                    <p className="text-xl sm:text-2xl text-white font-semibold leading-relaxed max-w-3xl mx-auto">
                      {comp.verdict}
                    </p>
                    <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
                      <Button
                        size="lg"
                        onClick={() => navigate("/signup")}
                        className="bg-gradient-to-r from-violet-600 via-fuchsia-600 to-pink-600 text-white px-8 h-14 font-bold shadow-2xl shadow-fuchsia-600/40 rounded-xl"
                      >
                        Try Cuetronix free for 14 days <ArrowRight size={18} className="ml-2" />
                      </Button>
                      <Button
                        size="lg"
                        variant="outline"
                        onClick={() => navigate("/contact")}
                        className="border-white/15 bg-white/[0.05] text-white hover:bg-white/[0.1] text-base px-8 h-14 rounded-xl"
                      >
                        Talk to our team
                      </Button>
                    </div>
                  </div>
                </div>
              </section>

              {/* ─── Long-tail keyword cluster (crawlable) ─── */}
              <section>
                <div className="text-[11px] uppercase tracking-[0.22em] text-white/40 mb-3 font-semibold">Also searched for</div>
                <div className="flex flex-wrap gap-2">
                  {comp.longTailKeywords.map((kw) => (
                    <Link
                      key={kw}
                      to={`/vs/${comp.slug}`}
                      className="inline-block rounded-full border border-white/8 bg-white/[0.02] px-3 py-1.5 text-xs text-white/60 hover:text-fuchsia-200 hover:border-fuchsia-300/30 transition-colors"
                    >
                      {kw}
                    </Link>
                  ))}
                </div>
              </section>

              {/* ─── Related comparisons ─── */}
              <section>
                <SectionHeading
                  kicker="Keep exploring"
                  title="More Cuetronix comparisons"
                  subtitle="Curious how Cuetronix stacks up against other tools?"
                />
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {otherComparisons.map((c) => (
                    <Link
                      key={c.slug}
                      to={`/vs/${c.slug}`}
                      className="theme-inset p-5 block group hover:bg-white/[0.05] transition-colors"
                    >
                      <div className="flex items-start gap-3 mb-2">
                        <BrandBadge mark={c.brandMark} color={c.brandColor} name="" />
                        <div className="min-w-0">
                          <div className="text-[11px] uppercase tracking-[0.18em] text-violet-200/70 mb-0.5">{c.category}</div>
                          <div className="text-base font-semibold text-white group-hover:text-fuchsia-200 transition-colors leading-tight">
                            vs {c.name}
                          </div>
                        </div>
                      </div>
                      <div className="text-sm text-gray-400 line-clamp-2">{c.oneLiner}</div>
                    </Link>
                  ))}
                </div>
              </section>
            </div>
          </div>
        </main>

        <Footer />
      </div>
    </div>
  );
};

/* ───── Sub-components ───────────────────────────────────────────────── */

const SectionHeading: React.FC<{ kicker: string; title: string; subtitle?: string }> = ({
  kicker,
  title,
  subtitle,
}) => (
  <div className="mb-6 sm:mb-8">
    <div className="text-[11px] uppercase tracking-[0.22em] text-fuchsia-300/80 font-semibold mb-2">{kicker}</div>
    <h2 className="text-2xl sm:text-3xl md:text-[2.25rem] font-extrabold tracking-[-0.02em] leading-tight">
      {title}
    </h2>
    {subtitle && <p className="mt-2 text-gray-400 text-base max-w-3xl">{subtitle}</p>}
  </div>
);

const StatTile: React.FC<{
  label: string;
  value: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  accent: "violet" | "blue" | "pink" | "emerald";
}> = ({ label, value, icon: Icon, accent }) => {
  const colorCls = {
    violet:  "text-violet-300",
    blue:    "text-blue-300",
    pink:    "text-pink-300",
    emerald: "text-emerald-300",
  }[accent];
  return (
    <div className="theme-inset p-3 sm:p-4">
      <div className="flex items-center gap-2 mb-1">
        <Icon size={12} className={colorCls} />
        <div className="text-[10px] uppercase tracking-[0.22em] text-white/45 font-semibold">{label}</div>
      </div>
      <div className="text-sm sm:text-base font-bold text-white leading-tight">{value}</div>
    </div>
  );
};

export default VsCompetitor;
