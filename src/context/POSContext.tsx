import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  POSContextType, 
  ResetOptions, 
  Customer, 
  CartItem, 
  Bill,
  Product,
  Station,
  Session
} from '@/types/pos.types';
import { useProducts } from '@/hooks/useProducts';
import { useCustomers } from '@/hooks/useCustomers';
import { useStations } from '@/hooks/useStations';
import { useCart } from '@/hooks/useCart';
import { useBills } from '@/hooks/useBills';
import { useToast } from '@/hooks/use-toast';
import { supabase, handleSupabaseError } from '@/integrations/supabase/client';
import { 
  saveCartToStorage, 
  loadCartFromStorage, 
  clearCartFromStorage,
  cleanupExpiredCarts 
} from '@/utils/cartStorage';

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
  categories: ['food', 'drinks', 'tobacco', 'challenges', 'membership'],
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
  deleteStation: async () => false,
  updateStation: async () => false,
  addCustomer: () => ({}),
  updateCustomer: () => ({}),
  updateCustomerMembership: () => null,
  deleteCustomer: () => {},
  selectCustomer: () => {},
  checkMembershipValidity: () => false,
  deductMembershipHours: () => false,
  addToCart: () => {},
  removeFromCart: () => {},
  updateCartItem: () => {},
  clearCart: () => {},
  setDiscount: () => {},
  setLoyaltyPointsUsed: () => {},
  calculateTotal: () => 0,
  completeSale: () => undefined,
  updateBill: async () => null,
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
  console.log('POSProvider initialized');
  
  const [isStudentDiscount, setIsStudentDiscount] = useState<boolean>(false);
  
  const [categories, setCategories] = useState<string[]>([
    'food', 'drinks', 'tobacco', 'challenges', 'membership'
  ]);
  
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
    deleteStation,
    updateStation
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
  
  const { 
    bills, 
    setBills, 
    completeSale: completeSaleBase, 
    deleteBill: deleteBillBase,
    updateBill: updateBillBase,
    exportBills: exportBillsBase, 
    exportCustomers: exportCustomersBase 
  } = useBills(updateCustomer, updateProduct);

  const { toast } = useToast();

  // ============================================
  // CART PERSISTENCE: Cleanup expired carts on mount
  // ============================================
  useEffect(() => {
    const cleaned = cleanupExpiredCarts();
    if (cleaned > 0) {
      console.log(`Cleaned up ${cleaned} expired cart(s)`);
    }
  }, []);

  // ============================================
  // CART PERSISTENCE: Load cart when customer is selected
  // ============================================
  useEffect(() => {
    if (selectedCustomer) {
      const savedCartData = loadCartFromStorage(selectedCustomer.id);
      
      if (savedCartData && savedCartData.items.length > 0) {
        console.log(`Loading saved cart for ${selectedCustomer.name} with ${savedCartData.items.length} items`);
        
        // Restore cart items
        setCart(savedCartData.items);
        
        // Restore discount
        if (savedCartData.discount !== undefined) {
          setDiscountAmount(savedCartData.discount);
        }
        if (savedCartData.discountType) {
          setDiscountType(savedCartData.discountType);
        }
        
        // Restore loyalty points
        if (savedCartData.loyaltyPointsUsed !== undefined) {
          setLoyaltyPointsUsedAmount(savedCartData.loyaltyPointsUsed);
        }
        
        toast({
          title: 'Cart Restored',
          description: `Loaded ${savedCartData.items.length} item(s) from ${selectedCustomer.name}'s saved cart`,
          duration: 3000,
        });
      }
    }
  }, [selectedCustomer?.id]);

  // ============================================
  // CART PERSISTENCE: Save cart whenever it changes
  // ============================================
  useEffect(() => {
    if (selectedCustomer && cart.length > 0) {
      saveCartToStorage(
        selectedCustomer.id, 
        cart, 
        selectedCustomer.name,
        discount,
        discountType,
        loyaltyPointsUsed
      );
    }
  }, [cart, discount, discountType, loyaltyPointsUsed, selectedCustomer?.id]);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const { data, error } = await supabase
          .from('categories')
          .select('name');
        
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
                .insert({ name: 'uncategorized' });
                
              dbCategories.push('uncategorized');
            } catch (err) {
              console.error('Error creating uncategorized category:', err);
            }
          }
          
          setCategories(dbCategories);
          localStorage.setItem('cuephoriaCategories', JSON.stringify(dbCategories));
          console.log('Categories loaded from database:', dbCategories);
        } else {
          const defaultCategories = ['food', 'drinks', 'tobacco', 'challenges', 'membership', 'uncategorized'];
          
          for (const category of defaultCategories) {
            try {
              await supabase
                .from('categories')
                .insert({ name: category.toLowerCase() });
            } catch (err) {
              console.error(`Error creating category ${category}:`, err);
            }
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
  }, []);

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
        .insert({ name: trimmedCategory });
        
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
        .eq('name', oldCategory.toLowerCase());
        
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
        .eq('category', oldCategory);
        
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
        .eq('name', lowerCategory);
        
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
          .eq('category', lowerCategory);
          
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
  
  const startSession = async (stationId: string, customerId: string): Promise<void> => {
    await startSessionBase(stationId, customerId);
  };
  
  const endSession = async (stationId: string): Promise<void> => {
    try {
      const station = stations.find(s => s.id === stationId);
      if (!station || !station.isOccupied || !station.currentSession) {
        console.log("No active session found for this station in wrapper");
        throw new Error("No active session found");
      }
      
      const customerId = station.currentSession.customerId;
      
      const result = await endSessionBase(stationId, customers);
      
      if (result) {
        const { sessionCartItem, customer } = result;
        
        clearCart();
        
        if (customer) {
          console.log("Auto-selecting customer:", customer.name);
          selectCustomer(customer.id);
        }
        
        if (sessionCartItem) {
          console.log("Adding session to cart:", sessionCartItem);
          addToCart(sessionCartItem);
        }
      }
    } catch (error) {
      console.error('Error in endSession:', error);
      throw error;
    }
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
  // UPDATED: completeSale with cart persistence clearing
  // ============================================
  const completeSale = async (
    paymentMethod: 'cash' | 'upi' | 'split' | 'credit' | 'complimentary',
    status: 'completed' | 'complimentary' = 'completed',
    compNote?: string
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
        compNote
      );
      
      if (bill) {
        console.log("Bill created successfully:", bill);
        
        // ============================================
        // CART PERSISTENCE: Clear from localStorage after successful sale
        // ============================================
        clearCartFromStorage(selectedCustomer.id);
        console.log(`Cleared saved cart for ${selectedCustomer.name}`);
        
        if (membershipItems.length > 0) {
          for (const item of membershipItems) {
            const product = products.find(p => p.id === item.id);
            
            if (product) {
              let membershipHours = product.membershipHours || 4;
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
  
  const handleAddSampleIndianData = () => {
    const { toast } = useToast();
    toast({
      title: "Info",
      description: "Sample data functionality has been removed. Please add products manually or through database import.",
    });
  };
  
  const deleteBill = async (billId: string, customerId: string): Promise<boolean> => {
    return await deleteBillBase(billId, customerId);
  };
  
  console.log('POSProvider rendering with context value');
  
  return (
    <POSContext.Provider
      value={{
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
        setCashAmount: (amount) => setCashAmount(amount),
        setUpiAmount: (amount) => setUpiAmount(amount),
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
        deleteStation,
        updateStation,
        addCustomer,
        updateCustomer,
        updateCustomerMembership: updateCustomerMembershipWrapper,
        deleteCustomer,
        selectCustomer,
        checkMembershipValidity,
        deductMembershipHours,
        addToCart,
        removeFromCart,
        updateCartItem,
        clearCart,
        setDiscount,
        setLoyaltyPointsUsed,
        calculateTotal,
        completeSale,
        updateBill,
        deleteBill,
        exportBills,
        exportCustomers,
        resetToSampleData: handleResetToSampleData,
        addSampleIndianData: handleAddSampleIndianData
      }}
    >
      {children}
    </POSContext.Provider>
  );
};

export const usePOS = () => {
  console.log('usePOS hook called');
  const context = useContext(POSContext);
  if (context === undefined) {
    console.error('usePOS must be used within a POSProvider');
    throw new Error('usePOS must be used within a POSProvider');
  }
  console.log('usePOS hook returning context');
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
