import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Globe2, Sparkles } from "lucide-react";

import Header from "@/components/landing/Header";
import Footer from "@/components/landing/Footer";
import SiteAmbientBackground from "@/components/landing/SiteAmbientBackground";
import { Button } from "@/components/ui/button";
import { competitors } from "@/data/competitors";

const CompareHub: React.FC = () => {
  const navigate = useNavigate();
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    const prevTitle = document.title;
    document.title =
      "Cuetronix Comparisons — Playo, Hudle, ggLeap, SENET, CourtReserve, Skedda & more (2026)";

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

    const desc =
      "See how Cuetronix — the world's first all-in-one gaming and sports venue OS — compares with Playo, Hudle, ggLeap, SENET, SmartLaunch, CourtReserve, Skedda and SpringboardVR. Feature-by-feature, pricing, fit and verdict for each.";
    const dM   = upsertMeta(`meta[name="description"]`,        "name", "description", desc);
    const ogT  = upsertMeta(`meta[property="og:title"]`,       "property", "og:title", "Cuetronix Comparisons — the complete competitor index");
    const ogD  = upsertMeta(`meta[property="og:description"]`, "property", "og:description", desc);
    const twT  = upsertMeta(`meta[name="twitter:title"]`,      "name", "twitter:title", "Cuetronix Comparisons — the complete competitor index");
    const twD  = upsertMeta(`meta[name="twitter:description"]`,"name", "twitter:description", desc);

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
    jsonLd.text = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "ItemList",
      "name": "Cuetronix vs competitors",
      "itemListElement": competitors.map((c, i) => ({
        "@type": "ListItem",
        "position": i + 1,
        "url": `https://www.cuetronix.com/vs/${c.slug}`,
        "name": `Cuetronix vs ${c.name}`,
      })),
    });
    document.head.appendChild(jsonLd);

    return () => {
      document.title = prevTitle;
      canonicalLink!.href = prevCanonical || "https://www.cuetronix.com/";
      dM?.remove(); ogT?.remove(); ogD?.remove(); twT?.remove(); twD?.remove();
      jsonLd.remove();
    };
  }, []);

  // Group by category for a cleaner hub
  const groups = Array.from(
    competitors.reduce((m, c) => {
      const arr = m.get(c.category) ?? [];
      arr.push(c);
      m.set(c.category, arr);
      return m;
    }, new Map<string, typeof competitors>()),
  );

  return (
    <div className="relative min-h-screen bg-[#07030f] text-white antialiased selection:bg-violet-500/40 selection:text-white">
      <SiteAmbientBackground parallax />
      <div className="relative z-10">
        <Header />

        <main className="pt-32 sm:pt-36 pb-24">
          {/* Hero */}
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
                <span className="bg-gradient-to-r from-violet-300 via-fuchsia-300 to-pink-300 bg-clip-text text-transparent">Cuetronix vs</span>
                <br />
                the rest of the venue software world.
              </h1>
              <p className="mt-6 max-w-2xl mx-auto text-gray-300 text-base sm:text-lg leading-relaxed">
                Straight-up, operator-first comparisons. We don't trash competitors — we just show you where each tool fits and where Cuetronix's all-in-one OS (POS + Razorpay booking + corporate-grade staff payroll) pulls ahead.
              </p>
            </motion.div>
          </section>

          {/* Groups */}
          <section className="max-w-6xl mx-auto px-5 sm:px-8 mt-16 space-y-12">
            {groups.map(([cat, items]) => (
              <div key={cat}>
                <div className="flex items-center gap-3 mb-5">
                  <Sparkles size={14} className="text-fuchsia-300" />
                  <h2 className="text-lg sm:text-xl font-bold tracking-tight text-white">{cat}</h2>
                  <div className="flex-1 h-px bg-white/8" />
                </div>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {items.map((c) => (
                    <Link
                      key={c.slug}
                      to={`/vs/${c.slug}`}
                      className="glass-card glass-card-interactive p-6 block group"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <div className="text-[11px] uppercase tracking-[0.18em] text-violet-200/70 mb-1">
                            {c.region} · Founded {c.foundedYear}
                          </div>
                          <div className="text-xl font-extrabold text-white group-hover:text-fuchsia-200 transition-colors">
                            Cuetronix vs {c.name}
                          </div>
                        </div>
                        <ArrowRight size={16} className="text-white/40 group-hover:text-fuchsia-300 group-hover:translate-x-1 transition-all mt-2" />
                      </div>
                      <p className="text-sm text-gray-400 leading-relaxed line-clamp-3">
                        {c.oneLiner}
                      </p>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </section>

          {/* CTA */}
          <section className="max-w-4xl mx-auto px-5 sm:px-8 mt-20">
            <div className="glass-card p-8 sm:p-10 text-center">
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
          </section>
        </main>

        <Footer />
      </div>
    </div>
  );
};

export default CompareHub;
