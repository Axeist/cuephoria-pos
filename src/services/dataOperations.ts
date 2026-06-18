
import { Bill, Customer, Product, ResetOptions, CartItem } from '@/types/pos.types';
import { supabase } from "@/integrations/supabase/client";

// Reset function with options
export const resetToSampleData = async (
  options: ResetOptions | undefined,
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>,
  setCustomers: React.Dispatch<React.SetStateAction<Customer[]>>,
  setBills: React.Dispatch<React.SetStateAction<Bill[]>>,
  setSessions: React.Dispatch<React.SetStateAction<any[]>>,
  setStations: React.Dispatch<React.SetStateAction<any[]>>,
  setCart: React.Dispatch<React.SetStateAction<CartItem[]>>,
  setDiscountAmount: React.Dispatch<React.SetStateAction<number>>,
  setLoyaltyPointsUsedAmount: React.Dispatch<React.SetStateAction<number>>,
  setSelectedCustomer: React.Dispatch<React.SetStateAction<Customer | null>>,
  refreshFromDB?: () => Promise<Product[]>
) => {
  const defaultOptions = {
    products: false,
    customers: false,
    sales: true,
    sessions: true
  };
  
  const resetOpts = options || defaultOptions;
  
  // Clear local storage data
  if (resetOpts.customers) {
    setCustomers([]);
    localStorage.removeItem('cuephoriaCustomers');
  }
  
  if (resetOpts.sales) {
    // Clear bills from local state
    setBills([]);
    localStorage.removeItem('cuephoriaBills');
    console.log('Cleared all sales/transaction data from local storage');
    
    // Also clear bills from Supabase if available
    try {
      const { error } = await supabase
        .from('bills')
        .delete()
        .neq('id', '0'); // Delete all bills (dummy condition to match all)
        
      if (error) {
        console.error('Error clearing bills from Supabase:', error);
      } else {
        console.log('Successfully cleared bills from Supabase');
      }
    } catch (error) {
      console.error('Error attempting to clear bills from Supabase:', error);
    }
  }
  
  if (resetOpts.sessions) {
    // Clear sessions from local state
    setSessions([]);
    
    // Reset station occupation status
    setStations(prevStations => prevStations.map(station => ({
      ...station,
      isOccupied: false,
      currentSession: null
    })));
    
    localStorage.removeItem('cuephoriaSessions');
    localStorage.removeItem('cuephoriaStations');
    console.log('Cleared all session data from local storage and reset station statuses');
    
    // Also clear sessions from Supabase if available
    try {
      // 1. End all active sessions in Supabase
      const { error: updateError } = await supabase
        .from('sessions')
        .update({ 
          end_time: new Date().toISOString(),
          duration: 0 // Set duration to 0 since we're forcibly ending
        })
        .is('end_time', null); // Only update sessions without an end time
        
      if (updateError) {
        console.error('Error ending active sessions in Supabase:', updateError);
      } else {
        console.log('Successfully ended all active sessions in Supabase');
      }
      
      // 2. Update all stations to show as unoccupied
      const { error: stationError } = await supabase
        .from('stations')
        .update({ is_occupied: false })
        .eq('is_occupied', true);
        
      if (stationError) {
        console.error('Error updating station status in Supabase:', stationError);
      } else {
        console.log('Successfully updated all station statuses in Supabase');
      }
    } catch (error) {
      console.error('Error attempting to clear sessions from Supabase:', error);
    }
  }
  
  if (resetOpts.products && refreshFromDB) {
    // Refresh products from database
    refreshFromDB();
  }
  
  // Clear cart regardless of options
  setCart([]);
  setDiscountAmount(0);
  setLoyaltyPointsUsedAmount(0);
  setSelectedCustomer(null);
};
