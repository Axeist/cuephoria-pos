import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { usePOS } from '@/context/POSContext';
import { useExpenses } from '@/context/ExpenseContext';
import { format, isWithinInterval, startOfDay, endOfDay, subDays, startOfMonth, endOfMonth } from 'date-fns';
import { 
  CalendarIcon, 
  Search, 
  Download, 
  Filter,
  Eye,
  EyeOff,
  Edit,
  Trash2,
  X,
  TrendingUp,
  TrendingDown,
  BarChart3,
  PieChart,
  Calendar as CalendarLucide
} from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CurrencyDisplay } from '@/components/ui/currency';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import SalesWidgets from '@/components/reports/SalesWidgets';
import BusinessSummaryReport from '@/components/dashboard/BusinessSummaryReport';
import ExpandableBillRow from '@/components/reports/ExpandableBillRow';

// Import the new summary components
import SummaryOverview from '@/components/reports/SummaryOverview';
import SummaryCharts from '@/components/reports/SummaryCharts';
import SummaryMetrics from '@/components/reports/SummaryMetrics';

interface BillItem {
  id: string;
  name: string;
  quantity: number;
  total: number;
  type: 'product' | 'session';
}

interface Bill {
  id: string;
  customerId: string;
  items: BillItem[];
  subtotal: number;
  discountValue?: number;
  loyaltyPointsUsed?: number;
  total: number;
  paymentMethod: string;
  isSplitPayment?: boolean;
  cashAmount?: number;
  upiAmount?: number;
  createdAt: Date | string;
}

