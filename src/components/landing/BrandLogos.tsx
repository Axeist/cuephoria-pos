/**
 * Brand logos for the landing trust strip — real, brand-accurate SVG marks
 * (paths sourced from Simple Icons, CC0). Each renders at a uniform height via
 * the `className` (e.g. `h-5 w-auto`) and keeps its own viewBox aspect ratio.
 *
 * Razorpay & Stripe stay as the official PNGs shipped in /public/branding
 * (their wordmarks aren't single-path glyphs); everything else is inline SVG so
 * it stays crisp at any size and inherits the marquee's opacity treatment.
 */
import React from "react";

type LogoProps = { className?: string };

export const WhatsAppLogo: React.FC<LogoProps> = ({ className }) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden role="img" fill="#25D366">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" />
  </svg>
);

export const TwilioLogo: React.FC<LogoProps> = ({ className }) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden role="img" fill="#F22F46">
    <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.6 0 12 0zm0 20.4c-4.6 0-8.4-3.8-8.4-8.4S7.4 3.6 12 3.6s8.4 3.8 8.4 8.4-3.8 8.4-8.4 8.4zm5.2-10.5c0 1.4-1.2 2.6-2.6 2.6s-2.6-1.2-2.6-2.6 1.2-2.6 2.6-2.6 2.6 1.2 2.6 2.6zm0 4.2c0 1.4-1.2 2.6-2.6 2.6s-2.6-1.2-2.6-2.6 1.2-2.6 2.6-2.6 2.6 1.2 2.6 2.6zm-5.2 0c0 1.4-1.2 2.6-2.6 2.6s-2.6-1.2-2.6-2.6 1.2-2.6 2.6-2.6 2.6 1.2 2.6 2.6zm0-4.2c0 1.4-1.2 2.6-2.6 2.6S6.8 11.3 6.8 9.9s1.2-2.6 2.6-2.6S12 8.5 12 9.9z" />
  </svg>
);

export const SupabaseLogo: React.FC<LogoProps> = ({ className }) => (
  <svg viewBox="0 0 109 113" className={className} aria-hidden role="img" fill="#3ECF8E">
    <path d="M63.708 110.284c-2.86 3.601-8.658 1.628-8.727-2.97l-1.007-67.251h45.22c8.19 0 12.758 9.46 7.665 15.874l-43.151 54.347Z" />
    <path d="M45.317 2.071c2.86-3.601 8.657-1.628 8.726 2.97l.442 67.251H9.831c-8.19 0-12.759-9.46-7.665-15.875L45.317 2.072Z" fillOpacity="0.6" />
  </svg>
);

export const GoogleLogo: React.FC<LogoProps> = ({ className }) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden role="img">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
  </svg>
);

export const MastercardLogo: React.FC<LogoProps> = ({ className }) => (
  <svg viewBox="0 0 36 24" className={className} aria-hidden role="img">
    <circle cx="14" cy="12" r="9" fill="#EB001B" />
    <circle cx="22" cy="12" r="9" fill="#F79E1B" />
    <path
      fill="#FF5F00"
      d="M18 5.1a9 9 0 0 0 0 13.8 9 9 0 0 0 0-13.8z"
    />
  </svg>
);

export const VisaLogo: React.FC<LogoProps> = ({ className }) => (
  <svg viewBox="0 0 48 16" className={className} aria-hidden role="img" fill="#1A1F71">
    <path d="M20.7.3l-3 14.6h-3.6L17.1.3h3.6zM35.9 9.7l1.9-5.2 1.1 5.2h-3zm4 5.2H43L40.1.3h-3.1c-.7 0-1.3.4-1.5 1L30 14.9h3.8l.7-2.1h4.6l.4 2.1zM30.4 10c0-3.7-5.1-3.9-5.1-5.5 0-.5.5-1 1.5-1.1.5-.1 1.9-.1 3.5.6l.6-3C30.1.6 28.9.3 27.5.3c-3.6 0-6.1 1.9-6.1 4.6 0 2 1.8 3.1 3.2 3.8 1.4.7 1.9 1.1 1.9 1.7 0 .9-1.1 1.3-2.1 1.3-1.8 0-2.8-.5-3.6-.9l-.6 3.1c.8.4 2.3.7 3.9.7 3.8 0 6.3-1.9 6.3-4.8M15.5.3L9.6 14.9H5.8L2.9 3.7c-.2-.7-.3-.9-.9-1.2C1.1 2.1 0 1.8 0 1.8L0 .3h6.1c.8 0 1.5.5 1.6 1.4l1.5 8.1L13 .3h2.5z" />
  </svg>
);

export const UpiLogo: React.FC<LogoProps> = ({ className }) => (
  <svg viewBox="0 0 60 24" className={className} aria-hidden role="img">
    <path fill="#097939" d="M14 1.6 7.7 22.4H2.1L8.4 1.6H14z" />
    <path fill="#ED752E" d="M22 1.6 15.7 22.4h-5.6L16.4 1.6H22z" />
    <text
      x="27"
      y="17"
      fontFamily="'Space Grotesk', system-ui, sans-serif"
      fontSize="14"
      fontWeight="700"
      fill="#ffffff"
    >
      UPI
    </text>
  </svg>
);
