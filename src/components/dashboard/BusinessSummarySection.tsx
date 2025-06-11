
import React, { useMemo } from 'react';
import StatCardSection from './StatCardSection';
import { usePOS } from '@/context/POSContext';

interface BusinessSummarySectionProps {
  startDate?: Date;
  endDate?: Date;
}

const BusinessSummarySection: React.FC<BusinessSummarySectionProps> = ({ 
  startDate, 
  endDate 
}) => {
  const { bills, customers, stations, products } = usePOS();

  // Calculate metrics with date filtering - using the same logic as PaymentAnalyticsWidget
  const metrics = useMemo(() => {
    console.log('BusinessSummarySection - Calculating with date range:', { startDate, endDate });
    
    // Filter bills by date range if provided - SAME AS PaymentAnalyticsWidget
    const filteredBills = bills.filter(bill => {
      const billDate = new Date(bill.createdAt);
      if (startDate && billDate < startDate) return false;
      if (endDate && billDate > endDate) return false;
      return true;
    });

    console.log('BusinessSummarySection - Filtered bills count:', filteredBills.length);
    console.log('BusinessSummarySection - Total bills count:', bills.length);

    // Calculate total sales using the EXACT same logic as PaymentAnalyticsWidget
    const totalSales = filteredBills.reduce((sum, bill) => {
      console.log(`BusinessSummarySection - Adding bill total: ${bill.total} for bill ${bill.id}`);
      return sum + bill.total;
    }, 0);

    console.log('BusinessSummarySection - Final total sales:', totalSales);

    // Previous period calculation for trend
    const previousPeriodStart = startDate ? new Date(startDate.getTime() - (endDate ? endDate.getTime() - startDate.getTime() : 30 * 24 * 60 * 60 * 1000)) : new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);
    const previousPeriodEnd = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    
    const previousPeriodBills = bills.filter(bill => {
      const billDate = new Date(bill.createdAt);
      return billDate >= previousPeriodStart && billDate < previousPeriodEnd;
    });
    
    const previousPeriodSales = previousPeriodBills.reduce((sum, bill) => sum + bill.total, 0);
    const salesGrowth = previousPeriodSales > 0 ? ((totalSales - previousPeriodSales) / previousPeriodSales) * 100 : 0;
    const salesChange = salesGrowth >= 0 ? `+${salesGrowth.toFixed(1)}%` : `${salesGrowth.toFixed(1)}%`;

    // Count active sessions
    const activeSessionsCount = stations.filter(station => station.isOccupied).length;

    // Count customers
    const customersCount = customers.length;

    // Count new members today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const newMembersCount = customers.filter(customer => {
      const memberSince = new Date(customer.created_at);
      memberSince.setHours(0, 0, 0, 0);
      return memberSince.getTime() === today.getTime() && customer.isMember;
    }).length;

    // Low stock items (stock <= 5)
    const lowStockItems = products.filter(product => product.stock <= 5);
    const lowStockCount = lowStockItems.length;

    return {
      totalSales,
      salesChange,
      activeSessionsCount,
      totalStations: stations.length,
      customersCount,
      newMembersCount,
      lowStockCount,
      lowStockItems
    };
  }, [bills, customers, stations, products, startDate, endDate]);

  return (
    <StatCardSection 
      {...metrics}
      startDate={startDate}
      endDate={endDate}
    />
  );
};

export default BusinessSummarySection;
