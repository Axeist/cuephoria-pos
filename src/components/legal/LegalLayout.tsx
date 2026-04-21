import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  ExternalLink,
  Gamepad2,
  Mail,
  Printer,
  Scale,
  ShieldCheck,
} from "lucide-react";

import SiteAmbientBackground from "@/components/landing/SiteAmbientBackground";

/* ─────────────────────────────────────────────────────────────────────────
   Shared layout for all Cuetronix legal pages.
   - Ambient galaxy background (matches landing theme)
   - Glass card with in-page table of contents
   - Print / contact / back-to-home actions
   - Cuephoria Tech + Cuephoria Gaming Lounge branding on every page
   ───────────────────────────────────────────────────────────────────────── */

export interface LegalSection {
  id: string;
  title: string;
  content: React.ReactNode;
}

export interface LegalSidebarLink {
  label: string;
  to: string;
}

interface LegalLayoutProps {
  title: string;
  eyebrow?: string;
  lead: React.ReactNode;
  lastUpdated: string;
  effectiveFrom?: string;
  sections: LegalSection[];
  otherPolicies?: LegalSidebarLink[];
  contactEmail?: string;
}

const DEFAULT_OTHER_POLICIES: LegalSidebarLink[] = [
  { label: "Terms of Service", to: "/terms" },
  { label: "Privacy Policy", to: "/privacy" },
  { label: "Refund & Cancellation", to: "/refund-policy" },
  { label: "Acceptable Use", to: "/acceptable-use" },
  { label: "Cookie Policy", to: "/cookies" },
  { label: "Service Delivery", to: "/shipping-and-delivery" },
];

