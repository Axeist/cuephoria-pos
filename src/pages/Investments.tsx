import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useInvestments } from '@/hooks/useInvestments';
import InvestmentSummaryCards from '@/components/investments/InvestmentSummaryCards';
import InvestmentMetricsWidget from '@/components/investments/InvestmentMetricsWidget';
import InvestmentTrendChart from '@/components/investments/InvestmentTrendChart';
import InvestmentPartnersTable from '@/components/investments/InvestmentPartnersTable';
import InvestmentTransactionsTable from '@/components/investments/InvestmentTransactionsTable';
import InvestmentPartnerDialog from '@/components/investments/InvestmentPartnerDialog';
import InvestmentTransactionDialog from '@/components/investments/InvestmentTransactionDialog';
import { InvestmentPartner, InvestmentTransaction } from '@/types/investment.types';
import { Plus, Search, Users, TrendingUp, BarChart3 } from 'lucide-react';
const Investments = () => {
  const {
    partners,
    transactions,
    isLoading,
    addPartner,
    updatePartner,
    deletePartner,
    addTransaction,
    updateTransaction,
    deleteTransaction
  } = useInvestments();
  const [partnerDialogOpen, setPartnerDialogOpen] = useState(false);
  const [transactionDialogOpen, setTransactionDialogOpen] = useState(false);
  const [editingPartner, setEditingPartner] = useState<InvestmentPartner | undefined>();
  const [editingTransaction, setEditingTransaction] = useState<InvestmentTransaction | undefined>();
  const [searchTerm, setSearchTerm] = useState('');
  const filteredPartners = partners.filter(partner => partner.name.toLowerCase().includes(searchTerm.toLowerCase()) || partner.company?.toLowerCase().includes(searchTerm.toLowerCase()) || partner.email?.toLowerCase().includes(searchTerm.toLowerCase()));
  const filteredTransactions = transactions.filter(transaction => {
    const partner = partners.find(p => p.id === transaction.partner_id);
    return partner?.name.toLowerCase().includes(searchTerm.toLowerCase()) || transaction.description?.toLowerCase().includes(searchTerm.toLowerCase()) || transaction.reference_number?.toLowerCase().includes(searchTerm.toLowerCase());
  });
  const handleAddPartner = () => {
    setEditingPartner(undefined);
    setPartnerDialogOpen(true);
  };
  const handleEditPartner = (partner: InvestmentPartner) => {
    setEditingPartner(partner);
    setPartnerDialogOpen(true);
  };
  const handleSavePartner = async (partnerData: Omit<InvestmentPartner, 'id' | 'created_at' | 'updated_at'>) => {
    if (editingPartner) {
      await updatePartner(editingPartner.id, partnerData);
    } else {
      await addPartner(partnerData);
    }
  };
  const handleAddTransaction = () => {
    setEditingTransaction(undefined);
    setTransactionDialogOpen(true);
  };
  const handleEditTransaction = (transaction: InvestmentTransaction) => {
    setEditingTransaction(transaction);
    setTransactionDialogOpen(true);
  };
  const handleSaveTransaction = async (transactionData: Omit<InvestmentTransaction, 'id' | 'created_at' | 'updated_at'>) => {
    if (editingTransaction) {
      await updateTransaction(editingTransaction.id, transactionData);
    } else {
      await addTransaction(transactionData);
    }
  };
  if (isLoading) {
    return <div className="min-h-screen bg-cuephoria-dark flex items-center justify-center">
        <div className="animate-spin h-10 w-10 rounded-full border-4 border-cuephoria-lightpurple border-t-transparent"></div>
      </div>;
  }
  return <div className="min-h-screen p-4 bg-transparent">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">Investment Management</h1>
            <p className="text-gray-400 mt-1">
              Manage your investment partners and track financial relationships
            </p>
          </div>
        </div>

        {/* Summary Cards */}
        <InvestmentSummaryCards partners={partners} transactions={transactions} />

        {/* Metrics and Trends */}
        <div className="space-y-6">
          <InvestmentMetricsWidget partners={partners} transactions={transactions} />
          <InvestmentTrendChart transactions={transactions} />
        </div>

        {/* Main Content */}
        <Tabs defaultValue="partners" className="space-y-6">
          <TabsList className="bg-gray-800 border-gray-700">
            <TabsTrigger value="partners" className="data-[state=active]:bg-gray-700">
              <Users className="h-4 w-4 mr-2" />
              Partners
            </TabsTrigger>
            <TabsTrigger value="transactions" className="data-[state=active]:bg-gray-700">
              <TrendingUp className="h-4 w-4 mr-2" />
              Transactions
            </TabsTrigger>
            <TabsTrigger value="analytics" className="data-[state=active]:bg-gray-700">
              <BarChart3 className="h-4 w-4 mr-2" />
              Analytics
            </TabsTrigger>
          </TabsList>

          <TabsContent value="partners" className="space-y-4">
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-white">Investment Partners</CardTitle>
                  <Button onClick={handleAddPartner} className="bg-blue-600 hover:bg-blue-700 text-white">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Partner
                  </Button>
                </div>
                
                <div className="flex items-center gap-4 mt-4">
                  <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input placeholder="Search partners..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-10 bg-gray-700 border-gray-600 text-white" />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <InvestmentPartnersTable partners={filteredPartners} onEdit={handleEditPartner} onDelete={deletePartner} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="transactions" className="space-y-4">
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-white">Investment Transactions</CardTitle>
                  <Button onClick={handleAddTransaction} className="bg-blue-600 hover:bg-blue-700 text-white" disabled={partners.length === 0}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Transaction
                  </Button>
                </div>
                
                {partners.length === 0 && <p className="text-yellow-400 text-sm">
                    Add at least one investment partner before creating transactions.
                  </p>}
                
                <div className="flex items-center gap-4 mt-4">
                  <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input placeholder="Search transactions..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-10 bg-gray-700 border-gray-600 text-white" />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <InvestmentTransactionsTable transactions={filteredTransactions} partners={partners} onEdit={handleEditTransaction} onDelete={deleteTransaction} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-4">
            <div className="text-center py-8">
              <h3 className="text-lg font-semibold text-white mb-2">Analytics Dashboard</h3>
              <p className="text-gray-400">
                Detailed analytics and insights are displayed in the charts above
              </p>
            </div>
          </TabsContent>
        </Tabs>

        {/* Dialogs */}
        <InvestmentPartnerDialog open={partnerDialogOpen} onOpenChange={setPartnerDialogOpen} partner={editingPartner} onSave={handleSavePartner} />

        <InvestmentTransactionDialog open={transactionDialogOpen} onOpenChange={setTransactionDialogOpen} transaction={editingTransaction} partners={partners} onSave={handleSaveTransaction} />
      </div>
    </div>;
};
export default Investments;