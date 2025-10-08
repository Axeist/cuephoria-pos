import { useEffect, useRef } from 'react';
import { usePOS } from '@/context/POSContext';
import { useAuth } from '@/context/AuthContext';
import { createStockLog, saveStockLog } from '@/utils/stockLogger';
import { format } from 'date-fns';

export const useAutomaticStockSnapshot = () => {
  const { products } = usePOS();
  const { user } = useAuth();
  const lastSnapshotDate = useRef<string | null>(null);

  useEffect(() => {
    const checkAndCreateSnapshot = () => {
      const now = new Date();
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();
      const today = format(now, 'yyyy-MM-dd');

      // Get last snapshot dates from localStorage
      const lastOpeningSnapshot = localStorage.getItem('lastOpeningSnapshotDate');
      const lastClosingSnapshot = localStorage.getItem('lastClosingSnapshotDate');

      // Check if we need to take opening snapshot at 9:00 AM
      if (
        currentHour === 9 && 
        currentMinute === 0 && 
        lastOpeningSnapshot !== today
      ) {
        console.log('Taking opening stock snapshot at 9:00 AM');
        takeStockSnapshot('opening');
        localStorage.setItem('lastOpeningSnapshotDate', today);
      }

      // Check if we need to take closing snapshot at 11:55 PM
      if (
        currentHour === 23 && 
        currentMinute === 55 && 
        lastClosingSnapshot !== today
      ) {
        console.log('Taking closing stock snapshot at 11:55 PM');
        takeStockSnapshot('closing');
        localStorage.setItem('lastClosingSnapshotDate', today);
      }
    };

    const takeStockSnapshot = (type: 'opening' | 'closing') => {
      try {
        let count = 0;
        const snapshotTime = new Date();

        products.forEach(product => {
          const category = product.category.toLowerCase();
          if (category === 'food' || category === 'drinks') {
            const stockLog = createStockLog(
              product,
              product.stock, // Previous stock same as current for snapshot
              product.stock,
              'adjustment',
              user?.name || user?.email || 'System',
              `Auto ${type} stock snapshot at ${format(snapshotTime, 'hh:mm a')}`
            );
            
            stockLog.timestamp = snapshotTime;
            saveStockLog(stockLog);
            count++;
          }
        });

        console.log(`${type} snapshot: Recorded ${count} products at ${format(snapshotTime, 'hh:mm a')}`);
      } catch (error) {
        console.error('Error taking stock snapshot:', error);
      }
    };

    // Check every minute
    const interval = setInterval(checkAndCreateSnapshot, 60000);

    // Run immediately on mount
    checkAndCreateSnapshot();

    return () => clearInterval(interval);
  }, [products, user]);
};
