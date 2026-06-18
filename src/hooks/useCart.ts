
import { useState } from 'react';
import { CartItem } from '@/types/pos.types';
import { useToast } from '@/hooks/use-toast';

export const useCart = () => {
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
      // For non-membership products, check available stock
      if (item.type === 'product' && item.category !== 'membership' && typeof availableStock === 'number') {
        const existingItem = cart.find(i => i.id === item.id && i.type === item.type);
        const currentCartQuantity = existingItem ? existingItem.quantity : 0;
        const totalRequestedQuantity = currentCartQuantity + item.quantity;
        
        // Check if we have enough stock
        if (totalRequestedQuantity > availableStock) {
          // If not enough stock, adjust quantity or show error
          if (availableStock <= currentCartQuantity) {
            toast({
              title: "Insufficient Stock",
              description: `Only ${availableStock} units of ${item.name} available (${currentCartQuantity} already in cart)`,
              variant: "destructive"
            });
            return;
          }
          
          // Adjust quantity to match available stock
          const adjustedQuantity = availableStock - currentCartQuantity;
          toast({
            title: "Stock Limited",
            description: `Only added ${adjustedQuantity} units of ${item.name} (stock limit reached)`,
            variant: "destructive"
          });
          
          // Update item quantity to what's available
          item = { ...item, quantity: adjustedQuantity };
        }
      }
      
      const existingItem = cart.find(i => i.id === item.id && i.type === item.type);
      
      if (existingItem) {
        const updatedCart = cart.map(i => 
          i.id === item.id && i.type === item.type
            ? { ...i, quantity: i.quantity + item.quantity, total: (i.quantity + item.quantity) * i.price }
            : i
        );
        setCart(updatedCart);
        toast({
          title: "Item Updated",
          description: `Increased quantity of ${item.name}`,
        });
      } else {
        const newItem = { ...item, total: item.quantity * item.price };
        setCart([...cart, newItem]);
        toast({
          title: "Item Added",
          description: `Added ${item.name} to cart`,
        });
      }
    } catch (error) {
      console.error("Error adding to cart:", error);
      toast({
        title: "Error",
        description: "Failed to add item to cart",
        variant: "destructive"
      });
    }
  };
  
  const removeFromCart = (id: string) => {
    try {
      const itemToRemove = cart.find(i => i.id === id);
      setCart(cart.filter(i => i.id !== id));
      
      if (itemToRemove) {
        toast({
          title: "Item Removed",
          description: `Removed ${itemToRemove.name} from cart`,
        });
      }
    } catch (error) {
      console.error("Error removing from cart:", error);
      toast({
        title: "Error",
        description: "Failed to remove item",
        variant: "destructive"
      });
    }
  };
  
  const updateCartItem = (id: string, quantity: number) => {
    try {
      if (quantity <= 0) {
        removeFromCart(id);
        return;
      }
      
      const updatedCart = cart.map(i => 
        i.id === id
          ? { ...i, quantity, total: quantity * i.price }
          : i
      );
      
      setCart(updatedCart);
      toast({
        title: "Item Updated",
        description: "Updated quantity in cart",
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
  
  const clearCart = () => {
    setCart([]);
    setDiscountAmount(0);
    setLoyaltyPointsUsedAmount(0);
    resetPaymentInfo();
    toast({
      title: "Cart Cleared",
      description: "All items removed from cart",
    });
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
    
    let discountValue = 0;
    if (discountType === 'percentage') {
      discountValue = subtotal * (discount / 100);
    } else {
      discountValue = discount;
    }
    
    const loyaltyDiscount = loyaltyPointsUsed;
    
    return Math.max(0, subtotal - discountValue - loyaltyDiscount);
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
    resetPaymentInfo
  };
};
