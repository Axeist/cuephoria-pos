import { cn } from "@/lib/utils";
import {
  PAYMENT_PROVIDER_ASSETS,
  type PaymentProviderBrand,
} from "@/branding/paymentProviders";

type Props = {
  provider: PaymentProviderBrand;
  size?: "sm" | "md" | "lg";
  /** logo = full wordmark; icon = mark only; auto = icon at sm, logo otherwise (Razorpay). */
  variant?: "logo" | "icon" | "auto";
  className?: string;
  /** Dark patch behind logo — for marks on black backgrounds. */
  padded?: boolean;
};

const HEIGHT = { sm: "h-5", md: "h-7", lg: "h-9" } as const;
const ICON_HEIGHT = { sm: "h-5", md: "h-6", lg: "h-8" } as const;

function resolveImageSrc(
  provider: PaymentProviderBrand,
  variant: "logo" | "icon" | "auto",
  size: "sm" | "md" | "lg",
): { src: string; isIcon: boolean } {
  const asset = PAYMENT_PROVIDER_ASSETS[provider];
  const useIcon =
    provider === "razorpay" &&
    (variant === "icon" || (variant === "auto" && size === "sm"));
  if (useIcon && "iconUrl" in asset && asset.iconUrl) {
    return { src: asset.iconUrl, isIcon: true };
  }
  return { src: asset.logoUrl, isIcon: false };
}

export default function PaymentProviderBrand({
  provider,
  size = "md",
  variant = "auto",
  className,
  padded = true,
}: Props) {
  const asset = PAYMENT_PROVIDER_ASSETS[provider];
  const { src, isIcon } = resolveImageSrc(provider, variant, size);
  const heightClass = isIcon ? ICON_HEIGHT[size] : HEIGHT[size];

  const img = (
    <img
      src={src}
      alt={asset.logoAlt}
      className={cn(heightClass, "w-auto object-contain", className)}
      loading="lazy"
      decoding="async"
    />
  );

  const showPatch = padded && !isIcon;

  if (!showPatch) return img;

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
