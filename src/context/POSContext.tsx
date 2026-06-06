import React, { createContext, useContext, useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { 
  POSContextType, 
  ResetOptions, 
  Customer, 
  CartItem, 
  Bill,
  Product,
  Station,
  Session,
  SessionEndCheckoutMode,
} from '@/types/pos.types';
import type { PrepaidBookingLink } from '@/types/prepaidBooking.types';
import { useProducts } from '@/hooks/useProducts';
import { useCustomers } from '@/hooks/useCustomers';
import { useStations } from '@/hooks/useStations';
import { useCart } from '@/hooks/useCart';
import { useStationQuickShop } from '@/hooks/useStationQuickShop';
import { useSavedCarts } from '@/hooks/useSavedCarts';
import { useBills } from '@/hooks/useBills';
import { useToast } from '@/hooks/use-toast';
import { supabase, handleSupabaseError } from '@/integrations/supabase/client';
import { useLocation } from '@/context/LocationContext';
import { clampCartItemsToStock, getProductStockLimit } from '@/utils/cartStock.utils';
import { mergeSessionCartItems } from '@/utils/sessionCartMerge';
import { isSessionOnlyCart } from '@/utils/savedCart.utils';
import {
  getPrepaidOvertimeMs,
  sessionNeedsPosCheckout,
  getChargeableCartItems,
  prepaidCheckoutHasExtraCharges,
} from '@/utils/prepaidBooking.utils';
import { getBillableMs, resolveSessionForBilling } from '@/utils/sessionTimer.utils';

const POSContext = createContext<POSContextType>({
  products: [],
  productsLoading: false,
  productsError: null,
  stations: [],
  customers: [],
  sessions: [],
  bills: [],
  cart: [],
  selectedCustomer: null,
  discount: 0,
  discountType: 'percentage',
  loyaltyPointsUsed: 0,
  isStudentDiscount: false,
  isSplitPayment: false,
  cashAmount: 0,
  upiAmount: 0,
  categories: ['uncategorized'],
  setIsStudentDiscount: () => {},
  setBills: () => {},
  setCustomers: () => {},
  setStations: () => {},
  addProduct: () => ({}),
  updateProduct: () => ({}),
  deleteProduct: () => {},
  addCategory: () => {},
  updateCategory: () => {},
  deleteCategory: () => {},
  startSession: async () => {},
  endSession: async () => {},
  endSessionGroup: async () => {},
  pauseSession: async () => {},
  resumeSession: async () => {},
  extendSession: async () => {},
  moveSession: async () => {},
  deleteStation: async () => false,
  updateStation: async () => false,
  refreshStations: async () => {},
  addCustomer: () => ({}),
  updateCustomer: () => ({}),
  updateCustomerMembership: () => null,
  deleteCustomer: () => {},
  selectCustomer: () => {},
  loadSavedCartForCheckout: () => {},
  checkMembershipValidity: () => false,
  deductMembershipHours: () => false,
  addToCart: () => {},
  removeFromCart: () => {},
  updateCartItem: () => {},
  clearCart: () => {},
  savedCarts: [],
  savedCartsLoading: false,
  refreshSavedCarts: async () => {},
  removeSavedCart: async () => {},
  removeAllSavedCarts: async () => 0,
  moveCartToSaved: async () => {},
  getStationQuickShopItems: () => [],
  addToStationQuickShop: () => {},
  updateStationQuickShopQuantity: () => {},
  removeFromStationQuickShop: () => {},
  setDiscount: () => {},
  setLoyaltyPointsUsed: () => {},
  calculateTotal: () => 0,
  completeSale: () => undefined,
  updateBill: async () => null,
  realiseCreditPayment: async () => null,
  deleteBill: async () => false,
  exportBills: () => {},
  exportCustomers: () => {},
  resetToSampleData: () => {},
  addSampleIndianData: () => {},
  setIsSplitPayment: () => {},
  setCashAmount: () => {},
  setUpiAmount: () => {},
  updateSplitAmounts: () => false
});

export const POSProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  
  const [isStudentDiscount, setIsStudentDiscount] = useState<boolean>(false);
  
  const [categories, setCategories] = useState<string[]>(['uncategorized']);
  
  const { 
    products, 
    loading: productsLoading,
    error: productsError,
    setProducts, 
    addProduct, 
    updateProduct, 
    deleteProduct,
    refreshFromDB
  } = useProducts();
  
  const { 
    customers, 
    setCustomers, 
    selectedCustomer, 
    setSelectedCustomer, 
    addCustomer, 
    updateCustomer,
    updateCustomerMembership,
    deleteCustomer, 
    selectCustomer,
    checkMembershipValidity,
    deductMembershipHours
  } = useCustomers([]);
  
  const { 
    stations, 
    setStations, 
    sessions, 
    setSessions, 
    startSession: startSessionBase, 
    endSession: endSessionBase,
    endSessionGroup: endSessionGroupBase,
    pauseSession: pauseSessionBase,
    resumeSession: resumeSessionBase,
    extendSession: extendSessionBase,
    moveSession: moveSessionBase,
    deleteStation,
    updateStation,
    refreshStations,
  } = useStations([], updateCustomer);
  
  const { 
    cart, 
    setCart, 
    discount, 
    setDiscountAmount, 
    discountType, 
    setDiscountType, 
    loyaltyPointsUsed, 
    setLoyaltyPointsUsedAmount, 
    isSplitPayment,
    setIsSplitPayment,
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
  } = useCart();

  const { toast } = useToast();
  const { activeLocationId } = useLocation();
  /** When set, the next saved-cart restore for this customer may load session-only drafts (checkout handoff). */
  const forceLoadSavedCartCustomerIdRef = useRef<string | null>(null);

  const addToCartWithStock = useCallback(
    (item: Omit<CartItem, 'total'>) => {
      const product = products.find((p) => p.id === item.id);
      const stockLimit = getProductStockLimit(product);
      addToCart(item, stockLimit ?? undefined);
    },
    [products, addToCart]
  );

  const updateCartItemWithStock = useCallback(
    (id: string, quantity: number, stationName?: string) => {
      const cartItem =
        cart.find(
          (i) =>
            i.id === id && (stationName === undefined || (i.stationName ?? '') === stationName)
        ) ?? cart.find((i) => i.id === id);
      const product = products.find((p) => p.id === id);
      const stockLimit = getProductStockLimit(product);
      if (cartItem?.type === 'product' && stockLimit !== null) {
        updateCartItem(id, quantity, stockLimit, cartItem.stationName);
      } else {
        updateCartItem(id, quantity, undefined, cartItem?.stationName);
      }
    },
    [cart, products, updateCartItem]
  );

  // Fix carts that exceed on-hand stock (e.g. after increasing qty before this guard existed).
  useEffect(() => {
    if (!products.length || !cart.length) return;
    const needsClamp = cart.some((item) => {
      if (item.type !== 'product' || item.category === 'membership') return false;
      const limit = getProductStockLimit(products.find((p) => p.id === item.id));
      return limit !== null && item.quantity > limit;
    });
    if (!needsClamp) return;
    setCart(clampCartItemsToStock(cart, products));
    toast({
      title: 'Cart adjusted',
      description: 'Some quantities were reduced to match available stock.',
      variant: 'destructive',
    });
  }, [cart, products, setCart, toast]);

  const {
    itemsBySession,
    getStationQuickShopItems,
    addToStationQuickShop,
    updateStationQuickShopQuantity,
    removeFromStationQuickShop,
    clearStationQuickShopSession,
  } = useStationQuickShop();

  const {
    savedCarts,
    loading: savedCartsLoading,
    refreshSavedCarts,
    persistSavedCart,
    schedulePersistSavedCart,
    loadSavedCartForCustomer,
    removeSavedCart,
    removeAllSavedCarts,
  } = useSavedCarts(activeLocationId);
  
  const { 
    bills, 
    setBills, 
    completeSale: completeSaleBase, 
    deleteBill: deleteBillBase,
    updateBill: updateBillBase,
    realiseCreditPayment: realiseCreditPaymentBase,
    exportBills: exportBillsBase, 
    exportCustomers: exportCustomersBase 
  } = useBills(updateCustomer, updateProduct);

  // Load saved cart from DB when customer is selected
  useEffect(() => {
    if (!selectedCustomer || !activeLocationId) return;

    let cancelled = false;

    setCart([]);
    setDiscountAmount(0);
    setDiscountType('percentage');
    setLoyaltyPointsUsedAmount(0);

    void loadSavedCartForCustomer(selectedCustomer.id).then((savedCartData) => {
      if (cancelled || !savedCartData?.items.length) return;

      const forceLoad =
        forceLoadSavedCartCustomerIdRef.current === selectedCustomer.id;
      if (forceLoad) {
        forceLoadSavedCartCustomerIdRef.current = null;
      }

      if (isSessionOnlyCart(savedCartData.items) && !forceLoad) {
        return;
      }

      setCart(clampCartItemsToStock(savedCartData.items, products));
      setDiscountAmount(Number(savedCartData.discount ?? 0));
      setDiscountType(savedCartData.discount_type ?? 'percentage');
      setLoyaltyPointsUsedAmount(Number(savedCartData.loyalty_points_used ?? 0));

      toast({
        title: 'Cart Restored',
        description: `Loaded ${savedCartData.items.length} item(s) from ${selectedCustomer.name}'s saved cart`,
        duration: 3000,
      });
    });

    return () => {
      cancelled = true;
    };
  }, [selectedCustomer?.id, activeLocationId, loadSavedCartForCustomer, products, setCart, setDiscountAmount, setDiscountType, setLoyaltyPointsUsedAmount, toast]);

  const loadSavedCartForCheckout = useCallback(
    (customerId: string) => {
      forceLoadSavedCartCustomerIdRef.current = customerId;
      selectCustomer(customerId);
    },
    [selectCustomer]
  );

  const handleClearCart = useCallback(
    async (options?: { silent?: boolean; skipSavedCartDelete?: boolean }) => {
      if (!options?.skipSavedCartDelete && selectedCustomer && activeLocationId) {
        try {
          await removeSavedCart(selectedCustomer.id);
        } catch (error) {
          console.error('handleClearCart: failed to remove saved cart', error);
        }
      }
      clearCart(options);
    },
    [selectedCustomer, activeLocationId, removeSavedCart, clearCart]
  );

  // Debounced sync to DB while building a cart (global across terminals).
  // Preserve session-only draft lines from group partial ends — never overwrite them.
  useEffect(() => {
    if (!selectedCustomer || !activeLocationId || cart.length === 0) return;

    let cancelled = false;

    const timer = window.setTimeout(() => {
      void (async () => {
        const saved = await loadSavedCartForCustomer(selectedCustomer.id);
        if (cancelled) return;

        const sessionDraftLines = (saved?.items ?? []).filter((item) => item.type === 'session');
        const liveLines = cart.filter((item) => item.type !== 'session');
        const merged =
          sessionDraftLines.length > 0
            ? mergeSessionCartItems(sessionDraftLines, liveLines, [])
            : cart;

        schedulePersistSavedCart(
          selectedCustomer.id,
          selectedCustomer.name,
          merged,
          discount,
          discountType,
          loyaltyPointsUsed
        );
      })();
    }, 800);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [cart, discount, discountType, loyaltyPointsUsed, selectedCustomer?.id, selectedCustomer?.name, activeLocationId, loadSavedCartForCustomer, schedulePersistSavedCart]);

  const moveCartToSaved = useCallback(async () => {
    if (!selectedCustomer) {
      toast({
        title: 'No Customer Selected',
        description: 'Select a customer before saving the cart.',
        variant: 'destructive',
      });
      return;
    }

    if (cart.length === 0) {
      toast({
        title: 'Empty Cart',
        description: 'Add items before saving the cart.',
        variant: 'destructive',
      });
      return;
    }

    try {
      const customerName = selectedCustomer.name;

      await persistSavedCart(
        selectedCustomer.id,
        customerName,
        cart,
        discount,
        discountType,
        loyaltyPointsUsed
      );

      clearCart({ silent: true, skipSavedCartDelete: true });
      selectCustomer(null);

      toast({
        title: 'Cart Saved',
        description: `${customerName}'s cart is now in Saved Carts.`,
      });
    } catch (error) {
      console.error('moveCartToSaved failed:', error);
      toast({
        title: 'Save Failed',
        description: 'Could not save the cart. Please try again.',
        variant: 'destructive',
      });
    }
  }, [
    selectedCustomer,
    cart,
    discount,
    discountType,
    loyaltyPointsUsed,
    persistSavedCart,
    clearCart,
    selectCustomer,
    toast,
  ]);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        if (!activeLocationId) return;

        const { data, error } = await supabase
          .from('categories')
          .select('name')
          .eq('location_id', activeLocationId);
        
        if (error) {
          console.error('Error fetching categories:', error);
          return;
        }

        if (data && data.length > 0) {
          const dbCategories = data.map(item => item.name.toLowerCase());
          
          if (!dbCategories.includes('uncategorized')) {
            try {
              await supabase
                .from('categories')
                .upsert(
                  { name: 'uncategorized', location_id: activeLocationId },
                  { onConflict: 'name,location_id', ignoreDuplicates: true }
                );
              dbCategories.push('uncategorized');
            } catch (err) {
              console.error('Error creating uncategorized category:', err);
            }
          }
          
          setCategories(dbCategories);
          localStorage.setItem('cuephoriaCategories', JSON.stringify(dbCategories));
          console.log('Categories loaded from database:', dbCategories);
        } else {
          const defaultCategories = ['uncategorized'];
          
          const { error: seedError } = await supabase
            .from('categories')
            .upsert(
              defaultCategories.map(name => ({ name, location_id: activeLocationId })),
              { onConflict: 'name,location_id', ignoreDuplicates: true }
            );

          if (seedError) {
            console.error('Error seeding default categories:', seedError);
          }
          
          setCategories(defaultCategories);
          localStorage.setItem('cuephoriaCategories', JSON.stringify(defaultCategories));
  console.log('Default categories created:', defaultCategories);
        }
      } catch (error) {
        console.error('Error in fetchCategories:', error);
      }
    };

    fetchCategories();
  }, [activeLocationId]);

  const addCategory = async (category: string) => {
    try {
      const trimmedCategory = category.trim().toLowerCase();
      
      if (!trimmedCategory) {
        return;
      }
      
      if (categories.some(cat => cat.toLowerCase() === trimmedCategory)) {
        toast({
          title: 'Error',
          description: `Category "${trimmedCategory}" already exists`,
          variant: 'destructive',
        });
        return;
      }
      
      const { error } = await supabase
        .from('categories')
        .insert({ name: trimmedCategory, location_id: activeLocationId });
        
      if (error) {
        console.error('Error adding category to Supabase:', error);
        toast({
          title: 'Error',
          description: `Failed to add category "${trimmedCategory}" to database: ${handleSupabaseError(error, 'insert')}`,
          variant: 'destructive',
        });
        return;
      }
      
      setCategories(prev => {
        const updated = [...prev, trimmedCategory];
        localStorage.setItem('cuephoriaCategories', JSON.stringify(updated));
        return updated;
      });
      
      toast({
        title: 'Success',
        description: `Category "${trimmedCategory}" has been added`,
      });
    } catch (error) {
      console.error('Error in addCategory:', error);
      toast({
        title: 'Error',
        description: 'Failed to add category. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const updateCategory = async (oldCategory: string, newCategory: string) => {
    try {
      if (oldCategory.toLowerCase() === 'uncategorized') {
        toast({
          title: 'Error',
          description: `The "uncategorized" category cannot be renamed`,
          variant: 'destructive',
        });
        return;
      }
      
      const trimmedNewCategory = newCategory.trim().toLowerCase();
      
      if (oldCategory === newCategory || !trimmedNewCategory) {
        return;
      }
      
      if (categories.some(cat => cat.toLowerCase() === trimmedNewCategory && cat.toLowerCase() !== oldCategory.toLowerCase())) {
        toast({
          title: 'Error',
          description: `Category "${trimmedNewCategory}" already exists`,
          variant: 'destructive',
        });
        return;
      }
      
      const { error } = await supabase
        .from('categories')
        .update({ name: trimmedNewCategory })
        .eq('name', oldCategory.toLowerCase())
        .eq('location_id', activeLocationId);
        
      if (error) {
        console.error('Error updating category in Supabase:', error);
        toast({
          title: 'Error',
          description: `Failed to update category from "${oldCategory}" to "${trimmedNewCategory}": ${handleSupabaseError(error, 'update')}`,
          variant: 'destructive',
        });
        return;
      }
      
      setProducts(prev =>
        prev.map(product => 
          product.category.toLowerCase() === oldCategory.toLowerCase() 
            ? { ...product, category: trimmedNewCategory } 
            : product
        )
      );
      
      const { error: updateProductsError } = await supabase
        .from('products')
        .update({ category: trimmedNewCategory })
        .eq('category', oldCategory)
        .eq('location_id', activeLocationId);
        
      if (updateProductsError) {
        console.error('Error updating products category in Supabase:', updateProductsError);
      }
      
      setCategories(prev => {
        const updated = prev.map(cat => 
          cat.toLowerCase() === oldCategory.toLowerCase() ? trimmedNewCategory : cat
        );
        localStorage.setItem('cuephoriaCategories', JSON.stringify(updated));
        return updated;
      });
      
      toast({
        title: 'Success',
        description: `Category updated from "${oldCategory}" to "${trimmedNewCategory}"`,
      });
    } catch (error) {
      console.error('Error in updateCategory:', error);
      toast({
        title: 'Error',
        description: 'Failed to update category. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const deleteCategory = async (category: string) => {
    try {
      const lowerCategory = category.toLowerCase();
      
      if (lowerCategory === 'uncategorized') {
        toast({
          title: 'Error',
          description: `The "uncategorized" category cannot be deleted`,
          variant: 'destructive',
        });
        return;
      }
      
      const productsWithCategory = products.filter(
        p => p.category.toLowerCase() === lowerCategory
      );
      
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('name', lowerCategory)
        .eq('location_id', activeLocationId);
        
      if (error) {
        console.error('Error deleting category from Supabase:', error);
        toast({
          title: 'Error',
          description: `Failed to delete category "${category}" from database: ${handleSupabaseError(error, 'delete')}`,
          variant: 'destructive',
        });
        return;
      }
      
      if (productsWithCategory.length > 0) {
        setProducts(prev =>
          prev.map(product => 
            product.category.toLowerCase() === lowerCategory
              ? { ...product, category: 'uncategorized' } 
              : product
          )
        );
        
        const { error: updateProductsError } = await supabase
          .from('products')
          .update({ category: 'uncategorized' })
          .eq('category', lowerCategory)
          .eq('location_id', activeLocationId);
          
        if (updateProductsError) {
          console.error('Error updating products category in Supabase:', updateProductsError);
        }
      }
      
      setCategories(prev => {
        const updated = prev.filter(cat => cat.toLowerCase() !== lowerCategory);
        localStorage.setItem('cuephoriaCategories', JSON.stringify(updated));
        return updated;
      });
      
      toast({
        title: 'Success',
        description: `Category "${category}" has been deleted`,
      });
    } catch (error) {
      console.error('Error in deleteCategory:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete category. Please try again.',
        variant: 'destructive',
      });
    }
  };
  
  // ✅ UPDATED: Added coupon parameters
  const startSession = async (
    stationId: string,
    customerId: string,
    finalRate?: number,
    couponCode?: string,
    playerCount?: number,
    perPersonRate?: number,
    plannedDurationMinutes?: number,
    prepaidBooking?: PrepaidBookingLink,
    sessionGroupId?: string,
    customStartTime?: Date
  ): Promise<void> => {
    await startSessionBase(
      stationId,
      customerId,
      finalRate,
      couponCode,
      playerCount,
      perPersonRate,
      plannedDurationMinutes,
      prepaidBooking,
      sessionGroupId,
      customStartTime
    );
  };

  const extendSession = async (stationId: string, extraMinutes: number): Promise<void> => {
    await extendSessionBase(stationId, extraMinutes);
  };

  const moveSession = async (fromStationId: string, toStationId: string): Promise<void> => {
    await moveSessionBase(fromStationId, toStationId);
  };

  /** Merge session lines into the customer's saved cart without opening POS. */
  const saveSessionCheckoutDraft = useCallback(
    async (customer: Customer, incomingItems: CartItem[]): Promise<void> => {
      const saved =
        activeLocationId != null
          ? await loadSavedCartForCustomer(customer.id)
          : null;

      const priorItems = saved?.items ?? [];
      const mergedCart = mergeSessionCartItems(priorItems, [], incomingItems);

      const discountVal = Number(saved?.discount ?? 0);
      const discountTyp = (saved?.discount_type ?? 'percentage') as 'percentage' | 'fixed';
      const loyaltyUsed = Number(saved?.loyalty_points_used ?? 0);

      if (mergedCart.length > 0 && activeLocationId) {
        await persistSavedCart(
          customer.id,
          customer.name,
          mergedCart,
          discountVal,
          discountTyp,
          loyaltyUsed,
        );
      }

      if (selectedCustomer?.id === customer.id) {
        setCart((prev) => prev.filter((item) => item.type !== 'session'));
      }
    },
    [activeLocationId, loadSavedCartForCustomer, persistSavedCart, selectedCustomer?.id, setCart],
  );

  /** Sticky POS cart: final session end loads the collated bill into checkout. */
  const applySessionCheckoutCart = useCallback(
    async (customer: Customer, incomingItems: CartItem[]): Promise<void> => {
      const saved =
        activeLocationId != null
          ? await loadSavedCartForCustomer(customer.id)
          : null;

      const priorItems = saved?.items ?? [];
      const inMemoryItems = selectedCustomer?.id === customer.id ? cart : [];
      const mergedCart = mergeSessionCartItems(priorItems, inMemoryItems, incomingItems);

      const discountVal = Number(saved?.discount ?? 0);
      const discountTyp = (saved?.discount_type ?? 'percentage') as 'percentage' | 'fixed';
      const loyaltyUsed = Number(saved?.loyalty_points_used ?? 0);

      if (mergedCart.length > 0 && activeLocationId) {
        await persistSavedCart(
          customer.id,
          customer.name,
          mergedCart,
          discountVal,
          discountTyp,
          loyaltyUsed,
        );
      }

      forceLoadSavedCartCustomerIdRef.current = customer.id;
      selectCustomer(customer.id);

      if (mergedCart.length > 0) {
        setCart(clampCartItemsToStock(mergedCart, products));
        setDiscountAmount(discountVal);
        setDiscountType(discountTyp);
        setLoyaltyPointsUsedAmount(loyaltyUsed);
        console.log('Sticky session cart for checkout:', mergedCart);
      }
    },
    [
      activeLocationId,
      cart,
      loadSavedCartForCustomer,
      persistSavedCart,
      products,
      selectCustomer,
      selectedCustomer?.id,
      setCart,
      setDiscountAmount,
      setDiscountType,
      setLoyaltyPointsUsedAmount,
    ],
  );
  
  const endSession = async (stationId: string): Promise<SessionEndCheckoutMode | void> => {
    try {
      const station = stations.find(s => s.id === stationId);
      if (!station || !station.isOccupied || !station.currentSession) {
        console.log("No active session found for this station in wrapper");
        throw new Error("No active session found");
      }
      
      const sessionId = station.currentSession.id;
      const prepaidLink = station.currentSession.prepaidBooking;
      const sessionGroupId = station.currentSession.sessionGroupId;
      const otherActiveInGroup =
        sessionGroupId != null
          ? stations.filter(
              (s) =>
                s.id !== stationId &&
                s.isOccupied &&
                s.currentSession?.sessionGroupId === sessionGroupId
            ).length
          : 0;
      const isPartialGroupEnd = sessionGroupId != null && otherActiveInGroup > 0;

      const stationQuickShopItems = getStationQuickShopItems(sessionId);
      
      const result = await endSessionBase(stationId, customers);
      
      if (result) {
        const { sessionCartItem, customer, updatedSession } = result;
        const prepaid = prepaidLink ?? updatedSession?.prepaidBooking;
        const endTime = updatedSession?.endTime ?? new Date();
        const billingSession = updatedSession ?? resolveSessionForBilling(station.currentSession!, endTime);
        const billableMs = getBillableMs(billingSession, endTime);
        const overtimeMs = prepaid ? getPrepaidOvertimeMs(billingSession, billableMs, station) : 0;

        const incomingItems: CartItem[] = [
          ...stationQuickShopItems,
          ...(sessionCartItem ? [sessionCartItem] : []),
        ];
        const chargeableItems = getChargeableCartItems(incomingItems);
        const needsPos = prepaid
          ? prepaidCheckoutHasExtraCharges(stationQuickShopItems.length, overtimeMs, incomingItems)
          : sessionNeedsPosCheckout(stationQuickShopItems.length, overtimeMs) ||
            chargeableItems.length > 0;

        clearStationQuickShopSession(sessionId);

        if (prepaid && !needsPos) {
          toast({
            title: 'Pre-paid session complete',
            description: `${station.name} — already paid online, no extra charges`,
          });
          return 'draft';
        }

        if (!needsPos && chargeableItems.length === 0) {
          toast({
            title: prepaid ? 'Pre-paid session complete' : 'Session ended',
            description: prepaid
              ? `${station.name} — play time already paid online`
              : `${station.name} ended with no charges`,
          });
          return 'draft';
        }

        if (!customer) {
          if (needsPos && chargeableItems.length > 0) {
            toast({
              title: 'Checkout needs customer',
              description: 'Session ended but customer record was not found for POS checkout.',
              variant: 'destructive',
            });
          }
          return needsPos ? undefined : 'draft';
        }

        if (isPartialGroupEnd) {
          await saveSessionCheckoutDraft(customer, chargeableItems);
          toast({
            title: 'Station bill saved',
            description: `${station.name} added to ${customer.name}'s tab. ${otherActiveInGroup} station${otherActiveInGroup === 1 ? '' : 's'} still active — checkout opens when the group ends.`,
          });
          return 'draft';
        }

        console.log('Auto-selecting customer for checkout:', customer.name);
        await applySessionCheckoutCart(customer, chargeableItems);
        return 'pos';
      }
    } catch (error) {
      console.error('Error in endSession:', error);
      throw error;
    }
  };

  const endSessionGroup = async (stationId: string): Promise<SessionEndCheckoutMode | void> => {
    try {
      const anchor = stations.find((s) => s.id === stationId);
      const groupId = anchor?.currentSession?.sessionGroupId;

      if (!anchor?.currentSession || !groupId) {
        throw new Error('Not a group session');
      }

      const groupStations = stations.filter(
        (s) => s.isOccupied && s.currentSession?.sessionGroupId === groupId
      );

      const quickShopSnapshots = groupStations.map((s) => ({
        sessionId: s.currentSession!.id,
        items: getStationQuickShopItems(s.currentSession!.id),
      }));

      const result = await endSessionGroupBase(stationId, customers);

      if (result) {
        const { sessionCartItems, customer } = result;
        const quickShopItems = quickShopSnapshots.flatMap((q) => q.items);
        const incomingItems: CartItem[] = [...quickShopItems, ...sessionCartItems];
        const chargeableItems = getChargeableCartItems(incomingItems);

        for (const q of quickShopSnapshots) {
          clearStationQuickShopSession(q.sessionId);
        }

        if (customer) {
          if (chargeableItems.length === 0) {
            toast({
              title: 'Pre-paid group complete',
              description: 'All stations ended — no extra POS checkout needed',
            });
            return 'draft';
          }

          await applySessionCheckoutCart(customer, chargeableItems);
          return 'pos';
        }
      }
    } catch (error) {
      console.error('Error in endSessionGroup:', error);
      throw error;
    }
  };

  const pauseSession = async (stationId: string): Promise<void> => {
    await pauseSessionBase(stationId);
  };

  const resumeSession = async (stationId: string): Promise<void> => {
    await resumeSessionBase(stationId);
  };
  
  const updateCustomerMembershipWrapper = (
    customerId: string, 
    membershipData: {
      membershipPlan?: string;
      membershipDuration?: 'weekly' | 'monthly';
      membershipHoursLeft?: number;
    }
  ): Customer | null => {
    const customer = customers.find(c => c.id === customerId);
    
    if (!customer) return null;
    
    updateCustomerMembership(customerId, membershipData)
      .then((updatedCustomer) => {
        if (updatedCustomer) {
          console.log("Customer membership updated:", updatedCustomer.id);
        }
      })
      .catch(error => {
        console.error("Error updating customer membership:", error);
      });
    
    return {
      ...customer,
      membershipPlan: membershipData.membershipPlan || customer.membershipPlan,
      membershipDuration: membershipData.membershipDuration || customer.membershipDuration,
      membershipHoursLeft: membershipData.membershipHoursLeft !== undefined 
        ? membershipData.membershipHoursLeft 
        : customer.membershipHoursLeft,
      isMember: true
    };
  };
  
  // ============================================
  // ✅ UPDATED: completeSale with custom timestamp support
  // ============================================
  const completeSale = async (
    paymentMethod: 'cash' | 'upi' | 'split' | 'credit' | 'complimentary',
    status: 'completed' | 'complimentary' = 'completed',
    compNote?: string,
    customTimestamp?: Date
  ): Promise<Bill | undefined> => {
    if (!selectedCustomer) {
      toast({
        title: 'No Customer Selected',
        description: 'Please select a customer before completing the sale',
        variant: 'destructive',
      });
      return undefined;
    }
    
    if (cart.length === 0) {
      toast({
        title: 'Empty Cart',
        description: 'Please add items to the cart before completing the sale',
        variant: 'destructive',
      });
      return undefined;
    }
    
    try {
      let currentCart = cart;
      if (isStudentDiscount) {
        currentCart = cart.map(item => {
          const product = products.find(p => p.id === item.id) as Product;
          if (product && product.category === 'membership' && product.studentPrice) {
            return {
              ...item,
              price: product.studentPrice,
              total: product.studentPrice * item.quantity
            };
          }
          return item;
        });
        
        setCart(currentCart);
      }
      
      const membershipItems = currentCart.filter(item => {
        const product = products.find(p => p.id === item.id);
        return product && product.category === 'membership';
      });
      
      console.log("Completing sale with cart:", currentCart);
      console.log("Selected customer:", selectedCustomer);
      console.log("Payment method:", isSplitPayment ? 'split' : paymentMethod);
      console.log("Transaction status:", status);
      console.log("Custom timestamp:", customTimestamp);
      
      const bill = await completeSaleBase(
        currentCart, 
        selectedCustomer, 
        discount, 
        discountType, 
        loyaltyPointsUsed, 
        calculateTotal, 
        isSplitPayment ? 'split' : paymentMethod,
        products,
        isSplitPayment,
        cashAmount,
        upiAmount,
        status,
        compNote,
        customTimestamp
      );
      
      if (bill) {
        console.log("Bill created successfully:", bill);
        
        // ============================================
        // CART PERSISTENCE: Clear from localStorage after successful sale
        // ============================================
        if (selectedCustomer && activeLocationId) {
          await removeSavedCart(selectedCustomer.id);
        }
        console.log(`Cleared saved cart for ${selectedCustomer.name}`);
        
        if (membershipItems.length > 0) {
          for (const item of membershipItems) {
            const product = products.find(p => p.id === item.id);
            
            if (product) {
              const membershipHours = product.membershipHours || 4;
              let membershipDuration: 'weekly' | 'monthly' = 'weekly';
              
              if (product.duration) {
                membershipDuration = product.duration;
              } else if (product.name.toLowerCase().includes('weekly')) {
                membershipDuration = 'weekly';
              } else if (product.name.toLowerCase().includes('monthly')) {
                membershipDuration = 'monthly';
              }
              
              updateCustomerMembership(selectedCustomer.id, {
                membershipPlan: product.name,
                membershipDuration: membershipDuration,
                membershipHoursLeft: membershipHours
              });
              
              break;
            }
          }
        }
        
        clearCart();
        setSelectedCustomer(null);
        setIsStudentDiscount(false);
        resetPaymentInfo();
        
        return bill;
      }
      
      return undefined;
      
    } catch (error) {
      console.error("Error in completeSale:", error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to complete sale',
        variant: 'destructive',
      });
      return undefined;
    }
  };
  
  const exportBills = () => {
    exportBillsBase(customers);
  };
  
  const exportCustomers = () => {
    exportCustomersBase(customers);
  };
  
  const updateBill = async (
    originalBill: Bill, 
    updatedItems: CartItem[], 
    customer: Customer, 
    discount: number, 
    discountType: 'percentage' | 'fixed', 
    loyaltyPointsUsed: number,
    isSplitPayment: boolean = false,
    cashAmount: number = 0,
    upiAmount: number = 0,
    paymentMethod?: 'cash' | 'upi' | 'split' | 'credit' | 'complimentary'
  ): Promise<Bill | null> => {
    return updateBillBase(
      originalBill,
      updatedItems,
      customer,
      discount,
      discountType,
      loyaltyPointsUsed,
      isSplitPayment,
      cashAmount,
      upiAmount,
      paymentMethod
    );
  };

  const realiseCreditPayment = async (
    bill: Bill,
    mode: 'cash' | 'upi' | 'split',
    options?: { splitCash?: number; splitUpi?: number; silent?: boolean }
  ): Promise<Bill | null> => {
    return realiseCreditPaymentBase(bill, mode, options);
  };
  
  const handleResetToSampleData = async (options?: ResetOptions) => {
    try {
      const { resetToSampleData } = await import('@/services/dataOperations');
      
      await resetToSampleData(
        options,
        setProducts,
        setCustomers,
        setBills,
        setSessions,
        setStations,
        setCart,
        setDiscountAmount,
        setLoyaltyPointsUsedAmount,
        setSelectedCustomer,
        refreshFromDB
      );
      
      return true;
    } catch (error) {
      console.error('Error in handleResetToSampleData:', error);
      throw error;
    }
  };
  
  const handleAddSampleIndianData = useCallback(() => {
    toast({
      title: "Info",
      description: "Sample data functionality has been removed. Please add products manually or through database import.",
    });
  }, [toast]);
  
  const deleteBill = useCallback(async (billId: string, customerId: string): Promise<boolean> => {
    return await deleteBillBase(billId, customerId);
  }, [deleteBillBase]);

  // Memoize the entire context value so that consumers only re-render when the
  // data they depend on actually changes, not on every POSProvider render caused
  // by unrelated state updates in sibling hooks.
  const contextValue = useMemo(() => ({
    products,
    productsLoading,
    productsError,
    stations,
    customers,
    sessions,
    bills,
    cart,
    selectedCustomer,
    discount,
    discountType,
    loyaltyPointsUsed,
    isStudentDiscount,
    isSplitPayment,
    cashAmount,
    upiAmount,
    setIsSplitPayment,
    setCashAmount,
    setUpiAmount,
    updateSplitAmounts,
    categories,
    setIsStudentDiscount,
    setBills,
    setCustomers,
    setStations,
    addProduct,
    updateProduct,
    deleteProduct,
    addCategory,
    updateCategory,
    deleteCategory,
    startSession,
    endSession,
    endSessionGroup,
    pauseSession,
    resumeSession,
    extendSession,
    moveSession,
    deleteStation,
    updateStation,
    refreshStations,
    addCustomer,
    updateCustomer,
    updateCustomerMembership: updateCustomerMembershipWrapper,
    deleteCustomer,
    selectCustomer,
    loadSavedCartForCheckout,
    checkMembershipValidity,
    deductMembershipHours,
    addToCart: addToCartWithStock,
    removeFromCart,
    updateCartItem: updateCartItemWithStock,
    clearCart: handleClearCart,
    savedCarts,
    savedCartsLoading,
    refreshSavedCarts,
    removeSavedCart,
    removeAllSavedCarts,
    moveCartToSaved,
    getStationQuickShopItems,
    addToStationQuickShop,
    updateStationQuickShopQuantity,
    removeFromStationQuickShop,
    setDiscount,
    setLoyaltyPointsUsed,
    calculateTotal,
    completeSale,
    updateBill,
    realiseCreditPayment,
    deleteBill,
    exportBills,
    exportCustomers,
    resetToSampleData: handleResetToSampleData,
    addSampleIndianData: handleAddSampleIndianData
  }), [
    products, productsLoading, productsError,
    stations, customers, sessions, bills,
    cart, selectedCustomer,
    discount, discountType, loyaltyPointsUsed,
    itemsBySession, savedCarts, savedCartsLoading,
    isStudentDiscount, isSplitPayment, cashAmount, upiAmount,
    setIsSplitPayment, setCashAmount, setUpiAmount, updateSplitAmounts,
    categories, setIsStudentDiscount, setBills, setCustomers, setStations,
    addProduct, updateProduct, deleteProduct,
    addCategory, updateCategory, deleteCategory,
    startSession, endSession, endSessionGroup, pauseSession, resumeSession, extendSession, moveSession, deleteStation, updateStation, refreshStations,
    addCustomer, updateCustomer, updateCustomerMembershipWrapper,
    deleteCustomer, selectCustomer, loadSavedCartForCheckout, checkMembershipValidity, deductMembershipHours,
    addToCartWithStock, removeFromCart, updateCartItemWithStock, handleClearCart,
    savedCarts, savedCartsLoading, refreshSavedCarts, removeSavedCart, removeAllSavedCarts, moveCartToSaved,
    getStationQuickShopItems, addToStationQuickShop,
    updateStationQuickShopQuantity, removeFromStationQuickShop,
    setDiscount, setLoyaltyPointsUsed, calculateTotal,
    completeSale, updateBill, realiseCreditPayment, deleteBill,
    exportBills, exportCustomers,
    handleResetToSampleData, handleAddSampleIndianData
  ]);

  return (
    <POSContext.Provider value={contextValue}>
      {children}
    </POSContext.Provider>
  );
};

export const usePOS = () => {
  const context = useContext(POSContext);
  if (context === undefined) {
    console.error('usePOS must be used within a POSProvider');
    throw new Error('usePOS must be used within a POSProvider');
  }
  return context;
};

export type { 
  Product,
  Station,
  Customer,
  Session,
  CartItem,
  Bill,
  ResetOptions,
  POSContextType
} from '@/types/pos.types';
