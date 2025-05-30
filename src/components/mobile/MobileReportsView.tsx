
import React, { useState } from 'react';
import { BarChart3, TrendingUp, Users, DollarSign, Calendar, Filter } from 'lucide-react';
import MobileContainer from '@/components/ui/mobile-container';
import MobileTabs from '@/components/ui/mobile-tabs';
import MobileCard from '@/components/ui/mobile-card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useIsMobile } from '@/hooks/use-mobile';

const MobileReportsView: React.FC = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [activeSubTab, setActiveSubTab] = useState('daily');
  const isMobile = useIsMobile();

  if (!isMobile) return null;

  const mainTabs = [
    { id: 'overview', label: 'Overview', isActive: activeTab === 'overview' },
    { id: 'analytics', label: 'Analytics', isActive: activeTab === 'analytics' },
    { id: 'finances', label: 'Finances', isActive: activeTab === 'finances' }
  ];

  const salesTabs = [
    { id: 'hourly', label: 'Hourly', isActive: activeSubTab === 'hourly' },
    { id: 'daily', label: 'Daily', isActive: activeSubTab === 'daily' },
    { id: 'weekly', label: 'Weekly', isActive: activeSubTab === 'weekly' },
    { id: 'monthly', label: 'Monthly', isActive: activeSubTab === 'monthly' }
  ];

  const renderOverviewTab = () => (
    <MobileContainer>
      <div className="space-y-4">
        <MobileCard title="Sales Overview" compact>
          <MobileTabs 
            tabs={salesTabs}
            onTabChange={setActiveSubTab}
            className="mb-4"
          />
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="bg-gradient-to-r from-cuephoria-purple/20 to-cuephoria-lightpurple/20 rounded-lg p-3 border border-cuephoria-purple/30">
              <div className="flex items-center gap-2 mb-1">
                <DollarSign className="h-4 w-4 text-cuephoria-lightpurple" />
                <span className="text-xs text-gray-400">Revenue</span>
              </div>
              <p className="text-lg font-bold text-white">₹12,450</p>
              <div className="flex items-center gap-1 mt-1">
                <TrendingUp className="h-3 w-3 text-green-400" />
                <span className="text-xs text-green-400">+15.3%</span>
              </div>
            </div>
            <div className="bg-gradient-to-r from-cuephoria-orange/20 to-yellow-500/20 rounded-lg p-3 border border-cuephoria-orange/30">
              <div className="flex items-center gap-2 mb-1">
                <BarChart3 className="h-4 w-4 text-cuephoria-orange" />
                <span className="text-xs text-gray-400">Orders</span>
              </div>
              <p className="text-lg font-bold text-white">248</p>
              <div className="flex items-center gap-1 mt-1">
                <TrendingUp className="h-3 w-3 text-green-400" />
                <span className="text-xs text-green-400">+8.2%</span>
              </div>
            </div>
          </div>
          <div className="text-center">
            <Button variant="outline" size="sm" className="text-xs">
              View Detailed Chart
            </Button>
          </div>
        </MobileCard>

        <MobileCard title="Quick Stats" compact>
          <div className="space-y-3">
            <div className="flex justify-between items-center py-2 border-b border-gray-800">
              <span className="text-sm text-gray-400">Active Sessions</span>
              <Badge variant="secondary" className="bg-cuephoria-blue/20 text-cuephoria-blue">
                4 Active
              </Badge>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-800">
              <span className="text-sm text-gray-400">Total Customers</span>
              <span className="text-sm font-medium text-white">156</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-sm text-gray-400">Peak Hours</span>
              <span className="text-sm font-medium text-cuephoria-lightpurple">6-9 PM</span>
            </div>
          </div>
        </MobileCard>
      </div>
    </MobileContainer>
  );

  const renderAnalyticsTab = () => (
    <MobileContainer>
      <div className="space-y-4">
        <MobileCard title="Customer Analytics" compact>
          <div className="grid grid-cols-1 gap-3">
            <div className="bg-gradient-to-r from-cuephoria-blue/20 to-cyan-500/20 rounded-lg p-3 border border-cuephoria-blue/30">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-cuephoria-blue" />
                  <span className="text-sm text-gray-400">New Customers</span>
                </div>
                <span className="text-lg font-bold text-white">23</span>
              </div>
              <div className="text-xs text-gray-500">This week</div>
            </div>
            <div className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 rounded-lg p-3 border border-green-500/30">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-green-400" />
                  <span className="text-sm text-gray-400">Retention Rate</span>
                </div>
                <span className="text-lg font-bold text-white">87%</span>
              </div>
              <div className="text-xs text-gray-500">Month over month</div>
            </div>
          </div>
        </MobileCard>

        <MobileCard title="Product Performance" compact>
          <div className="space-y-3">
            <div className="flex justify-between items-center py-2 border-b border-gray-800">
              <span className="text-sm text-gray-400">Top Product</span>
              <span className="text-sm font-medium text-cuephoria-lightpurple">PS5 Sessions</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-800">
              <span className="text-sm text-gray-400">Popular Time</span>
              <span className="text-sm font-medium text-white">Evening</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-sm text-gray-400">Avg Session</span>
              <span className="text-sm font-medium text-cuephoria-orange">2.5 hrs</span>
            </div>
          </div>
        </MobileCard>
      </div>
    </MobileContainer>
  );

  const renderFinancesTab = () => (
    <MobileContainer>
      <div className="space-y-4">
        <MobileCard title="Financial Summary" compact>
          <div className="grid grid-cols-1 gap-3">
            <div className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 rounded-lg p-3 border border-green-500/30">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-400">Total Revenue</span>
                <span className="text-xl font-bold text-white">₹45,230</span>
              </div>
              <div className="text-xs text-green-400">+12% from last month</div>
            </div>
            <div className="bg-gradient-to-r from-red-500/20 to-pink-500/20 rounded-lg p-3 border border-red-500/30">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-400">Total Expenses</span>
                <span className="text-xl font-bold text-white">₹18,750</span>
              </div>
              <div className="text-xs text-red-400">+5% from last month</div>
            </div>
            <div className="bg-gradient-to-r from-cuephoria-purple/20 to-cuephoria-lightpurple/20 rounded-lg p-3 border border-cuephoria-purple/30">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-400">Net Profit</span>
                <span className="text-xl font-bold text-white">₹26,480</span>
              </div>
              <div className="text-xs text-cuephoria-lightpurple">+18% from last month</div>
            </div>
          </div>
        </MobileCard>

        <MobileCard title="Transaction History" compact>
          <div className="space-y-2">
            <div className="text-center text-sm text-gray-400 mb-3">
              View all transactions from May 1st, 2025 to May 31st, 2025
            </div>
            <div className="text-center text-xs text-gray-500 mb-3">
              Showing 50 of 271 transactions
            </div>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {[
                { id: '789d35f2', customer: 'Faizal', items: '1 item', time: '13:21 pm' },
                { id: '4f2b21fb', customer: 'Krishna', items: '2 items', time: '21:32 pm' },
                { id: '05a504c3', customer: 'jagadish', items: '4 items', time: '21:31 pm' }
              ].map((transaction) => (
                <div key={transaction.id} className="flex justify-between items-center py-2 px-3 bg-gray-800/30 rounded-lg">
                  <div>
                    <div className="text-sm font-medium text-white">{transaction.customer}</div>
                    <div className="text-xs text-gray-400">{transaction.items}</div>
                  </div>
                  <div className="text-xs text-gray-500">{transaction.time}</div>
                </div>
              ))}
            </div>
            <div className="flex gap-2 justify-center mt-3">
              <Button variant="outline" size="sm" className="text-xs">Previous</Button>
              <Button variant="outline" size="sm" className="text-xs">Next</Button>
            </div>
          </div>
        </MobileCard>
      </div>
    </MobileContainer>
  );

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-16 z-20 bg-background border-b border-gray-800 pb-2">
        <MobileTabs 
          tabs={mainTabs}
          onTabChange={setActiveTab}
          className="px-2"
        />
      </div>
      <div className="py-4">
        {activeTab === 'overview' && renderOverviewTab()}
        {activeTab === 'analytics' && renderAnalyticsTab()}
        {activeTab === 'finances' && renderFinancesTab()}
      </div>
    </div>
  );
};

export default MobileReportsView;
