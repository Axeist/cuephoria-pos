import React from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CurrencyDisplay } from "@/components/ui/currency";
import { usePOS, type Product } from "@/context/POSContext";
import { cn } from "@/lib/utils";

type MobileProductGridProps = {
  products: Product[];
  className?: string;
};

/**
 * Compact 2-column product picker for mobile POS — tap to add, minimal scroll height.
 */
export function MobileProductGrid({ products, className }: MobileProductGridProps) {
  const { addToCart, cart } = usePOS();

  const handleAdd = (product: Product) => {
    if (product.category !== "membership") {
      const inCart = cart.find(
        (item) => item.id === product.id && item.type === "product",
      );
      if ((inCart?.quantity ?? 0) >= product.stock) return;
    }

    addToCart(
      {
        id: product.id,
        type: "product",
        name: product.name,
        price: product.price,
        quantity: 1,
        category: product.category,
      },
      product.category !== "membership" ? product.stock : undefined,
    );
  };

  if (products.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        No products in this category
      </p>
    );
  }

  return (
    <div className={cn("grid grid-cols-2 gap-2", className)}>
      {products.map((product) => {
        const inCart = cart.find(
          (item) => item.id === product.id && item.type === "product",
        );
        const atStockLimit =
          product.category !== "membership" &&
          (inCart?.quantity ?? 0) >= product.stock;

        return (
          <button
            key={product.id}
            type="button"
            disabled={atStockLimit}
            onClick={() => handleAdd(product)}
            className={cn(
              "relative flex min-h-[4.5rem] flex-col items-start gap-0.5 rounded-xl border border-white/10 bg-white/[0.04] p-2.5 text-left touch-manipulation transition-transform active:scale-[0.98]",
              atStockLimit && "opacity-40",
            )}
          >
            <span className="line-clamp-2 text-xs font-semibold leading-tight text-white">
              {product.name}
            </span>
            <CurrencyDisplay
              amount={product.price}
              className="text-xs font-bold text-cuephoria-lightpurple"
            />
            {product.category !== "membership" ? (
              <span className="text-[10px] text-muted-foreground">
                {product.stock} left
                {(inCart?.quantity ?? 0) > 0 ? ` · ${inCart!.quantity} in cart` : ""}
              </span>
            ) : null}
            <span className="absolute bottom-2 right-2">
              <Plus className="h-3.5 w-3.5 text-cuephoria-lightpurple/80" />
            </span>
          </button>
        );
      })}
    </div>
  );
}
