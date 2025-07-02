import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface SalesData {
  totalSales: number;
  totalTransactions: number;
  loading: boolean;
}

export const useSalesData = (): SalesData => {
  const [salesData, setSalesData] = useState<SalesData>({
    totalSales: 0,
    totalTransactions: 0,
    loading: true
  });

  useEffect(() => {
    const fetchSalesData = async () => {
      try {
        const { data: bills, error } = await supabase
          .from('bills')
          .select('total');

        if (error) {
          console.error('Error fetching sales data:', error);
          return;
        }

        const totalSales = bills?.reduce((sum, bill) => sum + Number(bill.total), 0) || 0;
        const totalTransactions = bills?.length || 0;

        setSalesData({
          totalSales,
          totalTransactions,
          loading: false
        });
      } catch (error) {
        console.error('Error in fetchSalesData:', error);
        setSalesData(prev => ({ ...prev, loading: false }));
      }
    };

    fetchSalesData();
  }, []);

  return salesData;
};