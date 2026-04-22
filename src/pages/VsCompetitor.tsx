import { useEffect, useMemo } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Minus,
  Sparkles,
  Trophy,
  X,
} from "lucide-react";

import Header from "@/components/landing/Header";
import Footer from "@/components/landing/Footer";
import SiteAmbientBackground from "@/components/landing/SiteAmbientBackground";
import { Button } from "@/components/ui/button";
import {
  competitors,
  competitorBySlug,
  type CompetitorFeature,
  type FeatureCell,
} from "@/data/competitors";

/* ─── Helpers ───────────────────────────────────────────────────────── */

const CELL_ICON = {
  yes:     <Check size={16} className="text-emerald-300" />,
  no:      <X size={16} className="text-rose-400/80" />,
  partial: <Minus size={16} className="text-amber-300" />,
};

function renderCell(v: FeatureCell) {
  if (v === true)  return <span className="inline-flex items-center gap-1.5 text-sm text-emerald-200/90 font-medium">{CELL_ICON.yes} Included</span>;
  if (v === false) return <span className="inline-flex items-center gap-1.5 text-sm text-rose-300/80">{CELL_ICON.no} Not included</span>;
  if (v === "partial") return <span className="inline-flex items-center gap-1.5 text-sm text-amber-200/90">{CELL_ICON.partial} Partial / add-on</span>;
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

/* ─── Page ──────────────────────────────────────────────────────────── */

const VsCompetitor: React.FC = () => {
  const { slug = "" } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const reduceMotion = useReducedMotion();
  const comp = useMemo(() => competitorBySlug(slug), [slug]);

  /* ─ Inject per-page SEO (title, description, canonical, JSON-LD) ─ */
  useEffect(() => {
    if (!comp) return;

    const prevTitle = document.title;
    document.title = comp.metaTitle;

    const upsertMeta = (selector: string, attr: "name" | "property", key: string, value: string) => {
      let el = document.head.querySelector<HTMLMetaElement>(selector);
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute(attr, key);
        document.head.appendChild(el);
      }
      el.setAttribute("content", value);
      return el;
    };

    const descMeta     = upsertMeta(`meta[name="description"]`,      "name",     "description",     comp.metaDescription);
    const kwMeta       = upsertMeta(`meta[name="keywords"]`,         "name",     "keywords",        comp.keywords.join(", "));
    const ogTitleMeta  = upsertMeta(`meta[property="og:title"]`,     "property", "og:title",        comp.metaTitle);
    const ogDescMeta   = upsertMeta(`meta[property="og:description"]`, "property", "og:description", comp.metaDescription);
    const twTitleMeta  = upsertMeta(`meta[name="twitter:title"]`,    "name",     "twitter:title",   comp.metaTitle);
    const twDescMeta   = upsertMeta(`meta[name="twitter:description"]`, "name",  "twitter:description", comp.metaDescription);

    const canonicalUrl = `https://www.cuetronix.com/vs/${comp.slug}`;
    let canonicalLink = document.head.querySelector<HTMLLinkElement>(`link[rel="canonical"]`);
    if (!canonicalLink) {
      canonicalLink = document.createElement("link");
      canonicalLink.rel = "canonical";
      document.head.appendChild(canonicalLink);
    }
    const previousCanonical = canonicalLink.href;
    canonicalLink.href = canonicalUrl;

    // JSON-LD — FAQ + BreadcrumbList + ComparisonProduct
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
        "@type": "WebPage",
        "name": comp.metaTitle,
        "description": comp.metaDescription,
        "url": canonicalUrl,
        "isPartOf": { "@type": "WebSite", "@id": "https://www.cuetronix.com/#website" },
        "about": [
          { "@type": "SoftwareApplication", "name": "Cuetronix", "url": "https://www.cuetronix.com/" },
          { "@type": "SoftwareApplication", "name": comp.name,    "url": comp.website },
        ],
      },
    ]);
    document.head.appendChild(jsonLd);

    return () => {
      document.title = prevTitle;
      canonicalLink!.href = previousCanonical || "https://www.cuetronix.com/";
      descMeta?.remove();
      kwMeta?.remove();
      ogTitleMeta?.remove();
      ogDescMeta?.remove();
      twTitleMeta?.remove();
      twDescMeta?.remove();
      jsonLd.remove();
    };
  }, [comp]);

  if (!comp) {
    return (
      <div className="relative min-h-screen bg-[#07030f] text-white flex flex-col items-center justify-center px-6">
        <h1 className="text-3xl font-extrabold mb-4">Comparison not found</h1>
        <p className="text-gray-400 mb-8 max-w-md text-center">
          We couldn't find a comparison page for "{slug}". Browse all Cuetronix
          comparisons on the compare hub.
        </p>
        <Button onClick={() => navigate("/compare")} className="bg-gradient-to-r from-violet-600 via-fuchsia-600 to-pink-600">
          See all comparisons <ArrowRight size={16} className="ml-2" />
        </Button>
      </div>
    );
  }

  const grouped = groupByCategory(comp.features);
  const score = scoreFeatures(comp.features);
  const otherComparisons = competitors.filter((c) => c.slug !== comp.slug).slice(0, 5);

  return (
    <div className="relative min-h-screen bg-[#07030f] text-white antialiased selection:bg-violet-500/40 selection:text-white">
      <SiteAmbientBackground parallax />
      <div className="relative z-10">
        <Header />

        <main className="pt-32 sm:pt-36 pb-24">
          {/* ─ Back link ─ */}
          <div className="max-w-6xl mx-auto px-5 sm:px-8 mb-6">
            <Link
              to="/compare"
              className="inline-flex items-center gap-2 text-sm text-white/60 hover:text-white transition-colors"
            >
              <ArrowLeft size={14} /> All comparisons
            </Link>
          </div>

          {/* ─── Hero ─── */}
          <section className="max-w-6xl mx-auto px-5 sm:px-8">
            <motion.div
              initial={reduceMotion ? false : { opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7 }}
              className="glass-card p-8 sm:p-12 text-center"
            >
              <div className="inline-flex items-center gap-2 rounded-full border border-fuchsia-300/25 bg-fuchsia-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-fuchsia-200 mb-5">
                <Sparkles size={11} /> {comp.category} comparison · 2026
              </div>

              <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold leading-[1.05] tracking-[-0.02em]">
                <span className="bg-gradient-to-r from-violet-300 via-fuchsia-300 to-pink-300 bg-clip-text text-transparent">Cuetronix</span>
                <span className="text-white/40"> vs </span>
                <span className="text-white">{comp.name}</span>
              </h1>

              <p className="mt-5 max-w-3xl mx-auto text-gray-300 text-base sm:text-lg leading-relaxed">
                {comp.tldr}
              </p>

              {/* TL;DR cards */}
              <div className="mt-10 grid sm:grid-cols-2 gap-4 text-left">
                <div className="theme-inset p-5">
                  <div className="text-[11px] uppercase tracking-[0.18em] text-violet-200/70 mb-2">Pick Cuetronix if…</div>
                  <ul className="space-y-2">
                    {comp.whenToPickCuetronix.map((r) => (
                      <li key={r} className="flex gap-2 text-sm text-gray-200">
                        <Check size={14} className="text-emerald-300 mt-0.5 flex-shrink-0" />
                        <span>{r}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="theme-inset p-5">
                  <div className="text-[11px] uppercase tracking-[0.18em] text-white/50 mb-2">Pick {comp.name} if…</div>
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

              <div className="mt-10 flex flex-col sm:flex-row gap-3 justify-center items-stretch sm:items-center">
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
            </motion.div>
          </section>

          {/* ─── Score strip ─── */}
          <section className="max-w-6xl mx-auto px-5 sm:px-8 mt-10">
            <div className="surface-panel p-6 sm:p-8 grid sm:grid-cols-3 gap-6 items-center">
              <div className="text-center sm:text-left">
                <div className="text-[11px] uppercase tracking-[0.22em] text-violet-200/70 mb-2">Feature coverage</div>
                <div className="flex items-baseline gap-2 justify-center sm:justify-start">
                  <span className="text-4xl font-extrabold bg-gradient-to-r from-violet-300 via-fuchsia-300 to-pink-300 bg-clip-text text-transparent">
                    {score.cuetronix}
                  </span>
                  <span className="text-white/40 text-sm">/ {score.total}</span>
                </div>
                <div className="text-xs text-white/50 mt-1">Cuetronix</div>
              </div>
              <div className="hidden sm:flex items-center justify-center">
                <Trophy size={32} className="text-fuchsia-300/70" />
              </div>
              <div className="text-center sm:text-right">
                <div className="text-[11px] uppercase tracking-[0.22em] text-white/50 mb-2">Feature coverage</div>
                <div className="flex items-baseline gap-2 justify-center sm:justify-end">
                  <span className="text-4xl font-extrabold text-white/70">{score.competitor}</span>
                  <span className="text-white/40 text-sm">/ {score.total}</span>
                </div>
                <div className="text-xs text-white/50 mt-1">{comp.name}</div>
              </div>
            </div>
          </section>

          {/* ─── Pricing strip ─── */}
          <section id="pricing" className="max-w-6xl mx-auto px-5 sm:px-8 mt-12 scroll-mt-32">
            <h2 className="text-2xl sm:text-3xl font-extrabold mb-6 tracking-tight">Pricing at a glance</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="glass-card p-6">
                <div className="text-[11px] uppercase tracking-[0.22em] text-violet-200/70 mb-2">Cuetronix</div>
                <div className="text-2xl font-extrabold text-white">{comp.pricing.cuetronix}</div>
                <p className="text-sm text-gray-400 mt-2">Flat SaaS fee for the whole venue. 0% booking commission on your own portal. 14-day free trial, no card.</p>
              </div>
              <div className="theme-inset p-6">
                <div className="text-[11px] uppercase tracking-[0.22em] text-white/50 mb-2">{comp.name}</div>
                <div className="text-2xl font-extrabold text-white/80">{comp.pricing.competitor}</div>
                {comp.pricing.note && (
                  <p className="text-sm text-gray-400 mt-2">{comp.pricing.note}</p>
                )}
              </div>
            </div>
          </section>

          {/* ─── Feature table ─── */}
          <section id="features" className="max-w-6xl mx-auto px-5 sm:px-8 mt-16 scroll-mt-32">
            <h2 className="text-2xl sm:text-3xl font-extrabold mb-2 tracking-tight">
              Feature-by-feature comparison
            </h2>
            <p className="text-gray-400 mb-8 text-sm sm:text-base">
              Every row is scored from the operator's perspective — what you can actually do with each tool out of the box.
            </p>

            <div className="space-y-6">
              {grouped.map(([cat, rows]) => (
                <div key={cat} className="glass-card overflow-hidden">
                  <div className="px-5 sm:px-6 py-3 border-b border-white/10 bg-white/[0.02]">
                    <div className="text-[11px] uppercase tracking-[0.22em] text-violet-200/70 font-semibold">
                      {cat}
                    </div>
                  </div>
                  <div className="divide-y divide-white/5">
                    {rows.map((r) => (
                      <div
                        key={r.name}
                        className="grid grid-cols-1 sm:grid-cols-[1.4fr_1fr_1fr] gap-3 px-5 sm:px-6 py-4"
                      >
                        <div>
                          <div className="text-sm text-white font-medium">{r.name}</div>
                          {r.note && (
                            <div className="text-[12px] text-white/50 mt-0.5">{r.note}</div>
                          )}
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

          {/* ─── Fit cards ─── */}
          <section className="max-w-6xl mx-auto px-5 sm:px-8 mt-16">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="glass-card p-6 sm:p-8">
                <div className="text-[11px] uppercase tracking-[0.22em] text-violet-200/70 mb-3">Best fit for Cuetronix</div>
                <p className="text-gray-200 leading-relaxed">{comp.cuetronixBestFor}</p>
              </div>
              <div className="theme-inset p-6 sm:p-8">
                <div className="text-[11px] uppercase tracking-[0.22em] text-white/50 mb-3">Best fit for {comp.name}</div>
                <p className="text-gray-300 leading-relaxed">{comp.bestFor}</p>
              </div>
            </div>
          </section>

          {/* ─── FAQ ─── */}
          <section id="faq" className="max-w-4xl mx-auto px-5 sm:px-8 mt-20 scroll-mt-32">
            <h2 className="text-2xl sm:text-3xl font-extrabold mb-8 tracking-tight text-center">
              Frequently asked
            </h2>
            <div className="space-y-3">
              {comp.faqs.map((f) => (
                <details
                  key={f.q}
                  className="theme-inset group px-5 py-4 open:bg-white/[0.04]"
                >
                  <summary className="cursor-pointer list-none flex items-center justify-between gap-4 text-base font-semibold text-white">
                    {f.q}
                    <span className="text-white/40 group-open:rotate-45 transition-transform text-xl leading-none">+</span>
                  </summary>
                  <p className="mt-3 text-sm text-gray-300 leading-relaxed">{f.a}</p>
                </details>
              ))}
            </div>
          </section>

          {/* ─── Verdict ─── */}
          <section className="max-w-4xl mx-auto px-5 sm:px-8 mt-16">
            <div className="glass-card p-8 sm:p-10 text-center">
              <div className="inline-flex items-center gap-2 rounded-full border border-amber-300/25 bg-amber-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-amber-200 mb-5">
                <Trophy size={11} /> The verdict
              </div>
              <p className="text-xl sm:text-2xl text-white font-semibold leading-relaxed">
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
              </div>
            </div>
          </section>

          {/* ─── Other comparisons ─── */}
          <section className="max-w-6xl mx-auto px-5 sm:px-8 mt-20">
            <h2 className="text-xl font-bold mb-6 text-white/80">More Cuetronix comparisons</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {otherComparisons.map((c) => (
                <Link
                  key={c.slug}
                  to={`/vs/${c.slug}`}
                  className="theme-inset p-5 block group hover:bg-white/[0.05] transition-colors"
                >
                  <div className="text-[11px] uppercase tracking-[0.18em] text-violet-200/70 mb-1">{c.category}</div>
                  <div className="text-base font-semibold text-white group-hover:text-fuchsia-200 transition-colors">
                    Cuetronix vs {c.name}
                  </div>
                  <div className="text-sm text-gray-400 mt-1 line-clamp-2">{c.oneLiner}</div>
                </Link>
              ))}
            </div>
          </section>
        </main>

        <Footer />
      </div>
    </div>
  );
};

export default VsCompetitor;
