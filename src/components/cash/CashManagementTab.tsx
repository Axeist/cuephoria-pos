
import React, { useState } from 'react';
import { useCash } from '@/context/CashContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CurrencyDisplay } from '@/components/ui/currency';
import { Banknote, TrendingUp, TrendingDown, Plus } from 'lucide-react';
import CashSummaryCards from './CashSummaryCards';
import CashTransactionsList from './CashTransactionsList';
import DepositDialog from './DepositDialog';
import DailyCashView from './DailyCashView';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const CashManagementTab = () => {
  const { todayCashOnHand, loading } = useCash();
  const [isDepositDialogOpen, setIsDepositDialogOpen] = useState(false);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="bg-gray-800 border-gray-700">
              <CardContent className="p-6">
                <div className="animate-pulse">
                  <div className="h-4 bg-gray-700 rounded w-3/4 mb-2"></div>
                  <div className="h-8 bg-gray-700 rounded w-1/2"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Cash Overview Cards */}
      <CashSummaryCards />

      {/* Quick Actions */}
      <div className="flex gap-4">
        <Button 
          onClick={() => setIsDepositDialogOpen(true)}
          className="bg-green-600 hover:bg-green-700 text-white"
        >
          <Plus className="h-4 w-4 mr-2" />
          Record Bank Deposit
        </Button>
      </div>

      {/* Cash Management Tabs */}
      <Tabs defaultValue="daily" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="daily">Daily View</TabsTrigger>
          <TabsTrigger value="transactions">All Transactions</TabsTrigger>
        </TabsList>
        
        <TabsContent value="daily" className="space-y-6">
          <DailyCashView />
        </TabsContent>
        
        <TabsContent value="transactions" className="space-y-6">
          <CashTransactionsList />
        </TabsContent>
      </Tabs>

      {/* Deposit Dialog */}
      <DepositDialog 
        open={isDepositDialogOpen}
        onOpenChange={setIsDepositDialogOpen}
      />
    </div>
  );
};

export default CashManagementTab;