const Reports = () => {
  const { bills, customers, products } = usePOS();
  const { expenses } = useExpenses();
  
  const [selectedDateRange, setSelectedDateRange] = useState<{
    start: Date | null;
    end: Date | null;
  }>({
    start: null,
    end: null
  });
  
  const [billSearchQuery, setBillSearchQuery] = useState('');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [collapsedBills, setCollapsedBills] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState('summary');

  const toggleBillCollapse = (billId: string) => {
    setCollapsedBills(prev => {
      const newCollapsed = new Set(prev);
      if (newCollapsed.has(billId)) {
        newCollapsed.delete(billId);
      } else {
        newCollapsed.add(billId);
      }
      return newCollapsed;
    });
  };

  const formatCategory = (category: string) => {
    const categoryMap: Record<string, string> = {
      'rent': 'Rent',
      'utilities': 'Utilities',
      'salary': 'Salary',
      'restock': 'Restock',
      'misc': 'Miscellaneous',
    };
    
    return categoryMap[category] || category;
  };

  const exportToExcel = async () => {
    try {
      const workbook = XLSX.utils.book_new();
      
      // Bills data
      const billsData = filteredBills.map(bill => {
        const customer = customers.find(c => c.id === bill.customerId);
        return {
          'Bill ID': bill.id,
          'Customer': customer?.name || 'Walk-in',
          'Date': format(new Date(bill.createdAt), 'dd/MM/yyyy HH:mm'),
          'Subtotal': bill.subtotal,
          'Discount': bill.discountValue || 0,
          'Total': bill.total,
          'Payment Method': bill.paymentMethod,
          'Items': bill.items.map(item => `${item.name} (${item.quantity})`).join(', ')
        };
      });
      
      const billsSheet = XLSX.utils.json_to_sheet(billsData);
      XLSX.utils.book_append_sheet(workbook, billsSheet, 'Bills');
      
      // Expenses data
      const expensesData = filteredExpenses.map(expense => ({
        'Date': expense.date,
        'Name': expense.name,
        'Category': expense.category,
        'Amount': expense.amount,
        'Notes': expense.notes || ''
      }));
      
      const expensesSheet = XLSX.utils.json_to_sheet(expensesData);
      XLSX.utils.book_append_sheet(workbook, expensesSheet, 'Expenses');
      
      const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      const data = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      
      const dateRange = selectedDateRange.start && selectedDateRange.end 
        ? `_${format(selectedDateRange.start, 'dd-MM-yyyy')}_to_${format(selectedDateRange.end, 'dd-MM-yyyy')}`
        : '';
      
      saveAs(data, `reports${dateRange}.xlsx`);
      toast.success('Report exported successfully!');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export report');
    }
  };

  const businessSummaryExport = () => {
    exportToExcel();
  };

  // Filter bills based on search and date range
  const filteredBills = useMemo(() => {
    return bills.filter(bill => {
      // Date filter
      if (selectedDateRange.start || selectedDateRange.end) {
        const billDate = new Date(bill.createdAt);
        const start = selectedDateRange.start ? startOfDay(selectedDateRange.start) : new Date(0);
        const end = selectedDateRange.end ? endOfDay(selectedDateRange.end) : new Date();
        
        if (!isWithinInterval(billDate, { start, end })) {
          return false;
        }
      }

      // Payment method filter
      if (selectedPaymentMethod !== 'all' && bill.paymentMethod !== selectedPaymentMethod) {
        return false;
      }

      // Search filter
      if (billSearchQuery) {
        const query = billSearchQuery.toLowerCase();
        const customer = customers.find(c => c.id === bill.customerId);
        
        return (
          bill.id.toLowerCase().includes(query) ||
          (customer && (
            customer.name.toLowerCase().includes(query) ||
            (customer.email && customer.email.toLowerCase().includes(query)) ||
            customer.phone.includes(query)
          ))
        );
      }

      return true;
    });
  }, [bills, selectedDateRange, selectedPaymentMethod, billSearchQuery, customers]);

  // Filter expenses based on date range
  const filteredExpenses = useMemo(() => {
    if (!selectedDateRange.start && !selectedDateRange.end) {
      return expenses;
    }
    
    return expenses.filter(expense => {
      const expenseDate = new Date(expense.date);
      const start = selectedDateRange.start ? startOfDay(selectedDateRange.start) : new Date(0);
      const end = selectedDateRange.end ? endOfDay(selectedDateRange.end) : new Date();
      
      return isWithinInterval(expenseDate, { start, end });
    });
  }, [expenses, selectedDateRange]);

  // Quick date range functions
  const setToday = () => {
    const today = new Date();
    setSelectedDateRange({ start: today, end: today });
  };

  const setYesterday = () => {
    const yesterday = subDays(new Date(), 1);
    setSelectedDateRange({ start: yesterday, end: yesterday });
  };

  const setThisWeek = () => {
    const today = new Date();
    const startOfWeek = subDays(today, today.getDay());
    setSelectedDateRange({ start: startOfWeek, end: today });
  };

  const setThisMonth = () => {
    const today = new Date();
    setSelectedDateRange({ 
      start: startOfMonth(today), 
      end: endOfMonth(today) 
    });
  };

  const clearDateRange = () => {
    setSelectedDateRange({ start: null, end: null });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white">Reports & Analytics</h1>
            <p className="text-gray-400 mt-1">
              {selectedDateRange.start && selectedDateRange.end 
                ? `${format(selectedDateRange.start, 'PP')} - ${format(selectedDateRange.end, 'PP')}`
                : 'All time data'
              }
            </p>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className="bg-gray-800 border-gray-700 text-white hover:bg-gray-700"
            >
              <Filter className="h-4 w-4 mr-2" />
              Filters
            </Button>
            
            <Button
              onClick={exportToExcel}
              className="bg-purple-600 hover:bg-purple-700 text-white"
            >
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <Card className="bg-gray-800/50 border-gray-700">
            <CardContent className="p-6">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {/* Date Range */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-200">Date Range</label>
                  <div className="flex gap-2">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="bg-gray-700 border-gray-600 text-white hover:bg-gray-600">
                          <CalendarIcon className="h-4 w-4 mr-2" />
                          {selectedDateRange.start ? format(selectedDateRange.start, 'dd/MM') : 'Start'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0 bg-gray-800 border-gray-700">
                        <Calendar
                          mode="single"
                          selected={selectedDateRange.start || undefined}
                          onSelect={(date) => setSelectedDateRange(prev => ({ ...prev, start: date || null }))}
                          className="text-white"
                        />
                      </PopoverContent>
                    </Popover>
                    
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="bg-gray-700 border-gray-600 text-white hover:bg-gray-600">
                          <CalendarIcon className="h-4 w-4 mr-2" />
                          {selectedDateRange.end ? format(selectedDateRange.end, 'dd/MM') : 'End'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0 bg-gray-800 border-gray-700">
                        <Calendar
                          mode="single"
                          selected={selectedDateRange.end || undefined}
                          onSelect={(date) => setSelectedDateRange(prev => ({ ...prev, end: date || null }))}
                          className="text-white"
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>

                {/* Quick Date Buttons */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-200">Quick Select</label>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" onClick={setToday} className="bg-gray-700 border-gray-600 text-white hover:bg-gray-600">
                      Today
                    </Button>
                    <Button size="sm" variant="outline" onClick={setYesterday} className="bg-gray-700 border-gray-600 text-white hover:bg-gray-600">
                      Yesterday
                    </Button>
                    <Button size="sm" variant="outline" onClick={setThisWeek} className="bg-gray-700 border-gray-600 text-white hover:bg-gray-600">
                      This Week
                    </Button>
                    <Button size="sm" variant="outline" onClick={setThisMonth} className="bg-gray-700 border-gray-600 text-white hover:bg-gray-600">
                      This Month
                    </Button>
                  </div>
                </div>

                {/* Payment Method Filter */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-200">Payment Method</label>
                  <Select value={selectedPaymentMethod} onValueChange={setSelectedPaymentMethod}>
                    <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                      <SelectValue placeholder="All methods" />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-800 border-gray-700">
                      <SelectItem value="all">All Methods</SelectItem>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="upi">UPI</SelectItem>
                      <SelectItem value="split">Split Payment</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Clear Filters */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-200">Actions</label>
                  <Button 
                    variant="outline" 
                    onClick={clearDateRange}
                    className="w-full bg-gray-700 border-gray-600 text-white hover:bg-gray-600"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Clear Filters
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-gray-800 border-gray-700 p-1">
            <TabsTrigger 
              value="summary" 
              className="data-[state=active]:bg-purple-600 data-[state=active]:text-white text-gray-300"
            >
              <BarChart3 className="h-4 w-4 mr-2" />
              Summary
            </TabsTrigger>
            <TabsTrigger 
              value="business" 
              className="data-[state=active]:bg-purple-600 data-[state=active]:text-white text-gray-300"
            >
              <TrendingUp className="h-4 w-4 mr-2" />
              Business Report
            </TabsTrigger>
            <TabsTrigger 
              value="transactions" 
              className="data-[state=active]:bg-purple-600 data-[state=active]:text-white text-gray-300"
            >
              <PieChart className="h-4 w-4 mr-2" />
              Transactions
            </TabsTrigger>
          </TabsList>

          {/* New Summary Tab */}
          <TabsContent value="summary" className="space-y-6">
            <SummaryOverview 
              filteredBills={filteredBills} 
              filteredExpenses={filteredExpenses}
              customers={customers}
              products={products}
              dateRange={selectedDateRange}
            />
            
            <div className="grid gap-6 lg:grid-cols-2">
              <SummaryMetrics 
                filteredBills={filteredBills}
                filteredExpenses={filteredExpenses}
                customers={customers}
                products={products}
              />
              
              <SummaryCharts 
                filteredBills={filteredBills}
                filteredExpenses={filteredExpenses}
                customers={customers}
                products={products}
              />
            </div>
          </TabsContent>

          {/* Business Report Tab */}
          <TabsContent value="business" className="space-y-6">
            <BusinessSummaryReport
              startDate={selectedDateRange.start || undefined}
              endDate={selectedDateRange.end || undefined}
              onDownload={businessSummaryExport}
            />
          </TabsContent>

          {/* Transactions Tab */}
          <TabsContent value="transactions" className="space-y-6">
            <SalesWidgets filteredBills={filteredBills} />
            
            <Card className="bg-gray-800/50 border-gray-700">
              <CardHeader>
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                  <CardTitle className="text-white">Transaction Details</CardTitle>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 h-4 w-4" />
                    <Input 
                      placeholder="Search by customer name, email, phone, or bill ID" 
                      value={billSearchQuery}
                      onChange={(e) => setBillSearchQuery(e.target.value)}
                      className="pl-10 bg-gray-800 border-gray-700 text-white w-full md:w-96"
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {filteredBills.length === 0 ? (
                  <div className="text-center py-8 text-gray-400">
                    No transactions found for the selected criteria
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filteredBills.map((bill) => (
                      <ExpandableBillRow
                        key={bill.id}
                        bill={bill}
                        customer={customers.find(c => c.id === bill.customerId)}
                        isCollapsed={collapsedBills.has(bill.id)}
                        onToggleCollapse={(billId) => {
                          const newCollapsed = new Set(collapsedBills);
                          if (newCollapsed.has(billId)) {
                            newCollapsed.delete(billId);
                          } else {
                            newCollapsed.add(billId);
                          }
                          setCollapsedBills(newCollapsed);
                        }}
                      />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Reports;
