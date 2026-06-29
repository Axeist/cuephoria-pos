
import { useState } from 'react';
import { CartItem } from '@/types/pos.types';
import { useToast } from '@/hooks/use-toast';
import { clampQuantityToStock } from '@/utils/cartStock.utils';
import { cartItemsMatch, findCartItem, totalProductQuantityInCart } from '@/utils/cartItem.utils';
import type { TaxSettings } from '@/hooks/useAppSettings.types';
import { computeBillTaxFromCart } from '@/utils/tax.utils';

export const useCart = (taxSettings?: TaxSettings) => {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [discount, setDiscountAmount] = useState<number>(0);
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>('percentage');
  const [loyaltyPointsUsed, setLoyaltyPointsUsedAmount] = useState<number>(0);
  const [isSplitPayment, setIsSplitPayment] = useState<boolean>(false);
  const [cashAmount, setCashAmount] = useState<number>(0);
  const [upiAmount, setUpiAmount] = useState<number>(0);
  const { toast } = useToast();
  
  const addToCart = (item: Omit<CartItem, 'total'>, availableStock?: number) => {
    try {
      setCart((prev) => {
        let nextItem = item;

        if (
          nextItem.type === 'product' &&
          nextItem.category !== 'membership' &&
          typeof availableStock === 'number'
        ) {
          const currentCartQuantity = totalProductQuantityInCart(prev, nextItem.id);
          const totalRequestedQuantity = currentCartQuantity + nextItem.quantity;

          if (totalRequestedQuantity > availableStock) {
            if (availableStock <= currentCartQuantity) {
              toast({
                title: 'Insufficient Stock',
                description: `Only ${availableStock} units of ${nextItem.name} available (${currentCartQuantity} already in cart)`,
                variant: 'destructive',
              });
              return prev;
            }

            const adjustedQuantity = availableStock - currentCartQuantity;
            toast({
              title: 'Stock Limited',
              description: `Only added ${adjustedQuantity} units of ${nextItem.name} (stock limit reached)`,
              variant: 'destructive',
            });
            nextItem = { ...nextItem, quantity: adjustedQuantity };
          }
        }

        const existingItem = findCartItem(prev, nextItem);

        if (existingItem) {
          toast({
            title: 'Item Updated',
            description: `Increased quantity of ${nextItem.name}`,
          });
          return prev.map((i) =>
            cartItemsMatch(i, nextItem)
              ? {
                  ...i,
                  quantity: i.quantity + nextItem.quantity,
                  total: (i.quantity + nextItem.quantity) * i.price,
                }
              : i,
          );
        }

        toast({
          title: 'Item Added',
          description: `Added ${nextItem.name} to cart`,
        });
        const newItem = { ...nextItem, total: nextItem.quantity * nextItem.price };
        return [...prev, newItem];
      });
    } catch (error) {
      console.error('Error adding to cart:', error);
      toast({
        title: 'Error',
        description: 'Failed to add item to cart',
        variant: 'destructive',
      });
    }
  };
  
  const removeFromCart = (id: string, stationName?: string) => {
    try {
      setCart((prev) => {
        const itemToRemove =
          findCartItem(prev, { id, type: 'product', stationName }) ??
          findCartItem(prev, { id, type: 'session', stationName }) ??
          prev.find((i) => i.id === id);

        if (!itemToRemove) return prev;

        toast({
          title: 'Item Removed',
          description: `Removed ${itemToRemove.name} from cart`,
        });
        return prev.filter((i) => !cartItemsMatch(i, itemToRemove));
      });
    } catch (error) {
      console.error("Error removing from cart:", error);
      toast({
        title: "Error",
        description: "Failed to remove item",
        variant: "destructive"
      });
    }
  };
  
  const updateCartItem = (
    id: string,
    quantity: number,
    stockLimit?: number,
    stationName?: string
  ) => {
    try {
      if (quantity <= 0) {
        removeFromCart(id, stationName);
        return;
      }

      setCart((prev) => {
        const cartItem =
          findCartItem(prev, { id, type: 'product', stationName }) ??
          findCartItem(prev, { id, type: 'session', stationName });
        const limit =
          cartItem?.type === 'product' &&
          cartItem.category !== 'membership' &&
          typeof stockLimit === 'number'
            ? stockLimit
            : null;

        const { quantity: nextQty, blocked, capped } = clampQuantityToStock(quantity, limit);

        if (blocked) {
          toast({
            title: 'Insufficient Stock',
            description: `No more units of ${cartItem?.name ?? 'this item'} available`,
            variant: 'destructive',
          });
          return prev;
        }

        if (capped && cartItem) {
          toast({
            title: 'Stock Limited',
            description: `Only ${nextQty} unit(s) of ${cartItem.name} available`,
            variant: 'destructive',
          });
        }

        if (!cartItem) return prev;

        return prev.map((i) =>
          cartItemsMatch(i, cartItem)
            ? { ...i, quantity: nextQty, total: nextQty * i.price }
            : i,
        );
      });
    } catch (error) {
      console.error("Error updating cart item:", error);
      toast({
        title: "Error",
        description: "Failed to update item",
        variant: "destructive"
      });
    }
  };
  
  const clearCart = (options?: { silent?: boolean }) => {
    setCart([]);
    setDiscountAmount(0);
    setLoyaltyPointsUsedAmount(0);
    resetPaymentInfo();
    if (!options?.silent) {
      toast({
        title: "Cart Cleared",
        description: "All items removed from cart",
      });
    }
  };
  
  const setDiscount = (amount: number, type: 'percentage' | 'fixed') => {
    setDiscountAmount(amount);
    setDiscountType(type);
    toast({
      title: "Discount Applied",
      description: `${type === 'percentage' ? amount + '%' : '₹' + amount} discount applied`,
    });
  };
  
  const setLoyaltyPointsUsed = (points: number) => {
    setLoyaltyPointsUsedAmount(points);
    if (points > 0) {
      toast({
        title: "Loyalty Points Applied",
        description: `${points} loyalty points used`,
      });
    }
  };
  
  const setSplitPayment = (split: boolean) => {
    setIsSplitPayment(split);
    if (split) {
      // Initialize split amounts when enabling split payment
      const total = calculateTotal();
      setCashAmount(Math.floor(total / 2)); // Default to half cash
      setUpiAmount(total - Math.floor(total / 2)); // Remaining amount to UPI
    }
  };
  
  const updateSplitAmounts = (cash: number, upi: number) => {
    const total = calculateTotal();
    if (Math.abs((cash + upi) - total) > 0.01) { // Allow small rounding errors
      toast({
        title: "Invalid Split",
        description: `Split amounts (₹${(cash + upi).toFixed(2)}) don't match total (₹${total.toFixed(2)})`,
        variant: "destructive"
      });
      return false;
    }
    
    setCashAmount(cash);
    setUpiAmount(upi);
    return true;
  };
  
  const calculateTotal = () => {
    const subtotal = cart.reduce((sum, item) => sum + item.total, 0);

    if (taxSettings) {
      return computeBillTaxFromCart(
        subtotal,
        discount,
        discountType,
        loyaltyPointsUsed,
        taxSettings,
      ).total;
    }
    
    let discountValue = 0;
    if (discountType === 'percentage') {
      discountValue = subtotal * (discount / 100);
    } else {
      discountValue = discount;
    }
    
    const loyaltyDiscount = loyaltyPointsUsed;
    
    return Math.max(0, subtotal - discountValue - loyaltyDiscount);
  };

  const getTaxBreakdown = () => {
    const subtotal = cart.reduce((sum, item) => sum + item.total, 0);
    if (!taxSettings) {
      let discountValue = 0;
      if (discountType === 'percentage') {
        discountValue = subtotal * (discount / 100);
      } else {
        discountValue = discount;
      }
      const total = Math.max(0, subtotal - discountValue - loyaltyPointsUsed);
      return {
        taxableAmount: total,
        taxAmount: 0,
        taxRate: 0,
        total,
      };
    }
    return computeBillTaxFromCart(
      subtotal,
      discount,
      discountType,
      loyaltyPointsUsed,
      taxSettings,
    );
  };
  
  const resetPaymentInfo = () => {
    setIsSplitPayment(false);
    setCashAmount(0);
    setUpiAmount(0);
  };
  
  return {
    cart,
    setCart,
    discount,
    setDiscountAmount,
    discountType,
    setDiscountType,
    loyaltyPointsUsed,
    setLoyaltyPointsUsedAmount,
    isSplitPayment,
    setIsSplitPayment: setSplitPayment,
    cashAmount,
    setCashAmount,
    upiAmount,
    setUpiAmount,
    updateSplitAmounts,
    addToCart,
    removeFromCart,
    updateCartItem,
    clearCart,
    setDiscount,
    setLoyaltyPointsUsed,
    calculateTotal,
    getTaxBreakdown,
    resetPaymentInfo
  };
};
