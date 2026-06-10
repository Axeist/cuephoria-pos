/** Official payment gateway marks (served from /public/branding). */
export const PAYMENT_PROVIDER_ASSETS = {
  razorpay: {
    logoUrl: "/branding/razorpay-logo.png",
    iconUrl: "/branding/razorpay-icon.png",
    logoAlt: "Razorpay",
  },
  stripe: {
    logoUrl: "/branding/stripe-logo.png",
    logoAlt: "Stripe",
  },
} as const;

export type PaymentProviderBrand = keyof typeof PAYMENT_PROVIDER_ASSETS;
