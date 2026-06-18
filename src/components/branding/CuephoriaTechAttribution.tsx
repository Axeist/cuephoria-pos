import React from "react";
import { PARENT_BRAND, PRODUCT_BRAND } from "@/branding/brand";
import { cn } from "@/lib/utils";

type AttributionVariant = "built-by" | "powered-by" | "compact" | "footer";

interface CuephoriaTechAttributionProps {
  variant?: AttributionVariant;
  className?: string;
  /** Hide the Cuetronix product link (parent-only attribution). */
  parentOnly?: boolean;
}

/**
 * Standard “built by Cuephoria Tech” attribution for app shells and public surfaces.
 * Cuetronix remains the product; Cuephoria Tech is always credited as the builder.
 */
const CuephoriaTechAttribution: React.FC<CuephoriaTechAttributionProps> = ({
  variant = "powered-by",
  className,
  parentOnly = false,
}) => {
  const parentLink = (
    <a
      href={PARENT_BRAND.websiteUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="font-semibold text-violet-300/90 transition-colors hover:text-violet-200"
    >
      {PARENT_BRAND.name}
    </a>
  );

  const productLink = (
    <a
      href={PRODUCT_BRAND.websiteUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="font-semibold text-zinc-200 transition-colors hover:text-white"
    >
      {PRODUCT_BRAND.name}
    </a>
  );

  if (variant === "built-by") {
    return (
      <p className={cn("font-mono text-[9px] uppercase tracking-[0.28em] text-violet-300/45", className)}>
        {PRODUCT_BRAND.name} · built by{" "}
        <a
          href={PARENT_BRAND.websiteUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-violet-300/70 transition-colors hover:text-violet-200"
        >
          {PARENT_BRAND.name}
        </a>
      </p>
    );
  }

  if (variant === "compact") {
    return (
      <p className={cn("text-[11px] text-zinc-500", className)}>
        A{" "}
        <a
          href={PARENT_BRAND.websiteUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-zinc-400 transition-colors hover:text-white"
        >
          {PARENT_BRAND.name}
        </a>{" "}
        product
      </p>
    );
  }

  if (variant === "footer") {
    return (
      <p className={cn("text-gray-500", className)}>
        © {new Date().getFullYear()}{" "}
        <a
          href={PARENT_BRAND.websiteUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-gray-400 transition-colors hover:text-white"
        >
          {PARENT_BRAND.name}
        </a>
        {!parentOnly ? (
          <>
            {" "}
            · {PRODUCT_BRAND.name} · Made in India
          </>
        ) : null}
      </p>
    );
  }

  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-center gap-x-1.5 gap-y-0.5 text-[11px] text-zinc-500",
        className,
      )}
    >
      {!parentOnly ? (
        <>
          <span>Powered by</span>
          {productLink}
          <span className="text-zinc-600">·</span>
        </>
      ) : null}
      <span>Built by</span>
      {parentLink}
    </div>
  );
};

export default CuephoriaTechAttribution;
