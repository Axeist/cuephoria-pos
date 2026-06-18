import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  Award,
  Flame,
  Globe2,
  Search,
  Sparkles,
  TrendingUp,
  Trophy,
  Users,
  Zap,
} from "lucide-react";

import Header from "@/components/landing/Header";
import Footer from "@/components/landing/Footer";
import SiteAmbientBackground from "@/components/landing/SiteAmbientBackground";
import { Button } from "@/components/ui/button";
import { competitors } from "@/data/competitors";

const FEATURED_SLUGS = ["gamebiller", "playo", "hudle", "ggleap"];

const BrandBadge: React.FC<{ mark: string; color: string }> = ({ mark, color }) => (
  <div
    className="h-11 w-11 shrink-0 rounded-xl flex items-center justify-center font-black text-white text-sm shadow-lg"
    style={{
      background: `linear-gradient(135deg, ${color}E6 0%, ${color}88 60%, rgba(15,10,30,0.85) 100%)`,
      border: `1px solid ${color}55`,
    }}
    aria-hidden="true"
  >
    {mark}
  </div>
);

const CompareHub: React.FC = () => {
  const navigate = useNavigate();
  const reduceMotion = useReducedMotion();
  const [filter, setFilter] = useState<string>("all");
  const [query, setQuery] = useState<string>("");

  /* Categories (dynamic) + "all" */
  const categories = useMemo(() => {
    const set = new Set<string>();
    competitors.forEach((c) => set.add(c.category));
    return ["all", ...Array.from(set)];
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return competitors.filter((c) => {
      const catOk = filter === "all" || c.category === filter;
      if (!catOk) return false;
      if (!q) return true;
      const hay = `${c.name} ${c.tagline} ${c.oneLiner} ${c.category} ${c.region}`.toLowerCase();
      return hay.includes(q);
    });
  }, [filter, query]);

  const featured = competitors.filter((c) => FEATURED_SLUGS.includes(c.slug));

  /* Per-page SEO */
  useEffect(() => {
    const prevTitle = document.title;
    document.title =
      "Cuetronix Comparisons — GameBiller, Playo, Hudle, ggLeap, SENET, CourtReserve, Skedda, SmartLaunch & SpringboardVR (2026)";

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

    const desc =
      "See how Cuetronix — the world's first all-in-one gaming and sports venue OS — compares with GameBiller, Playo, Hudle, ggLeap, SENET, SmartLaunch, CourtReserve, Skedda and SpringboardVR. Honest feature-by-feature comparisons, pricing, migration guides and verdicts for each.";

    const created = [
      upsert(`meta[name="description"]`,         "name",     "description",         desc),
      upsert(`meta[name="keywords"]`,            "name",     "keywords",            "gaming venue software comparison, GameBiller alternative, Playo alternative, Hudle alternative, ggLeap alternative, SENET alternative, CourtReserve alternative, Skedda alternative, SpringboardVR alternative, venue management software, gaming lounge POS"),
      upsert(`meta[property="og:title"]`,        "property", "og:title",            "Cuetronix Comparisons — the complete competitor index"),
      upsert(`meta[property="og:description"]`,  "property", "og:description",      desc),
      upsert(`meta[property="og:type"]`,         "property", "og:type",             "website"),
      upsert(`meta[property="og:url"]`,          "property", "og:url",              "https://www.cuetronix.com/compare"),
      upsert(`meta[property="og:image"]`,        "property", "og:image",            "https://www.cuetronix.com/og-image.png"),
      upsert(`meta[name="twitter:card"]`,        "name",     "twitter:card",        "summary_large_image"),
      upsert(`meta[name="twitter:title"]`,       "name",     "twitter:title",       "Cuetronix Comparisons — the complete competitor index"),
      upsert(`meta[name="twitter:description"]`, "name",     "twitter:description", desc),
      upsert(`meta[name="robots"]`,              "name",     "robots",              "index, follow, max-snippet:-1, max-image-preview:large"),
    ];

    const canonicalUrl = "https://www.cuetronix.com/compare";
    let canonicalLink = document.head.querySelector<HTMLLinkElement>(`link[rel="canonical"]`);
    if (!canonicalLink) {
      canonicalLink = document.createElement("link");
      canonicalLink.rel = "canonical";
      document.head.appendChild(canonicalLink);
    }
    const prevCanonical = canonicalLink.href;
    canonicalLink.href = canonicalUrl;

    const jsonLd = document.createElement("script");
    jsonLd.type = "application/ld+json";
    jsonLd.setAttribute("data-compare-hub", "1");
    jsonLd.text = JSON.stringify([
      {
        "@context": "https://schema.org",
        "@type": "ItemList",
        "name": "Cuetronix vs competitors",
        "numberOfItems": competitors.length,
        "itemListElement": competitors.map((c, i) => ({
          "@type": "ListItem",
          "position": i + 1,
          "url": `https://www.cuetronix.com/vs/${c.slug}`,
          "name": `Cuetronix vs ${c.name}`,
        })),
      },
      {
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        "name": "Cuetronix comparison hub",
        "description": desc,
        "url": canonicalUrl,
      },
      {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": [
          { "@type": "ListItem", "position": 1, "name": "Home",    "item": "https://www.cuetronix.com/" },
          { "@type": "ListItem", "position": 2, "name": "Compare", "item": canonicalUrl },
        ],
      },
    ]);
    document.head.appendChild(jsonLd);

    return () => {
      document.title = prevTitle;
      canonicalLink!.href = prevCanonical || "https://www.cuetronix.com/";
      created.forEach((el) => el?.remove());
      jsonLd.remove();
    };
  }, []);

  /* Grouped results for the main grid */
  const grouped = useMemo(() => {
    return Array.from(
      filtered.reduce((m, c) => {
        const arr = m.get(c.category) ?? [];
        arr.push(c);
        m.set(c.category, arr);
        return m;
      }, new Map<string, typeof competitors>()),
    );
  }, [filtered]);

  return (
    <div className="relative min-h-screen bg-[#07030f] text-white antialiased selection:bg-violet-500/40 selection:text-white">
      <SiteAmbientBackground parallax />

      <noscript>
        <div className="p-8 text-white">
          <h1>Cuetronix Comparisons — the complete competitor index</h1>
          <p>Honest operator-first comparisons with Playo, Hudle, ggLeap, SENET, SmartLaunch, CourtReserve, Skedda and SpringboardVR.</p>
          <ul>
            {competitors.map((c) => (
              <li key={c.slug}>
                <a href={`/vs/${c.slug}`}>Cuetronix vs {c.name}</a> — {c.oneLiner}
              </li>
            ))}
          </ul>
        </div>
      </noscript>

      <div className="relative z-10">
        <Header />

        <main className="pt-32 sm:pt-36 pb-24">
          {/* ─── Hero ─── */}
          <section className="max-w-6xl mx-auto px-5 sm:px-8 text-center">
            <motion.div
              initial={reduceMotion ? false : { opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7 }}
            >
              <div className="inline-flex items-center gap-2 rounded-full border border-fuchsia-300/25 bg-fuchsia-500/10 px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.22em] text-fuchsia-200 mb-6">
                <Globe2 size={12} /> Global competitor index · 2026
              </div>
              <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-[-0.02em] leading-[1.05]">
                <span className="bg-gradient-to-r from-violet-300 via-fuchsia-300 to-pink-300 bg-clip-text text-transparent">
                  Cuetronix vs
                </span>
                <br />
                the rest of the venue software world.
              </h1>
              <p className="mt-6 max-w-2xl mx-auto text-gray-300 text-base sm:text-lg leading-relaxed">
                Honest, operator-first comparisons — no disparagement, no marketing fluff. Every page has
                20+ features scored, strengths & limitations, migration steps and a verdict.
              </p>

              {/* Social proof strip */}
              <div className="mt-8 flex flex-wrap justify-center gap-3">
                <StatPill icon={Users}        value={`${competitors.length}`}   label="Global rivals" />
                <StatPill icon={Zap}          value="180+"                      label="Features scored" />
                <StatPill icon={Trophy}       value="0%"                        label="Booking commission" />
                <StatPill icon={TrendingUp}   value="14-day"                    label="Free trial" />
              </div>
            </motion.div>
          </section>

          {/* ─── Featured (top 3) ─── */}
          <section className="max-w-6xl mx-auto px-5 sm:px-8 mt-16">
            <div className="flex items-center gap-3 mb-5">
              <Flame size={15} className="text-orange-300" />
              <div className="text-[11px] uppercase tracking-[0.22em] text-orange-200/85 font-semibold">Most searched</div>
              <div className="flex-1 h-px bg-white/8" />
            </div>
            <div className="grid md:grid-cols-3 gap-4">
              {featured.map((c, i) => (
                <motion.div
                  key={c.slug}
                  initial={reduceMotion ? false : { opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-80px" }}
                  transition={{ duration: 0.6, delay: i * 0.08 }}
                >
                  <Link
                    to={`/vs/${c.slug}`}
                    className="glass-card glass-card-interactive p-6 block group h-full relative overflow-hidden"
                  >
                    <div
                      className="pointer-events-none absolute -top-24 -right-24 h-48 w-48 rounded-full opacity-30 blur-3xl"
                      style={{ background: `radial-gradient(circle, ${c.brandColor}66 0%, transparent 70%)` }}
                    />
                    <div className="relative">
                      <div className="flex items-start justify-between mb-4">
                        <BrandBadge mark={c.brandMark} color={c.brandColor} />
                        <div className="inline-flex items-center gap-1.5 rounded-full border border-orange-300/25 bg-orange-500/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-orange-200">
                          #{i + 1} trending
                        </div>
                      </div>
                      <div className="text-[11px] uppercase tracking-[0.18em] text-violet-200/70 mb-1">
                        {c.category} · {c.region}
                      </div>
                      <div className="text-xl font-extrabold text-white group-hover:text-fuchsia-200 transition-colors mb-2">
                        Cuetronix vs {c.name}
                      </div>
                      <p className="text-sm text-gray-300 leading-relaxed line-clamp-3 mb-4">{c.oneLiner}</p>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-white/50">
                          Since {c.stats.foundedYear} · {c.stats.hqCountry}
                        </span>
                        <span className="inline-flex items-center gap-1 text-fuchsia-200 font-semibold group-hover:translate-x-0.5 transition-transform">
                          Read <ArrowRight size={12} />
                        </span>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          </section>

          {/* ─── Filter + search bar ─── */}
          <section className="max-w-6xl mx-auto px-5 sm:px-8 mt-16">
            <div className="surface-panel p-4 sm:p-5 flex flex-col sm:flex-row gap-3 sm:items-center">
              <div className="flex-1 flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5">
                <Search size={16} className="text-white/40 flex-shrink-0" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search competitors by name, category or region…"
                  className="flex-1 bg-transparent text-sm text-white placeholder:text-white/30 outline-none"
                />
              </div>
              <div className="flex flex-wrap gap-1.5">
                {categories.map((c) => {
                  const active = filter === c;
                  return (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setFilter(c)}
                      className={`px-3 py-2 rounded-full text-xs font-semibold uppercase tracking-[0.14em] transition-colors ${
                        active
                          ? "bg-gradient-to-r from-violet-600 via-fuchsia-600 to-pink-600 text-white shadow-lg shadow-fuchsia-600/30"
                          : "border border-white/10 bg-white/[0.03] text-white/70 hover:text-white hover:border-white/20"
                      }`}
                    >
                      {c === "all" ? "All" : c}
                    </button>
                  );
                })}
              </div>
            </div>
          </section>

          {/* ─── Grouped grid ─── */}
          <section className="max-w-6xl mx-auto px-5 sm:px-8 mt-10 space-y-12">
            {grouped.length === 0 && (
              <div className="theme-inset p-10 text-center text-white/60">
                No comparisons match your filter. Try a different category or clear your search.
              </div>
            )}
            {grouped.map(([cat, items]) => (
              <div key={cat}>
                <div className="flex items-center gap-3 mb-5">
                  <Sparkles size={14} className="text-fuchsia-300" />
                  <h2 className="text-lg sm:text-xl font-bold tracking-tight text-white">{cat}</h2>
                  <div className="text-xs text-white/40">{items.length} {items.length === 1 ? "comparison" : "comparisons"}</div>
                  <div className="flex-1 h-px bg-white/8" />
                </div>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {items.map((c) => (
                    <Link
                      key={c.slug}
                      to={`/vs/${c.slug}`}
                      className="glass-card glass-card-interactive p-6 block group h-full"
                    >
                      <div className="flex items-start gap-3 mb-4">
                        <BrandBadge mark={c.brandMark} color={c.brandColor} />
                        <div className="min-w-0 flex-1">
                          <div className="text-[11px] uppercase tracking-[0.18em] text-violet-200/70 mb-0.5">
                            {c.region} · Est. {c.stats.foundedYear}
                          </div>
                          <div className="text-lg font-extrabold text-white group-hover:text-fuchsia-200 transition-colors leading-tight">
                            Cuetronix vs {c.name}
                          </div>
                        </div>
                      </div>

                      <p className="text-sm text-gray-400 leading-relaxed line-clamp-3 mb-4">{c.oneLiner}</p>

                      <div className="flex flex-wrap gap-1.5 mb-4">
                        {c.stats.publicRating && (
                          <span className="inline-flex items-center gap-1 rounded-full border border-amber-300/20 bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-200">
                            <Award size={9} /> {c.stats.publicRating.score}/{c.stats.publicRating.max}
                          </span>
                        )}
                        {c.stats.customerEstimate && (
                          <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[10px] font-semibold text-white/75">
                            <Users size={9} /> {c.stats.customerEstimate}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center justify-between pt-3 border-t border-white/8">
                        <span className="text-xs text-white/50">{c.tagline}</span>
                        <span className="inline-flex items-center gap-1 text-xs text-fuchsia-200 font-semibold group-hover:translate-x-0.5 transition-transform">
                          Compare <ArrowRight size={12} />
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </section>

          {/* ─── CTA ─── */}
          <section className="max-w-4xl mx-auto px-5 sm:px-8 mt-20">
            <div className="glass-card p-8 sm:p-10 text-center relative overflow-hidden">
              <div
                className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 h-80 w-80 rounded-full opacity-30 blur-3xl"
                style={{ background: "radial-gradient(circle, #D946EF 0%, transparent 70%)" }}
              />
              <div className="relative">
                <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                  Not sure which one fits your venue?
                </h2>
                <p className="mt-3 text-gray-300 max-w-xl mx-auto">
                  Tell us what you run and we'll give you an honest answer — even if Cuetronix isn't the right fit.
                </p>
                <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
                  <Button
                    size="lg"
                    onClick={() => navigate("/signup")}
                    className="bg-gradient-to-r from-violet-600 via-fuchsia-600 to-pink-600 text-white px-8 h-14 font-bold shadow-2xl shadow-fuchsia-600/40 rounded-xl"
                  >
                    Start 14-day free trial <ArrowRight size={18} className="ml-2" />
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    onClick={() => navigate("/contact")}
                    className="border-white/15 bg-white/[0.05] text-white hover:bg-white/[0.1] text-base px-8 h-14 rounded-xl"
                  >
                    Book an operator demo
                  </Button>
                </div>
              </div>
            </div>
          </section>
        </main>

        <Footer />
      </div>
    </div>
  );
};

/* ── Sub-components ── */

const StatPill: React.FC<{
  icon: React.ComponentType<{ size?: number; className?: string }>;
  value: string;
  label: string;
}> = ({ icon: Icon, value, label }) => (
  <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2">
    <Icon size={14} className="text-fuchsia-300/80" />
    <span className="font-bold text-white">{value}</span>
    <span className="text-[11px] uppercase tracking-[0.18em] text-white/50 font-semibold">{label}</span>
  </div>
);

export default CompareHub;
