import { useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, CheckCircle2, ShieldAlert, XCircle } from "lucide-react";

import Header from "@/components/landing/Header";
import Footer from "@/components/landing/Footer";
import SiteAmbientBackground from "@/components/landing/SiteAmbientBackground";
import { Button } from "@/components/ui/button";
import {
  competitorFullComparePath,
  competitorLandingLabel,
} from "@/data/competitorLandingTypes";
import { competitorLandingByPath } from "@/data/competitorLandingsIndex";

const CompetitorLanding: React.FC = () => {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const reduceMotion = useReducedMotion();
  const page = competitorLandingByPath(pathname);
  const competitorLabel = page ? competitorLandingLabel(page.competitorSlug) : "Competitor";
  const fullComparePath = page ? competitorFullComparePath(page.competitorSlug) : "/compare";

  useEffect(() => {
    if (!page) return;

    const prevTitle = document.title;
    document.title = page.metaTitle;

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

    const created = [
      upsert(`meta[name="description"]`, "name", "description", page.metaDescription),
      upsert(`meta[name="keywords"]`, "name", "keywords", page.keywords.join(", ")),
      upsert(`meta[property="og:title"]`, "property", "og:title", page.metaTitle),
      upsert(`meta[property="og:description"]`, "property", "og:description", page.metaDescription),
      upsert(`meta[property="og:type"]`, "property", "og:type", "article"),
      upsert(`meta[property="og:url"]`, "property", "og:url", `https://www.cuetronix.com${page.path}`),
      upsert(`meta[property="og:image"]`, "property", "og:image", "https://www.cuetronix.com/og-image.png"),
      upsert(`meta[name="robots"]`, "name", "robots", "index, follow, max-snippet:-1, max-image-preview:large"),
    ];

    const canonicalUrl = `https://www.cuetronix.com${page.path}`;
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
    jsonLd.setAttribute("data-competitor-landing", page.path);
    jsonLd.text = JSON.stringify([
      {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: "https://www.cuetronix.com/" },
          { "@type": "ListItem", position: 2, name: page.headline, item: canonicalUrl },
        ],
      },
      {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: page.faqs.map((f) => ({
          "@type": "Question",
          name: f.q,
          acceptedAnswer: { "@type": "Answer", text: f.a },
        })),
      },
      {
        "@context": "https://schema.org",
        "@type": "Article",
        headline: page.metaTitle,
        description: page.metaDescription,
        datePublished: "2026-06-29",
        author: { "@type": "Organization", name: "Cuephoria Tech" },
        mainEntityOfPage: canonicalUrl,
      },
    ]);
    document.head.appendChild(jsonLd);

    return () => {
      document.title = prevTitle;
      canonicalLink!.href = prevCanonical || "https://www.cuetronix.com/";
      created.forEach((el) => el?.remove());
      jsonLd.remove();
    };
  }, [page]);

  if (!page) {
    return (
      <div className="lp-root relative min-h-screen bg-[#05060b] text-white flex flex-col items-center justify-center px-6">
        <h1 className="text-3xl font-extrabold mb-4">Page not found</h1>
        <Button onClick={() => navigate("/compare")} className="bg-gradient-to-r from-violet-600 to-fuchsia-600">
          Compare hub <ArrowRight size={16} className="ml-2" />
        </Button>
      </div>
    );
  }

  const mythsTitle = page.mythsSectionTitle ?? `${competitorLabel} claims vs facts`;

  return (
    <div className="lp-root relative min-h-screen bg-[#05060b] text-white antialiased selection:bg-violet-500/40 selection:text-white">
      <SiteAmbientBackground parallax />

      <noscript>
        <div className="p-8 text-white max-w-3xl mx-auto">
          <h1>{page.headline}</h1>
          <p>{page.deck}</p>
          {page.myths?.map((m) => (
            <div key={m.myth}>
              <h3>{m.myth}</h3>
              <p>{m.fact}</p>
            </div>
          ))}
          {page.faqs.map((f) => (
            <div key={f.q}>
              <h3>{f.q}</h3>
              <p>{f.a}</p>
            </div>
          ))}
        </div>
      </noscript>

      <div className="relative z-10">
        <Header />

        <main className="pt-32 sm:pt-36 pb-24">
          <div className="max-w-4xl mx-auto px-5 sm:px-8">
            <motion.div
              initial={reduceMotion ? false : { opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <div className="text-[11px] uppercase tracking-[0.22em] text-fuchsia-200/80 font-semibold mb-4">
                {page.badge}
              </div>
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight leading-[1.1]">
                {page.headline}
              </h1>
              <p className="mt-6 text-base sm:text-lg text-gray-300 leading-relaxed">{page.deck}</p>

              <div className="mt-8 flex flex-wrap gap-3">
                <Button
                  onClick={() => navigate("/signup")}
                  className="bg-gradient-to-r from-violet-600 via-fuchsia-600 to-pink-600"
                >
                  Start 14-day free trial <ArrowRight size={16} className="ml-2" />
                </Button>
                <Button variant="outline" onClick={() => navigate(fullComparePath)} className="border-white/20">
                  Full {competitorLabel} comparison
                </Button>
              </div>
            </motion.div>

            {page.myths && page.myths.length > 0 && (
              <section className="mt-14">
                <h2 className="text-xl font-bold text-white mb-5 flex items-center gap-2">
                  <ShieldAlert size={20} className="text-rose-300" />
                  {mythsTitle}
                </h2>
                <div className="space-y-4">
                  {page.myths.map((m) => (
                    <div key={m.myth} className="glass-card p-5 sm:p-6">
                      <div className="flex gap-3 items-start">
                        <XCircle size={18} className="text-rose-400 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm font-semibold text-rose-200/90">{m.myth}</p>
                          <p className="mt-2 text-sm text-gray-300 leading-relaxed flex gap-2">
                            <CheckCircle2 size={16} className="text-emerald-400 shrink-0 mt-0.5" />
                            <span>{m.fact}</span>
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {page.sections.map((sec) => (
              <section key={sec.title} className="mt-14">
                <h2 className="text-xl font-bold text-white mb-4">{sec.title}</h2>
                <ul className="glass-card p-6 space-y-3">
                  {sec.bullets.map((b) => (
                    <li key={b} className="flex gap-3 text-sm sm:text-base text-gray-300 leading-relaxed">
                      <CheckCircle2 size={16} className="text-violet-300 shrink-0 mt-1" />
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
              </section>
            ))}

            <section className="mt-14">
              <h2 className="text-xl font-bold text-white mb-5">FAQ</h2>
              <div className="space-y-4">
                {page.faqs.map((f) => (
                  <article key={f.q} className="glass-card p-5 sm:p-6">
                    <h3 className="font-semibold text-white text-lg">{f.q}</h3>
                    <p className="mt-2 text-sm sm:text-base text-gray-400 leading-relaxed">{f.a}</p>
                  </article>
                ))}
              </div>
            </section>

            <section className="mt-14 glass-card p-6 sm:p-8 text-center border-fuchsia-500/20">
              <h2 className="text-2xl font-bold text-white">See the full scored comparison</h2>
              <p className="mt-3 text-gray-400 max-w-xl mx-auto">
                30+ features, HRMS & Razorpay booking rows, migration steps, and operator verdict — why Cuetronix is
                the all-in-one gaming venue OS.
              </p>
              <Button
                onClick={() => navigate(fullComparePath)}
                className="mt-6 bg-gradient-to-r from-violet-600 via-fuchsia-600 to-pink-600"
              >
                {competitorLabel} full review <ArrowRight size={16} className="ml-2" />
              </Button>
            </section>

            <section className="mt-12">
              <p className="text-[11px] uppercase tracking-[0.22em] text-white/40 mb-3 font-semibold">Related guides</p>
              <div className="flex flex-wrap gap-2">
                {page.relatedPaths.map((p) => (
                  <Link
                    key={p}
                    to={p}
                    className="inline-block rounded-full border border-white/8 bg-white/[0.02] px-3 py-1.5 text-xs text-white/60 hover:text-fuchsia-200 hover:border-fuchsia-300/30 transition-colors"
                  >
                    {p.replace(/^\//, "").replace(/-/g, " ")}
                  </Link>
                ))}
              </div>
            </section>
          </div>
        </main>

        <Footer />
      </div>
    </div>
  );
};

export default CompetitorLanding;
