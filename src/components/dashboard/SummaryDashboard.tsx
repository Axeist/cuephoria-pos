
import React from 'react';
import TopCustomersWidget from './TopCustomersWidget';
import DailySalesTrendWidget from './DailySalesTrendWidget';
import GamingRevenueWidget from './GamingRevenueWidget';
import PaymentAnalyticsWidget from './PaymentAnalyticsWidget';
import BusinessInsightsWidget from './BusinessInsightsWidget';
import CanteenSalesProfitWidget from './CanteenSalesProfitWidget';

interface SummaryDashboardProps {
  dateRange?: { start: Date; end: Date } | null;
}

const SummaryDashboard: React.FC<SummaryDashboardProps> = ({ dateRange }) => {
  return (
    <div className="space-y-6">
      {/* Top Row - 3 columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <TopCustomersWidget dateRange={dateRange} />
        <BusinessInsightsWidget dateRange={dateRange} />
        <PaymentAnalyticsWidget dateRange={dateRange} />
      </div>

      {/* Middle Row - 2 columns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DailySalesTrendWidget dateRange={dateRange} />
        <GamingRevenueWidget dateRange={dateRange} />
      </div>

      {/* Bottom Row - Full width */}
      <div className="grid grid-cols-1">
        <CanteenSalesProfitWidget dateRange={dateRange} />
      </div>
    </div>
  );
};

export default SummaryDashboard;
