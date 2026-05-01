import { useState, useEffect, useMemo } from 'react';
import { Bill, CartItem, Customer, Product } from '@/types/pos.types';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { getCachedData, saveToCache, isCacheStale, invalidateCache, CACHE_KEYS, cacheKeyWithLocation } from '@/utils/dataCache';
import { useLocation } from '@/context/LocationContext';
import { usePOSHydration } from '@/context/POSHydrationContext';

export const useBills = (
  updateCustomer: (customer: Customer) => void,
  updateProduct: (product: Product) => void
) => {
  const [bills, setBills] = useState<Bill[]>([]);
  const { toast } = useToast();
  const { activeLocationId, loading: locationsLoading } = useLocation();
  const { loadBills: hydrateBills, billsDeepSync } = usePOSHydration();
  const billsCacheKey = useMemo(
    () => cacheKeyWithLocation(CACHE_KEYS.BILLS, activeLocationId),
    [activeLocationId]
  );

  // Keep cache small (bills can grow very large and localStorage is limited)
  const MAX_CACHED_BILLS = 300;

  type RawBillItemRow = {
    item_id: string;
    item_type: 'product' | 'session' | string;
    name: string;
    price: number | string | null;
    quantity: number;
    total: number | string | null;
  };

  type RawBillRow = {
    id: string;
    customer_id: string;
    subtotal: number | string | null;
    discount: number | string | null;
    discount_value: number | string | null;
    discount_type: 'percentage' | 'fixed' | string | null;
    loyalty_points_used: number | null;
    loyalty_points_earned: number | null;
    total: number | string | null;
    payment_method: string | null;
    status?: string | null;
    comp_note?: string | null;
    is_split_payment?: boolean | null;
    cash_amount?: number | string | null;
    upi_amount?: number | string | null;
    created_at: string;
    bill_items?: RawBillItemRow[] | null;
  };

  const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  const reviveCachedBills = (cached: unknown): Bill[] => {
    const list = Array.isArray(cached) ? cached : [];
    return list.map((bill: unknown) => {
      const b = bill as Partial<Bill> & { createdAt?: unknown; items?: unknown };
      const createdAt =
        b.createdAt instanceof Date
          ? b.createdAt
          : b.createdAt
            ? new Date(String(b.createdAt))
            : new Date();
      return {
        ...(b as Bill),
        createdAt,
        items: Array.isArray(b.items) ? (b.items as CartItem[]) : [],
      };
    });
  };

  const transformBills = (rawBills: RawBillRow[]): Bill[] => {
    return (rawBills || []).map((bill) => ({
      id: bill.id,
      customerId: bill.customer_id,
      items: (bill.bill_items || []).map((item) => ({
        id: item.item_id,
        type: item.item_type as 'product' | 'session',
        name: item.name,
        price: Number(item.price),
        quantity: item.quantity,
        total: Number(item.total)
      })),
      subtotal: Number(bill.subtotal),
      discount: Number(bill.discount),
      discountValue: Number(bill.discount_value),
      discountType: bill.discount_type as 'percentage' | 'fixed',
      loyaltyPointsUsed: bill.loyalty_points_used,
      loyaltyPointsEarned: bill.loyalty_points_earned,
      total: Number(bill.total),
      paymentMethod: bill.payment_method as 'cash' | 'upi' | 'split' | 'credit' | 'complimentary',
      status: bill.status || 'completed',
      compNote: bill.comp_note || undefined,
      isSplitPayment: bill.is_split_payment || false,
      cashAmount: bill.cash_amount ? Number(bill.cash_amount) : 0,
      upiAmount: bill.upi_amount ? Number(bill.upi_amount) : 0,
      createdAt: new Date(bill.created_at)
    }));
  };

  const mergeBillsByIdDesc = (prevBills: Bill[], incomingBills: Bill[]) => {
    const map = new Map<string, Bill>();
    for (const b of prevBills) map.set(b.id, b);
    for (const b of incomingBills) map.set(b.id, b);
    return Array.from(map.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  };

  const fetchBillsPage = async (page: number, pageSize: number) => {
    if (!activeLocationId) {
      return { data: [] as RawBillRow[] | null, error: null };
    }
    // ✅ Select only needed columns + include bill_items
    const { data, error } = await supabase
      .from('bills')
      .select(`
        id,
        customer_id,
        subtotal,
        discount,
        discount_value,
        discount_type,
        loyalty_points_used,
        loyalty_points_earned,
        total,
        payment_method,
        status,
        comp_note,
        is_split_payment,
        cash_amount,
        upi_amount,
        created_at,
        bill_items (
          id,
          item_id,
          name,
          price,
          quantity,
          total,
          item_type
        )
      `)
      .eq('location_id', activeLocationId)
      .order('created_at', { ascending: false })
      .range(page * pageSize, (page + 1) * pageSize - 1);

    return { data: (data as unknown as RawBillRow[] | null), error };
  };

  const fetchBillsPageWithRetry = async (page: number, pageSize: number, retries: number = 2) => {
    let lastError: unknown = null;
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const { data, error } = await fetchBillsPage(page, pageSize);
        if (!error) return data || [];
        lastError = error;
      } catch (err) {
        lastError = err;
      }

      // Backoff: 400ms, 800ms, 1200ms...
      await sleep(400 * (attempt + 1));
    }
    throw lastError;
  };

  const calculateLoyaltyPoints = (total: number, isMember: boolean): number => {
    const pointsRate = isMember ? 5 : 2;
    return Math.floor((total / 100) * pointsRate);
  };

  useEffect(() => {
    // Clear stale data immediately when branch changes
    setBills([]);
  }, [activeLocationId]);

  useEffect(() => {
    if (!hydrateBills || locationsLoading) {
      return;
    }

    let isMounted = true;
    let dbLoadInFlight = false;
    /** Extra pages after cache hit on light routes (e.g. POS) — avoids huge downloads. */
    const BACKGROUND_MAX_PAGES = 2;
    /** First-load cap (non-silent) when analytics does not need full history. */
    const INITIAL_BILL_PAGES_CAP = 16;

    const loadBills = async () => {
      try {
        // ✅ Check cache first
        const cachedBills = getCachedData<Bill[]>(billsCacheKey);
        
        if (cachedBills && cachedBills.length > 0) {
          console.log('📦 Using cached bills');
          // Revive dates to keep runtime behavior consistent
          setBills(reviveCachedBills(cachedBills));
          
          // Dashboard / Reports need every bill for accurate aggregates; shallow routes only refresh head + a few pages.
          const refreshPages = billsDeepSync
            ? Number.POSITIVE_INFINITY
            : isCacheStale(billsCacheKey)
              ? 1
              : BACKGROUND_MAX_PAGES;
          loadBillsFromDB({ silent: true, maxPages: refreshPages }).catch(err => {
            console.error('Error loading bills in background:', err);
          });
          return;
        }
        
        await loadBillsFromDB({ silent: false });
      } catch (error) {
        console.error('Error in loadBills:', error);
      }
    };
    
    const loadBillsFromDB = async (opts?: { silent?: boolean; maxPages?: number }) => {
      const silent = opts?.silent ?? false;
      const defaultNonSilentMax = billsDeepSync ? Number.POSITIVE_INFINITY : INITIAL_BILL_PAGES_CAP;
      const maxPages = opts?.maxPages ?? (silent ? 1 : defaultNonSilentMax);

      // prevent overlapping background loads
      if (dbLoadInFlight) return;
      dbLoadInFlight = true;

      let loadedAny = false;
      try {
        // Smaller pages reduce payload size and avoid statement timeout (Postgres 57014).
        const pageSize = 50;

        let page = 0;
        let finished = false;

        while (!finished && page < maxPages) {
          let rawPage: RawBillRow[] = [];
          try {
            rawPage = await fetchBillsPageWithRetry(page, pageSize, 2);
          } catch (pageError) {
            console.error(`Error loading bills page ${page}:`, pageError);

            // Only show a toast if we couldn't load anything at all
            if (!silent && !loadedAny && isMounted) {
              toast({
                title: 'Error',
                description: 'Failed to load bills from database',
                variant: 'destructive'
              });
            }
            return;
          }

          if (!rawPage || rawPage.length === 0) {
            finished = true;
            continue;
          }

          const transformed = transformBills(rawPage);
          loadedAny = loadedAny || transformed.length > 0;

          if (!isMounted) return;

          // Progressive update: show first page immediately, then keep appending older pages.
          setBills(prev => mergeBillsByIdDesc(prev, transformed));

          // Cache only the most recent subset (keeps localStorage fast and avoids quota issues)
          if (page === 0) {
            saveToCache(billsCacheKey, transformed.slice(0, MAX_CACHED_BILLS));
          }

          if (rawPage.length < pageSize) {
            finished = true;
          } else {
            page++;
          }
        }

        // After a full non-silent load, refresh cache with latest subset from current state
        if (!silent && isMounted) {
          setBills(prev => {
            saveToCache(billsCacheKey, prev.slice(0, MAX_CACHED_BILLS));
            return prev;
          });
        }

        console.log('✅ Bills load completed');
      } catch (error) {
        console.error('Error in loadBillsFromDB:', error);
        if (!silent && isMounted && !loadedAny) {
          toast({
            title: 'Error',
            description: 'Failed to load bills',
            variant: 'destructive'
          });
        }
      } finally {
        dbLoadInFlight = false;
      }
    };

    loadBills();

    return () => {
      isMounted = false;
    };
  }, [activeLocationId, billsCacheKey, hydrateBills, billsDeepSync, locationsLoading]);

  // ✅ UPDATED: Added customTimestamp parameter
  const completeSale = async (
    cart: CartItem[],
    customer: Customer,
    discount: number,
    discountType: 'percentage' | 'fixed',
    loyaltyPointsUsed: number,
    calculateTotal: () => number,
    paymentMethod: 'cash' | 'upi' | 'split' | 'credit' | 'complimentary',
    products: Product[],
    isSplitPayment: boolean = false,
    cashAmount: number = 0,
    upiAmount: number = 0,
    status: 'completed' | 'complimentary' = 'completed',
    compNote?: string,
    customTimestamp?: Date  // ✅ NEW PARAMETER
  ): Promise<Bill | undefined> => {
    try {
      console.log('Starting completeSale with cart:', cart);
      console.log('Customer:', customer);
      console.log('Payment method:', paymentMethod);
      console.log('Transaction status:', status);
      console.log('Custom timestamp:', customTimestamp); // ✅ NEW LOG

      if (!customer || cart.length === 0) {
        throw new Error('Invalid customer or empty cart');
      }

      if (!activeLocationId) {
        throw new Error('No branch selected');
      }

      const subtotal = cart.reduce((sum, item) => sum + item.total, 0);
      let discountValue = 0;
      if (discountType === 'percentage') {
        discountValue = subtotal * (discount / 100);
      } else {
        discountValue = discount;
      }
      
      const total = calculateTotal();
      
      const loyaltyPointsEarned = status === 'complimentary' ? 0 : calculateLoyaltyPoints(total, customer.isMember);

      console.log('Calculated values:', { subtotal, discountValue, total, loyaltyPointsEarned, status });

      // ✅ UPDATED: Use customTimestamp or current date
      const billTimestamp = customTimestamp || new Date();
      console.log('Bill will be created with timestamp:', billTimestamp);

      const { data: billData, error: billError } = await supabase
        .from('bills')
        .insert({
          customer_id: customer.id,
          location_id: activeLocationId,
          subtotal: subtotal,
          discount: discount,
          discount_value: discountValue,
          discount_type: discountType,
          loyalty_points_used: loyaltyPointsUsed,
          loyalty_points_earned: loyaltyPointsEarned,
          total: total,
          payment_method: paymentMethod,
          status: status,
          comp_note: compNote,
          is_split_payment: isSplitPayment,
          cash_amount: isSplitPayment ? cashAmount : (paymentMethod === 'cash' ? total : 0),
          upi_amount: isSplitPayment ? upiAmount : (paymentMethod === 'upi' ? total : 0),
          created_at: billTimestamp.toISOString()  // ✅ NEW: Use custom timestamp
        })
        .select()
        .single();

      if (billError) {
        console.error('Error creating bill:', billError);
        throw new Error(`Failed to create bill: ${billError.message}`);
      }

      console.log('Bill created successfully:', billData);

      const billItemsToInsert = cart.map(item => ({
        bill_id: billData.id,
        location_id: activeLocationId,
        item_id: item.id,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        total: item.total,
        item_type: item.type
      }));

      console.log('Inserting bill items:', billItemsToInsert);

      const { error: itemsError } = await supabase
        .from('bill_items')
        .insert(billItemsToInsert);

      if (itemsError) {
        console.error('Error creating bill items:', itemsError);
        await supabase.from('bills').delete().eq('id', billData.id);
        throw new Error(`Failed to create bill items: ${itemsError.message}`);
      }

      console.log('Bill items created successfully');

      const updatedCustomer: Customer = status === 'complimentary' 
        ? {
            ...customer,
            totalSpent: customer.totalSpent + total,
          }
        : {
            ...customer,
            loyaltyPoints: Math.max(0, customer.loyaltyPoints - loyaltyPointsUsed + loyaltyPointsEarned),
            totalSpent: customer.totalSpent + total,
          };

      const customerUpdateData = status === 'complimentary'
        ? { total_spent: updatedCustomer.totalSpent }
        : {
            loyalty_points: updatedCustomer.loyaltyPoints,
            total_spent: updatedCustomer.totalSpent
          };

      const { error: customerError } = await supabase
        .from('customers')
        .update(customerUpdateData)
        .eq('id', customer.id)
        .eq('location_id', activeLocationId!);

      if (customerError) {
        console.error('Error updating customer:', customerError);
      } else {
        updateCustomer(updatedCustomer);
        console.log('Customer updated successfully');
      }

      for (const item of cart) {
        if (item.type === 'product') {
          const product = products.find(p => p.id === item.id);
          if (product && product.category !== 'membership') {
            const newStock = Math.max(0, product.stock - item.quantity);
            
            const { error: productError } = await supabase
              .from('products')
              .update({ stock: newStock })
              .eq('id', product.id)
              .eq('location_id', activeLocationId!);

            if (productError) {
              console.error('Error updating product stock:', productError);
            } else {
              updateProduct({ ...product, stock: newStock });
              console.log(`Updated stock for ${product.name}: ${newStock}`);
            }
          }
        }
      }

      // ✅ UPDATED: Use billTimestamp instead of new Date()
      const completeBill: Bill = {
        id: billData.id,
        customerId: customer.id,
        items: cart,
        subtotal: subtotal,
        discount: discount,
        discountValue: discountValue,
        discountType: discountType,
        loyaltyPointsUsed: loyaltyPointsUsed,
        loyaltyPointsEarned: loyaltyPointsEarned,
        total: total,
        paymentMethod: paymentMethod,
        status: status,
        compNote: compNote,
        isSplitPayment: isSplitPayment,
        cashAmount: isSplitPayment ? cashAmount : (paymentMethod === 'cash' ? total : 0),
        upiAmount: isSplitPayment ? upiAmount : (paymentMethod === 'upi' ? total : 0),
        createdAt: billTimestamp  // ✅ UPDATED: Use billTimestamp
      };

      setBills(prevBills => {
        const updated = [completeBill, ...prevBills];
        // ✅ Update cache
        saveToCache(billsCacheKey, updated.slice(0, MAX_CACHED_BILLS));
        return updated;
      });
      
      // ✅ Invalidate cache to ensure fresh data
      invalidateCache(billsCacheKey);
      
      console.log('Sale completed successfully, bill created:', completeBill);
      
      if (status === 'complimentary') {
        toast({
          title: 'Marked as Complimentary',
          description: `Items recorded as complimentary. Value: ₹${total}`,
          variant: 'default',
        });
      } else {
        toast({
          title: 'Sale Completed',
          description: `Bill created successfully. Total: ₹${total}`,
          variant: 'default',
        });
      }

      return completeBill;

    } catch (error) {
      console.error('Error in completeSale:', error);
      toast({
        title: 'Transaction Failed',
        description: error instanceof Error ? error.message : 'An error occurred while completing the transaction',
        variant: 'destructive',
      });
      throw error;
    }
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
    try {
      const subtotal = updatedItems.reduce((sum, item) => sum + item.total, 0);
      let discountValue = 0;
      if (discountType === 'percentage') {
        discountValue = subtotal * (discount / 100);
      } else {
        discountValue = discount;
      }
      
      const total = subtotal - discountValue - loyaltyPointsUsed;
      const loyaltyPointsEarned = calculateLoyaltyPoints(total, customer.isMember);

      const finalPaymentMethod = isSplitPayment ? 'split' : (paymentMethod || originalBill.paymentMethod);

      console.log('Updating bill with payment method:', finalPaymentMethod);

      const { error: billError } = await supabase
        .from('bills')
        .update({
          subtotal: subtotal,
          discount: discount,
          discount_value: discountValue,
          discount_type: discountType,
          loyalty_points_used: loyaltyPointsUsed,
          loyalty_points_earned: loyaltyPointsEarned,
          total: total,
          payment_method: finalPaymentMethod,
          is_split_payment: isSplitPayment,
          cash_amount: isSplitPayment ? cashAmount : (finalPaymentMethod === 'cash' ? total : 0),
          upi_amount: isSplitPayment ? upiAmount : (finalPaymentMethod === 'upi' ? total : 0)
        })
        .eq('id', originalBill.id);

      if (billError) {
        console.error('Error updating bill:', billError);
        throw new Error('Failed to update bill');
      }

      console.log('Bill updated successfully in database');

      const { error: deleteError } = await supabase
        .from('bill_items')
        .delete()
        .eq('bill_id', originalBill.id);

      if (deleteError) {
        console.error('Error deleting bill items:', deleteError);
        throw new Error('Failed to delete existing bill items');
      }

      const billItemsToInsert = updatedItems.map(item => ({
        bill_id: originalBill.id,
        location_id: activeLocationId,
        item_id: item.id,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        total: item.total,
        item_type: item.type
      }));

      const { error: itemsError } = await supabase
        .from('bill_items')
        .insert(billItemsToInsert);

      if (itemsError) {
        console.error('Error creating new bill items:', itemsError);
        throw new Error('Failed to create new bill items');
      }

      const updatedBill: Bill = {
        ...originalBill,
        items: updatedItems,
        subtotal: subtotal,
        discount: discount,
        discountValue: discountValue,
        discountType: discountType,
        loyaltyPointsUsed: loyaltyPointsUsed,
        loyaltyPointsEarned: loyaltyPointsEarned,
        total: total,
        paymentMethod: finalPaymentMethod,
        isSplitPayment: isSplitPayment,
        cashAmount: isSplitPayment ? cashAmount : (finalPaymentMethod === 'cash' ? total : 0),
        upiAmount: isSplitPayment ? upiAmount : (finalPaymentMethod === 'upi' ? total : 0)
      };

      setBills(prevBills => {
        const updated = prevBills.map(bill => bill.id === originalBill.id ? updatedBill : bill);
        // ✅ Update cache
        saveToCache(billsCacheKey, updated.slice(0, MAX_CACHED_BILLS));
        return updated;
      });
      
      // ✅ Invalidate cache
      invalidateCache(billsCacheKey);

      toast({
        title: 'Bill Updated',
        description: 'The bill has been updated successfully',
        variant: 'default',
      });

      return updatedBill;
    } catch (error) {
      console.error('Error updating bill:', error);
      toast({
        title: 'Update Failed',
        description: error instanceof Error ? error.message : 'Failed to update bill',
        variant: 'destructive',
      });
      return null;
    }
  };

  const realiseCreditPayment = async (
    bill: Bill,
    mode: 'cash' | 'upi' | 'split',
    options?: { splitCash?: number; splitUpi?: number; silent?: boolean }
  ): Promise<Bill | null> => {
    try {
      if (bill.paymentMethod !== 'credit') {
        if (!options?.silent) {
          toast({
            title: 'Not a credit bill',
            description: 'Only bills on credit can be realised.',
            variant: 'destructive',
          });
        }
        return null;
      }
      if (!activeLocationId) {
        throw new Error('No branch selected');
      }

      const total = bill.total;
      let payment_method: 'cash' | 'upi' | 'split';
      let is_split_payment = false;
      let cash_amount = 0;
      let upi_amount = 0;

      if (mode === 'cash') {
        payment_method = 'cash';
        cash_amount = total;
      } else if (mode === 'upi') {
        payment_method = 'upi';
        upi_amount = total;
      } else {
        payment_method = 'split';
        is_split_payment = true;
        const sc = options?.splitCash;
        const su = options?.splitUpi;
        if (sc !== undefined && su !== undefined && Number.isFinite(sc) && Number.isFinite(su)) {
          if (Math.abs(sc + su - total) > 0.01) {
            if (!options?.silent) {
              toast({
                title: 'Invalid split',
                description: `Cash + UPI must equal ₹${total.toFixed(2)}.`,
                variant: 'destructive',
              });
            }
            return null;
          }
          cash_amount = sc;
          upi_amount = su;
        } else {
          const c = Math.floor((total * 100) / 2) / 100;
          cash_amount = c;
          upi_amount = Math.round((total - c) * 100) / 100;
        }
      }

      const { error } = await supabase
        .from('bills')
        .update({
          payment_method,
          is_split_payment,
          cash_amount,
          upi_amount,
        })
        .eq('id', bill.id)
        .eq('location_id', activeLocationId);

      if (error) {
        console.error('Error realising credit bill:', error);
        throw new Error(error.message || 'Failed to update bill');
      }

      const updatedBill: Bill = {
        ...bill,
        paymentMethod: payment_method,
        isSplitPayment: is_split_payment,
        cashAmount: cash_amount,
        upiAmount: upi_amount,
      };

      setBills((prevBills) => {
        const updated = prevBills.map((b) => (b.id === bill.id ? updatedBill : b));
        saveToCache(billsCacheKey, updated.slice(0, MAX_CACHED_BILLS));
        return updated;
      });
      invalidateCache(billsCacheKey);

      if (!options?.silent) {
        toast({
          title: 'Payment realised',
          description:
            payment_method === 'split'
              ? `Recorded as split: cash ₹${cash_amount.toFixed(2)} + UPI ₹${upi_amount.toFixed(2)}.`
              : `Recorded as ${payment_method.toUpperCase()}.`,
          variant: 'default',
        });
      }

      return updatedBill;
    } catch (error) {
      console.error('Error in realiseCreditPayment:', error);
      if (!options?.silent) {
        toast({
          title: 'Could not realise payment',
          description: error instanceof Error ? error.message : 'Update failed',
          variant: 'destructive',
        });
      }
      return null;
    }
  };

  const deleteBill = async (billId: string, customerId: string): Promise<boolean> => {
    try {
      console.log('Starting bill deletion for bill ID:', billId);

      const { error: cashTransactionsError } = await supabase
        .from('cash_transactions')
        .delete()
        .eq('bill_id', billId);

      if (cashTransactionsError) {
        console.error('Error deleting cash transactions:', cashTransactionsError);
        throw new Error('Failed to delete related cash transactions');
      }

      console.log('Cash transactions deleted successfully');

      const { error: itemsError } = await supabase
        .from('bill_items')
        .delete()
        .eq('bill_id', billId);

      if (itemsError) {
        console.error('Error deleting bill items:', itemsError);
        throw new Error('Failed to delete bill items');
      }

      console.log('Bill items deleted successfully');

      const { error: billError } = await supabase
        .from('bills')
        .delete()
        .eq('id', billId);

      if (billError) {
        console.error('Error deleting bill:', billError);
        throw new Error('Failed to delete bill');
      }

      console.log('Bill deleted successfully');

      setBills(prevBills => {
        const updated = prevBills.filter(bill => bill.id !== billId);
        // ✅ Update cache
        saveToCache(billsCacheKey, updated.slice(0, MAX_CACHED_BILLS));
        return updated;
      });
      
      // ✅ Invalidate cache
      invalidateCache(billsCacheKey);

      toast({
        title: 'Bill Deleted',
        description: 'The bill has been deleted successfully',
        variant: 'default',
      });

      return true;
    } catch (error) {
      console.error('Error deleting bill:', error);
      toast({
        title: 'Delete Failed',
        description: error instanceof Error ? error.message : 'Failed to delete bill',
        variant: 'destructive',
      });
      return false;
    }
  };

  const exportBills = (customers: Customer[]) => {
    const billsWithCustomerNames = bills.map(bill => {
      const customer = customers.find(c => c.id === bill.customerId);
      const customerName = customer ? customer.name : 'Unknown Customer';
      return {
        ...bill,
        customerName: customerName
      };
    });

    const csvData = [
      [
        'Bill ID', 'Customer Name', 'Subtotal', 'Discount', 'Discount Value',
        'Loyalty Points Used', 'Total', 'Payment Method', 'Status', 'Comp Note', 'Created At', 'Items'
      ],
      ...billsWithCustomerNames.map(bill => [
        bill.id,
        bill.customerName,
        bill.subtotal,
        bill.discount,
        bill.discountValue,
        bill.loyaltyPointsUsed,
        bill.total,
        bill.paymentMethod,
        bill.status || 'completed',
        bill.compNote || '',
        bill.createdAt.toLocaleString(),
        bill.items.map(item => `${item.name} (${item.quantity})`).join(', ')
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvData], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'bills.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    console.log('Export bills functionality');
  };

  const exportCustomers = (customers: Customer[]) => {
    const csvData = [
      ['Customer ID', 'Name', 'Phone', 'Email', 'Is Member', 'Loyalty Points', 'Total Spent', 'Created At'],
      ...customers.map(customer => [
        customer.id,
        customer.name,
        customer.phone,
        customer.email || '',
        customer.isMember,
        customer.loyaltyPoints,
        customer.totalSpent,
        customer.createdAt.toLocaleString()
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvData], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'customers.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    console.log('Export customers functionality');
  };

  return {
    bills,
    setBills,
    completeSale,
    updateBill,
    realiseCreditPayment,
    deleteBill,
    exportBills,
    exportCustomers,
  };
};
