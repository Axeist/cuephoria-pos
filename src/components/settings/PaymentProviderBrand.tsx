import { cn } from "@/lib/utils";
import {
  PAYMENT_PROVIDER_ASSETS,
  type PaymentProviderBrand,
} from "@/branding/paymentProviders";

type Props = {
  provider: PaymentProviderBrand;
  size?: "sm" | "md" | "lg";
  className?: string;
  /** Dark patch behind logo — logos ship on black backgrounds. */
  padded?: boolean;
};

const HEIGHT = { sm: "h-5", md: "h-7", lg: "h-9" } as const;

export default function PaymentProviderBrand({
  provider,
  size = "md",
  className,
  padded = true,
}: Props) {
  const asset = PAYMENT_PROVIDER_ASSETS[provider];
  const img = (
    <img
      src={asset.logoUrl}
      alt={asset.logoAlt}
      className={cn(HEIGHT[size], "w-auto object-contain", className)}
      loading="lazy"
      decoding="async"
    />
  );

  if (!padded) return img;

  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-md bg-[#0a0a0a] border border-white/5",
        size === "sm" && "px-2 py-1",
        size === "md" && "px-3 py-1.5",
        size === "lg" && "px-4 py-2",
      )}
    >
      {img}
    </span>
  );
}
