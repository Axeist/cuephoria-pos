
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { notificationService } from '@/services/notificationService';

export const useCustomerNotifications = () => {
  useEffect(() => {
    // Set up real-time subscription for new customers
    const channel = supabase
      .channel('customer_notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'customers'
        },
        async (payload) => {
          console.log('New customer detected:', payload);
          const customerData = payload.new;
          
          if (customerData.name) {
            await notificationService.notifyNewCustomer(customerData.name);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);
};
