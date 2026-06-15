import React from "react";
import { useNavigate } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowLeft, Clock, Mail, MapPin, Phone } from "lucide-react";

import Header from "@/components/landing/Header";
import Footer from "@/components/landing/Footer";
import SiteAmbientBackground from "@/components/landing/SiteAmbientBackground";
import Reveal from "@/components/landing/lp/Reveal";

const CARDS = [
  {
    icon: Phone,
    title: "Phone",
    value: "+91 86376 25155",
    href: "tel:+918637625155",
    accent: "#a78bfa",
  },
  {
    icon: Mail,
    title: "Email",
    value: "contact@cuephoria.in",
    href: "mailto:contact@cuephoria.in",
    accent: "#22d3ee",
  },
  {
    icon: Clock,
    title: "Business hours",
    value: "11:00 AM - 11:00 PM",
    sub: "Every day",
    accent: "#fbbf24",
  },
  {
    icon: MapPin,
    title: "Visit us",
    value: "Cuephoria Gaming Lounge",
    href: "https://maps.app.goo.gl/cuephoria",
    linkLabel: "View on Google Maps",
    accent: "#34d399",
  },
] as const;

const Contact: React.FC = () => {
  const navigate = useNavigate();
  const reduce = useReducedMotion();

  return (
    <div className="lp-root relative min-h-screen bg-[#05060b] text-white antialiased selection:bg-violet-500/40 selection:text-white">
      <SiteAmbientBackground parallax />

      <div className="relative z-10 flex min-h-screen flex-col">
        <Header />

        <main className="flex-1 px-5 pb-24 pt-32 sm:px-8">
          <div className="mx-auto max-w-4xl">
            <button
              type="button"
              onClick={() => navigate("/")}
              className="lp-chip mb-8 cursor-pointer transition-colors hover:text-white"
            >
              <ArrowLeft size={13} /> Back to home
            </button>

            <Reveal className="mb-10 text-center">
              <span className="lp-chip mx-auto mb-4 text-violet-200">
                <Mail size={12} className="text-fuchsia-300" /> We'd love to hear from you
              </span>
              <h1 className="lp-display text-4xl font-bold text-white sm:text-5xl">
                Get in <span className="lp-holo">touch</span>
              </h1>
              <p className="mx-auto mt-3 max-w-lg text-white/60">
                Questions about Cuetronix, demos, or onboarding your venue? Reach the
                team directly.
              </p>
            </Reveal>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {CARDS.map((c, i) => {
                const Icon = c.icon;
                const Inner = (
                  <>
                    <span
                      className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl"
                      style={{ background: `${c.accent}24` }}
                    >
                      <Icon size={22} style={{ color: c.accent }} />
                    </span>
                    <h3 className="lp-display text-lg font-semibold text-white">
                      {c.title}
                    </h3>
                    <p className="mt-1 text-white/70">{c.value}</p>
                    {"sub" in c && c.sub && (
                      <p className="mt-0.5 text-sm text-white/40">{c.sub}</p>
                    )}
                    {"linkLabel" in c && c.linkLabel && (
                      <span className="mt-2 text-sm font-medium text-violet-300">
                        {c.linkLabel}
                      </span>
                    )}
                  </>
                );

                return (
                  <Reveal key={c.title} delay={i * 90}>
                    <motion.div
                      whileHover={reduce ? undefined : { y: -4 }}
                      transition={{ type: "spring", stiffness: 300, damping: 22 }}
                      className="lp-glass lp-spotlight h-full"
                    >
                      {c.href ? (
                        <a
                          href={c.href}
                          target={c.href.startsWith("http") ? "_blank" : undefined}
                          rel={
                            c.href.startsWith("http")
                              ? "noopener noreferrer"
                              : undefined
                          }
                          className="flex h-full cursor-pointer flex-col items-start p-6 text-left"
                        >
                          {Inner}
                        </a>
                      ) : (
                        <div className="flex h-full flex-col items-start p-6 text-left">
                          {Inner}
                        </div>
                      )}
                    </motion.div>
                  </Reveal>
                );
              })}
            </div>

            <div className="mt-10 flex justify-center">
              <button
                type="button"
                onClick={() => navigate("/")}
                className="lp-btn-ghost h-12 px-6"
              >
                Return to home
              </button>
            </div>
          </div>
        </main>

        <Footer />
      </div>
    </div>
  );
};

export default Contact;
