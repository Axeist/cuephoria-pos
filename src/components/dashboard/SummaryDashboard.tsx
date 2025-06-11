
import React from 'react';
import TopCustomersWidget from './TopCustomersWidget';
import DailySalesTrendWidget from './DailySalesTrendWidget';
import GamingRevenueWidget from './GamingRevenueWidget';
import PaymentAnalyticsWidget from './PaymentAnalyticsWidget';
import CanteenSalesProfitWidget from './CanteenSalesProfitWidget';
import BusinessInsightsWidget from './BusinessInsightsWidget';

interface SummaryDashboardProps {
  startDate?: Date;
  endDate?: Date;
}

const SummaryDashboard: React.FC<SummaryDashboardProps> = ({ startDate, endDate }) => {
  return (
    <div className="space-y-6">
      {/* Top Row - 2 columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <BusinessInsightsWidget startDate={startDate} endDate={endDate} />
        <PaymentAnalyticsWidget startDate={startDate} endDate={endDate} />
      </div>

      {/* Middle Row - 2 columns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DailySalesTrendWidget startDate={startDate} endDate={endDate} />
        <GamingRevenueWidget startDate={startDate} endDate={endDate} />
      </div>

      {/* Bottom Row - Full width */}
      <div className="grid grid-cols-1">
        <CanteenSalesProfitWidget startDate={startDate} endDate={endDate} />
      </div>
    </div>
  );
};

export default SummaryDashboard;
