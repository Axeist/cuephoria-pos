import React from "react";
import {
  GoogleLogo,
  MastercardLogo,
  SupabaseLogo,
  TwilioLogo,
  UpiLogo,
  VisaLogo,
  WhatsAppLogo,
} from "./BrandLogos";

/**
 * Infinite, auto-scrolling proof strip of the rails Cuetronix runs on.
 * Pure CSS transform marquee (pauses on hover, disabled under reduced-motion
 * via the `.lp-marquee` class) — no JS scroll work.
 *
 * Razorpay & Stripe use the official PNG marks in /public/branding; the rest
 * are brand-accurate inline SVGs (see BrandLogos.tsx) so they stay crisp.
 */
type Item =
  | { label: string; img: string; Logo?: never }
  | { label: string; Logo: React.FC<{ className?: string }>; img?: never };

const ITEMS: Item[] = [
  { label: "Razorpay", img: "/branding/razorpay-logo.png" },
  { label: "UPI", Logo: UpiLogo },
  { label: "Stripe", img: "/branding/stripe-logo.png" },
  { label: "Visa", Logo: VisaLogo },
  { label: "Mastercard", Logo: MastercardLogo },
  { label: "WhatsApp", Logo: WhatsAppLogo },
  { label: "Twilio", Logo: TwilioLogo },
  { label: "Supabase", Logo: SupabaseLogo },
  { label: "Google", Logo: GoogleLogo },
];

const Row: React.FC = () => (
  <>
    {ITEMS.map((it) => (
      <div
        key={it.label}
        className="mx-3 flex shrink-0 items-center gap-2.5 whitespace-nowrap px-2"
      >
        {it.img ? (
          <img
            src={it.img}
            alt={`${it.label} logo`}
            className="h-5 w-auto object-contain opacity-70 grayscale transition duration-300 hover:opacity-100 hover:grayscale-0"
            draggable={false}
            loading="lazy"
          />
        ) : (
          <it.Logo className="h-5 w-auto opacity-70 grayscale transition duration-300 hover:opacity-100 hover:grayscale-0" />
        )}
        <span className="mx-2 h-1 w-1 rounded-full bg-white/20" />
      </div>
    ))}
  </>
);

const LogoMarquee: React.FC = () => {
  return (
    <section
      aria-label="Built on trusted infrastructure"
      className="relative py-8"
    >
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <p className="lp-mono mb-5 text-center text-[11px] uppercase tracking-[0.28em] text-white/35">
          One platform · built on rails you trust
        </p>
        <div
          className="relative overflow-hidden"
          style={{
            maskImage:
              "linear-gradient(90deg, transparent, #000 12%, #000 88%, transparent)",
            WebkitMaskImage:
              "linear-gradient(90deg, transparent, #000 12%, #000 88%, transparent)",
          }}
        >
          {/* Two copies for a seamless -50% loop */}
          <div className="lp-marquee">
            <Row />
            <Row />
          </div>
        </div>
      </div>
    </section>
  );
};

export default LogoMarquee;
