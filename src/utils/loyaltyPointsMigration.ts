
import { supabase } from '@/integrations/supabase/client';
import { Customer } from '@/types/pos.types';

// Calculate loyalty points based on correct formula
const calculateLoyaltyPoints = (totalSpent: number, isMember: boolean): number => {
  // Members: 5 points per ₹100 spent
  // Non-members: 2 points per ₹100 spent
  const pointsRate = isMember ? 5 : 2;
  return Math.floor((totalSpent / 100) * pointsRate);
};

export const migrateLoyaltyPoints = async (): Promise<{ success: boolean; updatedCount: number; error?: string }> => {
  try {
    console.log('Starting loyalty points migration...');
    
    // Fetch all customers
    const { data: customers, error: fetchError } = await supabase
      .from('customers')
      .select('*');

    if (fetchError) {
      console.error('Error fetching customers:', fetchError);
      return { success: false, updatedCount: 0, error: fetchError.message };
    }

    if (!customers || customers.length === 0) {
      console.log('No customers found to migrate');
      return { success: true, updatedCount: 0 };
    }

    let updatedCount = 0;
    const updates = [];

    // Calculate correct loyalty points for each customer
    for (const customer of customers) {
      const correctLoyaltyPoints = calculateLoyaltyPoints(customer.total_spent, customer.is_member);
      
      if (customer.loyalty_points !== correctLoyaltyPoints) {
        console.log(`Customer ${customer.name}: ${customer.loyalty_points} → ${correctLoyaltyPoints} points`);
        
        updates.push({
          id: customer.id,
          loyalty_points: correctLoyaltyPoints
        });
        updatedCount++;
      }
    }

    if (updates.length === 0) {
      console.log('All customer loyalty points are already correct');
      return { success: true, updatedCount: 0 };
    }

    // Batch update all customers
    for (const update of updates) {
      const { error: updateError } = await supabase
        .from('customers')
        .update({ loyalty_points: update.loyalty_points })
        .eq('id', update.id);

      if (updateError) {
        console.error(`Error updating customer ${update.id}:`, updateError);
        throw updateError;
      }
    }

    console.log(`Successfully migrated loyalty points for ${updatedCount} customers`);
    return { success: true, updatedCount };

  } catch (error) {
    console.error('Error in loyalty points migration:', error);
    return { 
      success: false, 
      updatedCount: 0, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
};
