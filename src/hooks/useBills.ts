import { useState, useEffect } from 'react';
import { Bill, CartItem, Customer, Product } from '@/types/pos.types';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

export const useBills = (
  updateCustomer: (customer: Customer) => void,
  updateProduct: (product: Product) => void
) => {
  const [bills, setBills] = useState<Bill[]>([]);
  const { toast } = useToast();

  // Calculate loyalty points based on correct formula
  const calculateLoyaltyPoints = (total: number, isMember: boolean): number => {
    // Members: 5 points per ₹100 spent
    // Non-members: 2 points per ₹100 spent
    const pointsRate = isMember ? 5 : 2;
    return Math.floor((total / 100) * pointsRate);
  };

  // Load bills from Supabase on component mount
 useEffect(() => {
  const loadBills = async () => {
    try {
      let page = 0;
      const pageSize = 1000; // You can adjust this if needed.
      let allBillsData = [];
      let finished = false;

      while (!finished) {
        const { data: billsData, error: billsError } = await supabase
          .from('bills')
          .select(`
            *,
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
          .order('created_at', { ascending: false })
          .range(page * pageSize, (page + 1) * pageSize - 1); // Paging logic

        if (billsError) {
          console.error('Error loading bills:', billsError);
          return;
        }

        if (billsData && billsData.length > 0) {
          allBillsData = [...allBillsData, ...billsData];
          page++;
        } else {
          finished = true; // Exit loop when no more data is fetched
        }
      }

      // Transform the data to match our Bill interface
      const transformedBills = allBillsData.map(bill => ({
        id: bill.id,
        customerId: bill.customer_id,
        items: (bill.bill_items || []).map((item: any) => ({
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
        paymentMethod: bill.payment_method as 'cash' | 'upi' | 'split' | 'credit',
        isSplitPayment: bill.is_split_payment || false,
        cashAmount: bill.cash_amount ? Number(bill.cash_amount) : 0,
        upiAmount: bill.upi_amount ? Number(bill.upi_amount) : 0,
        createdAt: new Date(bill.created_at)
      }));

      setBills(transformedBills);
      console.log('Bills loaded from database:', transformedBills.length);
    } catch (error) {
      console.error('Error in loadBills:', error);
    }
  };

  loadBills();
}, []);

  const completeSale = async (
    cart: CartItem[],
    customer: Customer,
    discount: number,
    discountType: 'percentage' | 'fixed',
    loyaltyPointsUsed: number,
    calculateTotal: () => number,
    paymentMethod: 'cash' | 'upi' | 'split' | 'credit',
    products: Product[],
    isSplitPayment: boolean = false,
    cashAmount: number = 0,
    upiAmount: number = 0
  ): Promise<Bill | undefined> => {
    try {
      console.log('Starting completeSale with cart:', cart);
      console.log('Customer:', customer);
      console.log('Payment method:', paymentMethod);

      if (!customer || cart.length === 0) {
        throw new Error('Invalid customer or empty cart');
      }

      const subtotal = cart.reduce((sum, item) => sum + item.total, 0);
      let discountValue = 0;
      if (discountType === 'percentage') {
        discountValue = subtotal * (discount / 100);
      } else {
        discountValue = discount;
      }
      
      const total = calculateTotal();
      // Use corrected loyalty points calculation
      const loyaltyPointsEarned = calculateLoyaltyPoints(total, customer.isMember);

      console.log('Calculated values:', { subtotal, discountValue, total, loyaltyPointsEarned });

      // Start a Supabase transaction
      const { data: billData, error: billError } = await supabase
        .from('bills')
        .insert({
          customer_id: customer.id,
          subtotal: subtotal,
          discount: discount,
          discount_value: discountValue,
          discount_type: discountType,
          loyalty_points_used: loyaltyPointsUsed,
          loyalty_points_earned: loyaltyPointsEarned,
          total: total,
          payment_method: paymentMethod,
          is_split_payment: isSplitPayment,
          cash_amount: isSplitPayment ? cashAmount : (paymentMethod === 'cash' ? total : 0),
          upi_amount: isSplitPayment ? upiAmount : (paymentMethod === 'upi' ? total : 0)
        })
        .select()
        .single();

      if (billError) {
        console.error('Error creating bill:', billError);
        throw new Error(`Failed to create bill: ${billError.message}`);
      }

      console.log('Bill created successfully:', billData);

      // Insert bill items
      const billItemsToInsert = cart.map(item => ({
        bill_id: billData.id,
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
        // Try to delete the bill if items insertion failed
        await supabase.from('bills').delete().eq('id', billData.id);
        throw new Error(`Failed to create bill items: ${itemsError.message}`);
      }

      console.log('Bill items created successfully');

      // Update customer
      const updatedCustomer: Customer = {
        ...customer,
        loyaltyPoints: Math.max(0, customer.loyaltyPoints - loyaltyPointsUsed + loyaltyPointsEarned),
        totalSpent: customer.totalSpent + total,
      };

      // Update customer in database
      const { error: customerError } = await supabase
        .from('customers')
        .update({
          loyalty_points: updatedCustomer.loyaltyPoints,
          total_spent: updatedCustomer.totalSpent
        })
        .eq('id', customer.id);

      if (customerError) {
        console.error('Error updating customer:', customerError);
      } else {
        updateCustomer(updatedCustomer);
        console.log('Customer updated successfully');
      }

      // Update product stock for non-session items
      for (const item of cart) {
        if (item.type === 'product') {
          const product = products.find(p => p.id === item.id);
          if (product && product.category !== 'membership') {
            const newStock = Math.max(0, product.stock - item.quantity);
            
            // Update in database
            const { error: productError } = await supabase
              .from('products')
              .update({ stock: newStock })
              .eq('id', product.id);

            if (productError) {
              console.error('Error updating product stock:', productError);
            } else {
              // Update local state
              updateProduct({ ...product, stock: newStock });
              console.log(`Updated stock for ${product.name}: ${newStock}`);
            }
          }
        }
      }

      // Create the complete bill object with items
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
        isSplitPayment: isSplitPayment,
        cashAmount: isSplitPayment ? cashAmount : (paymentMethod === 'cash' ? total : 0),
        upiAmount: isSplitPayment ? upiAmount : (paymentMethod === 'upi' ? total : 0),
        createdAt: new Date(billData.created_at)
      };

      // Update local bills state
      setBills(prevBills => [completeBill, ...prevBills]);
      
      console.log('Sale completed successfully, bill created:', completeBill);
      
      toast({
        title: 'Sale Completed',
        description: `Bill created successfully. Total: ₹${total}`,
        variant: 'default',
      });

      return completeBill;

    } catch (error) {
      console.error('Error in completeSale:', error);
      toast({
        title: 'Sale Failed',
        description: error instanceof Error ? error.message : 'An error occurred while completing the sale',
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
    paymentMethod?: 'cash' | 'upi' | 'split' | 'credit'
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
      // Use corrected loyalty points calculation
      const loyaltyPointsEarned = calculateLoyaltyPoints(total, customer.isMember);

      // Determine the final payment method
      const finalPaymentMethod = isSplitPayment ? 'split' : (paymentMethod || originalBill.paymentMethod);

      console.log('Updating bill with payment method:', finalPaymentMethod);

      // Update bill in database
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

      // Delete existing bill items
      const { error: deleteError } = await supabase
        .from('bill_items')
        .delete()
        .eq('bill_id', originalBill.id);

      if (deleteError) {
        console.error('Error deleting bill items:', deleteError);
        throw new Error('Failed to delete existing bill items');
      }

      // Insert new bill items
      const billItemsToInsert = updatedItems.map(item => ({
        bill_id: originalBill.id,
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

      setBills(prevBills =>
        prevBills.map(bill => bill.id === originalBill.id ? updatedBill : bill)
      );

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

  const deleteBill = async (billId: string, customerId: string): Promise<boolean> => {
    try {
      console.log('Starting bill deletion for bill ID:', billId);

      // First delete related cash transactions
      const { error: cashTransactionsError } = await supabase
        .from('cash_transactions')
        .delete()
        .eq('bill_id', billId);

      if (cashTransactionsError) {
        console.error('Error deleting cash transactions:', cashTransactionsError);
        throw new Error('Failed to delete related cash transactions');
      }

      console.log('Cash transactions deleted successfully');

      // Then delete bill items
      const { error: itemsError } = await supabase
        .from('bill_items')
        .delete()
        .eq('bill_id', billId);

      if (itemsError) {
        console.error('Error deleting bill items:', itemsError);
        throw new Error('Failed to delete bill items');
      }

      console.log('Bill items deleted successfully');

      // Finally delete the bill itself
      const { error: billError } = await supabase
        .from('bills')
        .delete()
        .eq('id', billId);

      if (billError) {
        console.error('Error deleting bill:', billError);
        throw new Error('Failed to delete bill');
      }

      console.log('Bill deleted successfully');

      // Update local state
      setBills(prevBills => prevBills.filter(bill => bill.id !== billId));

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

    // Convert bills to CSV format
    const csvData = [
      [
        'Bill ID', 'Customer Name', 'Subtotal', 'Discount', 'Discount Value',
        'Loyalty Points Used', 'Total', 'Payment Method', 'Created At', 'Items'
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
        bill.createdAt.toLocaleString(),
        bill.items.map(item => `${item.name} (${item.quantity})`).join(', ')
      ])
    ].map(row => row.join(',')).join('\n');

    // Create a download link
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
    // Convert customers to CSV format
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

    // Create a download link
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
    deleteBill,
    exportBills,
    exportCustomers,
  };
};
