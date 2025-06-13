
import { useState, useEffect, useCallback } from 'react';
import { Bill, Customer, CartItem, Product } from '@/types/pos.types';
import { supabase } from "@/integrations/supabase/client";
import { useToast } from '@/hooks/use-toast';
import { generateId } from '@/utils/pos.utils';

export const useBills = (
  updateCustomer: (customer: Customer) => void,
  updateProduct: (product: Product) => void
) => {
  const [bills, setBills] = useState<Bill[]>([]);
  const { toast } = useToast();

  // Use useCallback to memoize the fetch function
  const fetchBills = useCallback(async () => {
    try {
      // Check if local storage has bills data
      const storedBills = localStorage.getItem('cuephoriaBills');
      if (storedBills) {
        const parsedBills = JSON.parse(storedBills);
        
        const billsWithDates = parsedBills.map((bill: any) => ({
          ...bill,
          createdAt: new Date(bill.createdAt)
        }));
        
        setBills(billsWithDates);
        
        // Process in batches to avoid overloading supabase
        const processBatch = async (batch: any[]) => {
          for (const bill of batch) {
            await supabase
              .from('bills')
              .upsert({
                id: bill.id,
                customer_id: bill.customerId,
                subtotal: bill.subtotal,
                discount: bill.discount,
                discount_value: bill.discountValue,
                discount_type: bill.discountType,
                loyalty_points_used: bill.loyaltyPointsUsed,
                loyalty_points_earned: bill.loyaltyPointsEarned,
                total: bill.total,
                payment_method: bill.paymentMethod,
                is_split_payment: bill.isSplitPayment || false,
                cash_amount: bill.cashAmount || 0,
                upi_amount: bill.upiAmount || 0,
                created_at: bill.createdAt.toISOString()
              }, { onConflict: 'id' });
            
            // Batch insert bill items
            const billItems = bill.items.map((item: any) => ({
              bill_id: bill.id,
              item_id: item.id,
              item_type: item.type,
              name: item.name,
              price: item.price,
              quantity: item.quantity,
              total: item.total
            }));
            
            if (billItems.length > 0) {
              await supabase.from('bill_items').insert(billItems);
            }
          }
        };
        
        // Process in batches of 10
        const batchSize = 10;
        for (let i = 0; i < billsWithDates.length; i += batchSize) {
          const batch = billsWithDates.slice(i, i + batchSize);
          await processBatch(batch);
        }
        
        localStorage.removeItem('cuephoriaBills');
        return;
      }
      
      // Fetch bills from Supabase with a limit to improve performance
      const { data: billsData, error: billsError } = await supabase
        .from('bills')
        .select('*')
        .order('created_at', { ascending: false });
        
      if (billsError) {
        console.error('Error fetching bills:', billsError);
        return;
      }
      
      if (!billsData) {
        console.log('No bills found in database');
        return;
      }
      
      // Optimize transformation and fetching of bill items
      const transformedBills: Bill[] = [];
      
      // Fetch all bill items in one query instead of individual queries per bill
      const billIds = billsData.map(bill => bill.id);
      const { data: allItemsData, error: allItemsError } = await supabase
        .from('bill_items')
        .select('*')
        .in('bill_id', billIds);
        
      if (allItemsError) {
        console.error('Error fetching bill items:', allItemsError);
        return;
      }
      
      // Group items by bill_id for faster lookups
      const itemsByBillId: Record<string, any[]> = {};
      if (allItemsData) {
        allItemsData.forEach(item => {
          if (!itemsByBillId[item.bill_id]) {
            itemsByBillId[item.bill_id] = [];
          }
          itemsByBillId[item.bill_id].push(item);
        });
      }
      
      // Transform bills with their respective items
      for (const billData of billsData) {
        const billItems = itemsByBillId[billData.id] || [];
        
        const items: CartItem[] = billItems.map(item => ({
          id: item.item_id,
          type: item.item_type as 'product' | 'session',
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          total: item.total
        }));
        
        transformedBills.push({
          id: billData.id,
          customerId: billData.customer_id,
          items,
          subtotal: billData.subtotal,
          discount: billData.discount,
          discountValue: billData.discount_value,
          discountType: billData.discount_type as 'percentage' | 'fixed',
          loyaltyPointsUsed: billData.loyalty_points_used,
          loyaltyPointsEarned: billData.loyalty_points_earned,
          total: billData.total,
          paymentMethod: billData.payment_method as 'cash' | 'upi' | 'split',
          isSplitPayment: billData.is_split_payment || false,
          cashAmount: billData.cash_amount || 0,
          upiAmount: billData.upi_amount || 0,
          createdAt: new Date(billData.created_at)
        });
      }
      
      setBills(transformedBills);
    } catch (error) {
      console.error('Error in fetchBills:', error);
    }
  }, []);
  
  // Initialize bills data immediately when the component mounts
  useEffect(() => {
    // Use Promise.resolve().then() to defer execution until after the component renders
    Promise.resolve().then(() => {
      console.log('Initial bills loading started');
      fetchBills();
    });
  }, [fetchBills]);

  const completeSale = async (
    cart: CartItem[],
    selectedCustomer: Customer | null,
    discount: number,
    discountType: 'percentage' | 'fixed',
    loyaltyPointsUsed: number,
    calculateTotal: () => number,
    paymentMethod: 'cash' | 'upi' | 'split',
    products: Product[],
    isSplitPayment: boolean = false,
    cashAmount: number = 0,
    upiAmount: number = 0
  ) => {
    if (!selectedCustomer) return undefined;
    
    const membershipItems = cart.filter(item => {
      const product = products.find(p => p.id === item.id && p.category === 'membership');
      return product !== undefined;
    });
    
    if (membershipItems.length > 0 && selectedCustomer.isMember) {
      const currentDate = new Date();
      const membershipExpiryDate = selectedCustomer.membershipExpiryDate 
        ? new Date(selectedCustomer.membershipExpiryDate) 
        : null;
      
      if (membershipExpiryDate && membershipExpiryDate > currentDate) {
        console.error("Customer already has an active membership that hasn't expired yet");
        toast({
          title: "Active Membership",
          description: "Customer already has an active membership that expires on " + 
                      membershipExpiryDate.toLocaleDateString(),
          variant: "destructive"
        });
        throw new Error("Customer already has an active membership that hasn't expired yet");
      }
    }
    
    try {
      const total = calculateTotal();
      const subtotal = cart.reduce((sum, item) => sum + item.total, 0);
      
      let discountValue = 0;
      if (discountType === 'percentage') {
        discountValue = subtotal * (discount / 100);
      } else {
        discountValue = discount;
      }
      
      // Calculate loyalty points based on the new rule
      // Members: 5 points per 100 INR spent
      // Non-members: 2 points per 100 INR spent
      const pointsRate = selectedCustomer.isMember ? 5 : 2;
      const loyaltyPointsEarned = Math.floor((total / 100) * pointsRate);
      
      const billId = generateId();
      console.log("Generated bill ID:", billId);
      
      // For split payment, validate that amounts add up to total
      if (isSplitPayment && Math.abs((cashAmount + upiAmount) - total) > 0.01) {
        toast({
          title: 'Error',
          description: `Split payment amounts (₹${cashAmount + upiAmount}) must equal total (₹${total})`,
          variant: 'destructive'
        });
        return undefined;
      }
      
      // If not split payment but using a specific method, set the entire amount to that method
      if (!isSplitPayment) {
        if (paymentMethod === 'cash') {
          cashAmount = total;
          upiAmount = 0;
        } else if (paymentMethod === 'upi') {
          cashAmount = 0;
          upiAmount = total;
        }
      }
      
      const { data: billData, error: billError } = await supabase
        .from('bills')
        .insert({
          id: billId,
          customer_id: selectedCustomer.id,
          subtotal,
          discount,
          discount_value: discountValue,
          discount_type: discountType,
          loyalty_points_used: loyaltyPointsUsed,
          loyalty_points_earned: loyaltyPointsEarned,
          total,
          payment_method: isSplitPayment ? 'split' : paymentMethod,
          is_split_payment: isSplitPayment,
          cash_amount: cashAmount,
          upi_amount: upiAmount
        })
        .select()
        .single();
        
      if (billError) {
        console.error('Error creating bill:', billError);
        toast({
          title: 'Error',
          description: 'Failed to complete sale: ' + billError.message,
          variant: 'destructive'
        });
        return undefined;
      }
      
      for (const item of cart) {
        const billItemId = generateId();
        
        const { error: itemError } = await supabase
          .from('bill_items')
          .insert({
            id: billItemId,
            bill_id: billId,
            item_id: item.id,
            item_type: item.type,
            name: item.name,
            price: item.price,
            quantity: item.quantity,
            total: item.total
          });
          
        if (itemError) {
          console.error('Error creating bill item:', itemError);
          console.log('Failed item data:', {
            id: billItemId,
            bill_id: billId,
            item_id: item.id,
            item_type: item.type,
            name: item.name,
            price: item.price,
            quantity: item.quantity,
            total: item.total
          });
        }
      }
      
      const bill: Bill = {
        id: billId,
        customerId: selectedCustomer.id,
        items: [...cart],
        subtotal,
        discount,
        discountValue,
        discountType,
        loyaltyPointsUsed,
        loyaltyPointsEarned,
        total,
        paymentMethod: isSplitPayment ? 'split' : paymentMethod,
        isSplitPayment,
        cashAmount,
        upiAmount,
        createdAt: new Date(billData?.created_at || Date.now())
      };
      
      setBills(prevBills => [bill, ...prevBills]);
      
      const updatedCustomer = {
        ...selectedCustomer,
        loyaltyPoints: selectedCustomer.loyaltyPoints - loyaltyPointsUsed + loyaltyPointsEarned,
        totalSpent: selectedCustomer.totalSpent + total
      };
      
      if (membershipItems.length > 0) {
        const membershipProduct = products.find(p => 
          p.id === membershipItems[0].id && p.category === 'membership'
        );
        
        if (membershipProduct) {
          const currentDate = new Date();
          let expiryDate = new Date();
          
          if (membershipProduct.name.toLowerCase().includes("weekly")) {
            expiryDate.setDate(currentDate.getDate() + 7);
          } else if (membershipProduct.name.toLowerCase().includes("monthly")) {
            expiryDate.setDate(currentDate.getDate() + 30);
          }
          
          updatedCustomer.isMember = true;
          updatedCustomer.membershipExpiryDate = expiryDate;
          updatedCustomer.membershipPlan = membershipProduct.name;
          
          if (membershipProduct.membershipHours) {
            updatedCustomer.membershipHoursLeft = membershipProduct.membershipHours;
          }
          
          if (membershipProduct.duration) {
            updatedCustomer.membershipDuration = membershipProduct.duration;
          } else if (membershipProduct.name.toLowerCase().includes("weekly")) {
            updatedCustomer.membershipDuration = "weekly";
          } else if (membershipProduct.name.toLowerCase().includes("monthly")) {
            updatedCustomer.membershipDuration = "monthly";
          }
        }
      }
      
      updateCustomer(updatedCustomer);
      
      for (const item of cart) {
        if (item.type === 'product') {
          const product = products.find(p => p.id === item.id);
          if (product && product.category !== 'membership') {
            updateProduct({
              ...product,
              stock: product.stock - item.quantity
            });
          }
        }
      }
      
      console.log("Sale completed successfully with bill ID:", billId);
      return bill;
    } catch (error) {
      console.error('Error in completeSale:', error);
      toast({
        title: 'Error',
        description: 'Failed to complete sale',
        variant: 'destructive'
      });
      return undefined;
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
    upiAmount: number = 0
  ): Promise<Bill | null> => {
    try {
      // Calculate the new bill total
      const subtotal = updatedItems.reduce((sum, item) => sum + item.total, 0);
      
      // Calculate discount value based on type
      let discountValue = 0;
      if (discountType === 'percentage') {
        discountValue = subtotal * (discount / 100);
      } else {
        discountValue = discount;
      }
      
      // Calculate total after discount and loyalty points
      const total = Math.max(0, subtotal - discountValue - loyaltyPointsUsed);
      
      // For split payment, validate that amounts add up to total
      if (isSplitPayment && Math.abs((cashAmount + upiAmount) - total) > 0.01) {
        toast({
          title: 'Error',
          description: `Split payment amounts (₹${cashAmount + upiAmount}) must equal total (₹${total})`,
          variant: 'destructive'
        });
        return null;
      }
      
      // If not split payment but has a specific method, set the entire amount to that method
      let paymentMethod: 'cash' | 'upi' | 'split' = originalBill.paymentMethod;
      
      if (isSplitPayment) {
        paymentMethod = 'split';
      } else {
        // Single payment method
        if (paymentMethod === 'cash') {
          cashAmount = total;
          upiAmount = 0;
        } else if (paymentMethod === 'upi') {
          cashAmount = 0;
          upiAmount = total;
        }
      }
      
      // Calculate loyalty points earned (members: 5 points per 100 INR, non-members: 2 points per 100 INR)
      const pointsRate = customer.isMember ? 5 : 2;
      const loyaltyPointsEarned = Math.floor((total / 100) * pointsRate);
      
      // Calculate the difference in loyalty points used from the original bill
      const loyaltyPointsDifference = loyaltyPointsUsed - originalBill.loyaltyPointsUsed;
      
      // Calculate the difference in points earned (new points earned - original points earned)
      const pointsEarnedDifference = loyaltyPointsEarned - originalBill.loyaltyPointsEarned;
      
      // Calculate the net change in loyalty points for the customer
      const netLoyaltyPointsChange = -loyaltyPointsDifference + pointsEarnedDifference;
      
      // Create updated bill object
      const updatedBill: Bill = {
        ...originalBill,
        items: updatedItems,
        subtotal,
        discount,
        discountValue,
        discountType,
        loyaltyPointsUsed,
        loyaltyPointsEarned,
        total,
        paymentMethod,
        isSplitPayment,
        cashAmount,
        upiAmount
      };
      
      // Update bill in Supabase
      const { error: billUpdateError } = await supabase
        .from('bills')
        .update({
          subtotal,
          discount,
          discount_type: discountType,
          discount_value: discountValue, 
          loyalty_points_used: loyaltyPointsUsed,
          loyalty_points_earned: loyaltyPointsEarned,
          total,
          payment_method: paymentMethod,
          is_split_payment: isSplitPayment,
          cash_amount: cashAmount,
          upi_amount: upiAmount
        })
        .eq('id', originalBill.id);
      
      if (billUpdateError) {
        console.error('Error updating bill:', billUpdateError);
        throw billUpdateError;
      }
      
      // Delete existing bill items
      const { error: deleteItemsError } = await supabase
        .from('bill_items')
        .delete()
        .eq('bill_id', originalBill.id);
      
      if (deleteItemsError) {
        console.error('Error deleting bill items:', deleteItemsError);
        throw deleteItemsError;
      }
      
      // Insert updated bill items
      const billItemsToInsert = updatedItems.map(item => ({
        bill_id: originalBill.id,
        item_id: item.id,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        total: item.total,
        item_type: item.type
      }));
      
      const { error: insertItemsError } = await supabase
        .from('bill_items')
        .insert(billItemsToInsert);
      
      if (insertItemsError) {
        console.error('Error inserting bill items:', insertItemsError);
        throw insertItemsError;
      }
      
      // Update customer's loyalty points
      if (netLoyaltyPointsChange !== 0) {
        const updatedCustomer = {
          ...customer,
          loyaltyPoints: customer.loyaltyPoints + netLoyaltyPointsChange
        };
        
        // Update customer in database
        const { error: customerUpdateError } = await supabase
          .from('customers')
          .update({ loyalty_points: updatedCustomer.loyaltyPoints })
          .eq('id', customer.id);
        
        if (customerUpdateError) {
          console.error('Error updating customer loyalty points:', customerUpdateError);
          throw customerUpdateError;
        }
        
        // Update customer in state
        updateCustomer(updatedCustomer);
      }
      
      // Update local bills state
      setBills(prevBills => prevBills.map(bill => 
        bill.id === updatedBill.id ? updatedBill : bill
      ));
      
      return updatedBill;
      
    } catch (error) {
      console.error('Error in updateBill:', error);
      toast({
        title: 'Error',
        description: 'Failed to update the transaction.',
        variant: 'destructive'
      });
      return null;
    }
  };

  const deleteBill = async (billId: string, customerId: string) => {
    try {
      const billToDelete = bills.find(bill => bill.id === billId);
      if (!billToDelete) {
        console.error('Bill not found:', billId);
        toast({
          title: 'Error',
          description: 'Bill not found',
          variant: 'destructive'
        });
        return false;
      }
      
      // Step 1: Delete all bill items first (this is crucial for foreign key constraints)
      const { error: itemsDeleteError } = await supabase
        .from('bill_items')
        .delete()
        .eq('bill_id', billId);
        
      if (itemsDeleteError) {
        console.error('Error deleting bill items:', itemsDeleteError);
        toast({
          title: 'Error',
          description: `Failed to delete bill items: ${itemsDeleteError.message}`,
          variant: 'destructive'
        });
        return false;
      }
      
      // Step 2: Delete any related cash transactions
      const { error: cashTransactionError } = await supabase
        .from('cash_transactions')
        .delete()
        .eq('bill_id', billId);
        
      if (cashTransactionError) {
        console.error('Error deleting cash transactions:', cashTransactionError);
        // Don't return false here, just log the error as this might not exist
      }
      
      // Step 3: Now delete the bill itself
      const { error: billDeleteError } = await supabase
        .from('bills')
        .delete()
        .eq('id', billId);
        
      if (billDeleteError) {
        console.error('Error deleting bill:', billDeleteError);
        toast({
          title: 'Error',
          description: `Failed to delete bill: ${billDeleteError.message}`,
          variant: 'destructive'
        });
        return false;
      }
      
      // Step 4: Update local state
      setBills(prevBills => prevBills.filter(bill => bill.id !== billId));
      
      // Step 5: Update customer data if customer still exists
      if (customerId) {
        const { data: customerData, error: customerError } = await supabase
          .from('customers')
          .select('*')
          .eq('id', customerId)
          .single();
          
        if (!customerError && customerData) {
          const updatedCustomer = {
            ...customerData,
            loyalty_points: Math.max(0, customerData.loyalty_points - billToDelete.loyaltyPointsEarned + billToDelete.loyaltyPointsUsed),
            total_spent: Math.max(0, customerData.total_spent - billToDelete.total)
          };
          
          const { error: customerUpdateError } = await supabase
            .from('customers')
            .update({
              loyalty_points: updatedCustomer.loyalty_points,
              total_spent: updatedCustomer.total_spent
            })
            .eq('id', customerId);
            
          if (customerUpdateError) {
            console.error('Error updating customer:', customerUpdateError);
          } else {
            // Update local customer state
            const localCustomer: Customer = {
              id: customerData.id,
              name: customerData.name,
              phone: customerData.phone,
              email: customerData.email,
              isMember: customerData.is_member,
              membershipExpiryDate: customerData.membership_expiry_date ? new Date(customerData.membership_expiry_date) : undefined,
              membershipStartDate: customerData.membership_start_date ? new Date(customerData.membership_start_date) : undefined,
              membershipPlan: customerData.membership_plan,
              membershipHoursLeft: customerData.membership_hours_left,
              membershipDuration: (customerData.membership_duration as 'weekly' | 'monthly' | undefined),
              loyaltyPoints: updatedCustomer.loyalty_points,
              totalSpent: updatedCustomer.total_spent,
              totalPlayTime: customerData.total_play_time,
              createdAt: new Date(customerData.created_at)
            };
            
            updateCustomer(localCustomer);
          }
        }
      }
      
      // Step 6: Update product stock for non-membership items
      const { data: productsData } = await supabase
        .from('products')
        .select('*');
      
      const products = productsData || [];
      
      for (const item of billToDelete.items) {
        if (item.type === 'product') {
          const product = products.find(p => p.id === item.id);
          if (product && product.category !== 'membership') {
            const { error: productUpdateError } = await supabase
              .from('products')
              .update({ stock: product.stock + item.quantity })
              .eq('id', product.id);
              
            if (productUpdateError) {
              console.error('Error updating product stock:', productUpdateError);
            } else {
              const productToUpdate: Product = {
                id: product.id,
                name: product.name,
                price: product.price,
                category: product.category as 'food' | 'drinks' | 'tobacco' | 'challenges' | 'membership',
                stock: product.stock + item.quantity,
                image: product.image,
                originalPrice: product.original_price,
                offerPrice: product.offer_price,
                studentPrice: product.student_price,
                duration: product.duration as 'weekly' | 'monthly' | undefined,
                membershipHours: product.membership_hours
              };
              updateProduct(productToUpdate);
            }
          }
        }
      }
      
      toast({
        title: 'Success',
        description: 'Bill deleted successfully',
        variant: 'default'
      });
      
      return true;
    } catch (error) {
      console.error('Error in deleteBill:', error);
      toast({
        title: 'Error',
        description: `Failed to delete bill: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: 'destructive'
      });
      return false;
    }
  };
  
  const exportBills = (customers: Customer[]) => {
    if (bills.length === 0) {
      console.log("No bills to export.");
      return;
    }
    
    const billData = bills.map(bill => {
      const customer = customers.find(c => c.id === bill.customerId);
      const customerName = customer ? customer.name : 'Unknown Customer';
      
      const itemsData = bill.items.map(item => {
        return `${item.name} (₹${item.price.toFixed(2)} x ${item.quantity})`;
      }).join(', ');
      
      return `
        Bill ID: ${bill.id}
        Customer: ${customerName}
        Items: ${itemsData}
        Subtotal: ₹${bill.subtotal.toFixed(2)}
        Discount: ${bill.discount}%
        Total: ₹${bill.total.toFixed(2)}
        Payment Method: ${bill.paymentMethod}
        Date: ${bill.createdAt.toLocaleString()}
        --------------------------------------------------
      `;
    }).join('\n');
    
    const filename = 'cuephoria_bills.txt';
    const element = document.createElement('a');
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(billData));
    element.setAttribute('download', filename);
    
    element.style.display = 'none';
    document.body.appendChild(element);
    
    element.click();
    
    document.body.removeChild(element);
  };
  
  const exportCustomers = (customers: Customer[]) => {
    if (customers.length === 0) {
      console.log("No customers to export.");
      return;
    }
    
    const customerData = customers.map(customer => {
      return `
        Customer ID: ${customer.id}
        Name: ${customer.name}
        Phone: ${customer.phone}
        Email: ${customer.email || 'N/A'}
        Is Member: ${customer.isMember ? 'Yes' : 'No'}
        Membership Expiry: ${customer.membershipExpiryDate ? customer.membershipExpiryDate.toLocaleDateString() : 'N/A'}
        Loyalty Points: ${customer.loyaltyPoints}
        Total Spent: ₹${customer.totalSpent.toFixed(2)}
        Created At: ${customer.createdAt.toLocaleString()}
        --------------------------------------------------
      `;
    }).join('\n');
    
    const filename = 'cuephoria_customers.txt';
    const element = document.createElement('a');
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(customerData));
    element.setAttribute('download', filename);
    
    element.style.display = 'none';
    document.body.appendChild(element);
    
    element.click();
    
    document.body.removeChild(element);
  };

  return {
    bills,
    setBills,
    completeSale,
    deleteBill,
    updateBill,
    exportBills,
    exportCustomers
  };
};