const LegalLayout: React.FC<LegalLayoutProps> = ({
  title,
  eyebrow = "Legal",
  lead,
  lastUpdated,
  effectiveFrom,
  sections,
  otherPolicies = DEFAULT_OTHER_POLICIES,
  contactEmail = "legal@cuetronix.com",
}) => {
  const navigate = useNavigate();
  const [activeId, setActiveId] = useState<string>(sections[0]?.id ?? "");

  const toc = useMemo(
    () => sections.map((s, i) => ({ ...s, index: i + 1 })),
    [sections]
  );

  /* Scroll-spy for the left TOC */
  useEffect(() => {
    if (!sections.length) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort(
            (a, b) =>
              (a.target as HTMLElement).offsetTop -
              (b.target as HTMLElement).offsetTop
          );
        if (visible[0]) setActiveId(visible[0].target.id);
      },
      { rootMargin: "-120px 0px -60% 0px", threshold: [0, 0.25, 0.5, 1] }
    );

    sections.forEach((s) => {
      const el = document.getElementById(s.id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [sections]);

  /* Scroll to top on mount */
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
  }, []);

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#07030f] text-zinc-100 antialiased">
      <SiteAmbientBackground />

      {/* ── Top bar ────────────────────────────────────────────────── */}
      <div className="relative z-10 border-b border-white/5 bg-black/20 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-8">
          <button
            onClick={() => navigate("/")}
            className="group inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-zinc-300 transition-colors hover:bg-white/[0.08] hover:text-white"
          >
            <ArrowLeft
              size={13}
              className="transition-transform group-hover:-translate-x-0.5"
            />
            Back to Cuetronix
          </button>

          <a
            href="/"
            className="flex items-center gap-2"
            aria-label="Cuetronix home"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 via-fuchsia-500 to-pink-500 shadow-md shadow-violet-600/40">
              <Gamepad2 size={14} className="text-white" />
            </span>
            <span className="hidden text-sm font-bold tracking-tight sm:inline">
              Cue
              <span className="bg-gradient-to-r from-violet-300 to-fuchsia-300 bg-clip-text text-transparent">
                tronix
              </span>
            </span>
          </a>

          <div className="flex items-center gap-2">
            <button
              onClick={() => window.print()}
              className="hidden items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-zinc-300 transition-colors hover:bg-white/[0.08] hover:text-white sm:inline-flex"
              aria-label="Print or save as PDF"
            >
              <Printer size={12} /> Print
            </button>
            <a
              href={`mailto:${contactEmail}`}
              className="inline-flex items-center gap-1.5 rounded-lg border border-violet-400/30 bg-violet-500/10 px-3 py-1.5 text-xs font-medium text-violet-100 transition-colors hover:bg-violet-500/20"
            >
              <Mail size={12} /> Contact legal
            </a>
          </div>
        </div>
      </div>

      {/* ── Hero band ──────────────────────────────────────────────── */}
      <div className="relative z-10">
        <div className="mx-auto max-w-7xl px-4 pt-10 sm:px-8 sm:pt-14">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="max-w-3xl"
          >
            <div
              className="mb-4 inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em]"
              style={{
                background:
                  "linear-gradient(90deg, rgba(167,139,250,0.14) 0%, rgba(236,72,153,0.12) 100%)",
                border: "1px solid rgba(167,139,250,0.30)",
                color: "#ede9fe",
              }}
            >
              <Scale size={11} className="text-fuchsia-300" />
              {eyebrow}
            </div>

            <h1 className="text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-5xl">
              {title}
            </h1>

            <div className="mt-4 text-base leading-relaxed text-zinc-300 sm:text-lg">
              {lead}
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-2 text-[11px] font-medium text-zinc-400">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1">
                <span
                  className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(16,185,129,0.9)]"
                />
                Last updated: {lastUpdated}
              </span>
              {effectiveFrom && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1">
                  Effective from: {effectiveFrom}
                </span>
              )}
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1">
                <ShieldCheck size={11} className="text-emerald-300" /> A
                Cuephoria&nbsp;Tech product
              </span>
            </div>
          </motion.div>
        </div>
      </div>

      {/* ── Main — two column on lg ────────────────────────────────── */}
      <main className="relative z-10 mx-auto max-w-7xl px-4 pb-20 pt-8 sm:px-8 lg:pt-12">
        <div className="grid gap-10 lg:grid-cols-[280px_1fr] lg:gap-14">
          {/* Sticky sidebar */}
          <aside className="lg:sticky lg:top-20 lg:h-max">
            {/* Table of contents */}
            <div
              className="rounded-2xl p-4"
              style={{
                background:
                  "linear-gradient(180deg, rgba(20,12,38,0.55) 0%, rgba(12,7,24,0.6) 100%)",
                border: "1px solid rgba(255,255,255,0.08)",
                backdropFilter: "blur(24px) saturate(160%)",
                WebkitBackdropFilter: "blur(24px) saturate(160%)",
              }}
            >
              <p className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/55">
                On this page
              </p>
              <ol className="space-y-0.5">
                {toc.map((s) => {
                  const active = activeId === s.id;
                  return (
                    <li key={s.id}>
                      <a
                        href={`#${s.id}`}
                        className={[
                          "group flex items-start gap-2 rounded-lg px-2 py-1.5 text-[13px] leading-snug transition-colors",
                          active
                            ? "bg-violet-500/15 text-white"
                            : "text-zinc-400 hover:bg-white/[0.04] hover:text-white",
                        ].join(" ")}
                      >
                        <span
                          className={[
                            "mt-[2px] inline-flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-md text-[10px] font-bold tabular-nums",
                            active
                              ? "bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white shadow-md shadow-violet-900/40"
                              : "border border-white/10 bg-white/[0.04] text-zinc-400 group-hover:border-white/20",
                          ].join(" ")}
                        >
                          {String(s.index).padStart(2, "0")}
                        </span>
                        <span>{s.title}</span>
                      </a>
                    </li>
                  );
                })}
              </ol>
            </div>

            {/* Other policies */}
            {otherPolicies.length > 0 && (
              <div
                className="mt-4 rounded-2xl p-4"
                style={{
                  background:
                    "linear-gradient(180deg, rgba(20,12,38,0.45) 0%, rgba(12,7,24,0.55) 100%)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  backdropFilter: "blur(24px) saturate(160%)",
                  WebkitBackdropFilter: "blur(24px) saturate(160%)",
                }}
              >
                <p className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/55">
                  Other policies
                </p>
                <ul className="space-y-0.5">
                  {otherPolicies.map((p) => (
                    <li key={p.to}>
                      <Link
                        to={p.to}
                        className="block rounded-lg px-2 py-1.5 text-[13px] text-zinc-400 transition-colors hover:bg-white/[0.04] hover:text-white"
                      >
                        {p.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Help strip */}
            <div
              className="mt-4 rounded-2xl p-4"
              style={{
                background:
                  "linear-gradient(135deg, rgba(124,58,237,0.12) 0%, rgba(236,72,153,0.08) 100%)",
                border: "1px solid rgba(167,139,250,0.22)",
                backdropFilter: "blur(18px) saturate(160%)",
              }}
            >
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/60">
                Questions?
              </p>
              <p className="mt-1 text-[13px] leading-snug text-zinc-300">
                Email{" "}
                <a
                  href={`mailto:${contactEmail}`}
                  className="text-violet-200 underline-offset-4 hover:underline"
                >
                  {contactEmail}
                </a>{" "}
                and our team responds within one business day.
              </p>
            </div>
          </aside>

          {/* Content */}
          <article
            className="relative overflow-hidden rounded-3xl"
            style={{
              background:
                "linear-gradient(180deg, rgba(20,12,38,0.55) 0%, rgba(12,7,24,0.7) 100%)",
              border: "1px solid rgba(255,255,255,0.08)",
              backdropFilter: "blur(28px) saturate(170%)",
              WebkitBackdropFilter: "blur(28px) saturate(170%)",
              boxShadow:
                "0 30px 80px -30px rgba(124,58,237,0.4), inset 0 1px 0 rgba(255,255,255,0.08)",
            }}
          >
            {/* Shine */}
            <div
              className="pointer-events-none absolute inset-x-10 top-0 h-px"
              style={{
                background:
                  "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.35) 50%, transparent 100%)",
              }}
            />
            <div
              className="pointer-events-none absolute inset-0"
              style={{
                background:
                  "radial-gradient(800px 260px at 10% 0%, rgba(167,139,250,0.10), transparent 60%)," +
                  "radial-gradient(700px 260px at 90% 100%, rgba(236,72,153,0.08), transparent 65%)",
              }}
            />

            <div className="relative px-6 py-10 sm:px-10 sm:py-12">
              <div className="prose prose-invert max-w-none prose-headings:tracking-tight prose-headings:font-bold prose-h2:text-2xl sm:prose-h2:text-[26px] prose-h2:mt-0 prose-p:text-zinc-300 prose-p:leading-relaxed prose-li:text-zinc-300 prose-strong:text-white prose-a:text-violet-200 prose-a:no-underline hover:prose-a:underline prose-a:underline-offset-4">
                {sections.map((s, i) => (
                  <section
                    key={s.id}
                    id={s.id}
                    className={[
                      "scroll-mt-24",
                      i > 0 ? "mt-12 border-t border-white/5 pt-12" : "",
                    ].join(" ")}
                  >
                    <div className="mb-3 flex items-baseline gap-3">
                      <span className="rounded-md bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 px-2 py-0.5 text-[11px] font-bold text-violet-200 tabular-nums">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <h2 className="!mt-0 !mb-0">{s.title}</h2>
                    </div>
                    <div className="text-[15px]">{s.content}</div>
                  </section>
                ))}
              </div>

              {/* Signature band */}
              <div
                className="mt-12 flex flex-col gap-4 rounded-2xl p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6"
                style={{
                  background:
                    "linear-gradient(135deg, rgba(124,58,237,0.14) 0%, rgba(236,72,153,0.10) 100%)",
                  border: "1px solid rgba(167,139,250,0.25)",
                }}
              >
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/55">
                    Published by
                  </p>
                  <p className="mt-1 text-base font-bold text-white">
                    Cuephoria Tech · for Cuetronix
                  </p>
                  <p className="mt-1 text-[13px] text-zinc-400">
                    Cuetronix is operated by Cuephoria Tech. Battle-tested at{" "}
                    <a
                      href="https://cuephoria.in"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-fuchsia-200 underline-offset-4 hover:underline"
                    >
                      Cuephoria Gaming Lounge
                    </a>
                    .
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <a
                    href="https://cuephoriatech.in"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-semibold text-zinc-200 transition-colors hover:bg-white/[0.08] hover:text-white"
                  >
                    cuephoriatech.in
                    <ExternalLink size={11} />
                  </a>
                  <a
                    href={`mailto:${contactEmail}`}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-violet-400/30 bg-violet-500/15 px-3 py-1.5 text-xs font-semibold text-violet-100 transition-colors hover:bg-violet-500/25"
                  >
                    <Mail size={11} /> {contactEmail}
                  </a>
                </div>
              </div>
            </div>
          </article>
        </div>
      </main>

      <style>{`
        @media print {
          body { background: #fff !important; color: #000 !important; }
          aside, header, .lg\\:sticky { display: none !important; }
          article { box-shadow: none !important; border: 0 !important; background: #fff !important; color: #000 !important; }
          .prose-invert * { color: #000 !important; }
        }
      `}</style>
    </div>
  );
};

export default LegalLayout;
