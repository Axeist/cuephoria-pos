
import React, { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useExpenses } from '@/context/ExpenseContext';
import { CurrencyDisplay } from '@/components/ui/currency';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Expense } from '@/types/expense.types';
import { format } from 'date-fns';
import { usePOS } from '@/context/POSContext';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';

interface BusinessSummaryReportProps {
  startDate?: Date;
  endDate?: Date;
  onDownload: () => void;
}

const BusinessSummaryReport: React.FC<BusinessSummaryReportProps> = ({ 
  startDate, 
  endDate,
  onDownload 
}) => {
  const { expenses, businessSummary } = useExpenses();
  const { bills, products, customers } = usePOS();
  
  // Current date for display
  const currentDate = new Date();
  
  // Memoize all calculations to improve performance
  const reportData = useMemo(() => {
    // Filter expenses based on date range
    const filteredExpenses = expenses.filter(expense => {
      if (!startDate && !endDate) return true;
      
      const expenseDate = new Date(expense.date);
      
      if (startDate && endDate) {
        return expenseDate >= startDate && expenseDate <= endDate;
      } else if (startDate) {
        return expenseDate >= startDate;
      } else if (endDate) {
        return expenseDate <= endDate;
      }
      
      return true;
    });
    
    // Filter bills based on date range
    const filteredBills = bills.filter(bill => {
      if (!startDate && !endDate) return true;
      
      const billDate = new Date(bill.createdAt);
      
      if (startDate && endDate) {
        return billDate >= startDate && billDate <= endDate;
      } else if (startDate) {
        return billDate >= startDate;
      } else if (endDate) {
        return billDate <= endDate;
      }
      
      return true;
    });

    // Group expenses by category
    const expensesByCategory = filteredExpenses.reduce((acc, expense) => {
      const { category } = expense;
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(expense);
      return acc;
    }, {} as Record<string, Expense[]>);
    
    // Calculate total per category
    const categoryTotals = Object.entries(expensesByCategory).map(([category, expenses]) => {
      const total = expenses.reduce((sum, expense) => sum + expense.amount, 0);
      return { category, total };
    }).sort((a, b) => b.total - a.total);
    
    // Calculate total expenses
    const totalExpenses = categoryTotals.reduce((sum, category) => sum + category.total, 0);
    
    // Initialize revenue variables with zero values
    let ps5Sales = 0;
    let poolSales = 0;
    let metashotSales = 0;
    let foodSales = 0;
    let beverageSales = 0;
    let tobaccoSales = 0;
    
    // Process all bills at once to improve performance
    filteredBills.forEach(bill => {
      // Calculate effective discount rate for proportional application
      const discountRatio = bill.subtotal > 0 ? bill.total / bill.subtotal : 1;
      
      bill.items.forEach(item => {
        // Apply proportional discount to each item to reflect actual revenue
        const discountedItemTotal = item.total * discountRatio;
        
        if (item.type === 'session') {
          // Look for PS5 or Pool in the name (case insensitive)
          const itemName = item.name.toLowerCase();
          if (itemName.includes('ps5') || itemName.includes('playstation')) {
            ps5Sales += discountedItemTotal;
          } else if (itemName.includes('pool') || itemName.includes('8-ball') || itemName.includes('8 ball')) {
            poolSales += discountedItemTotal;
          }
        } 
        // Handle Metashot challenge items - these are products, but should count towards gaming revenue
        else if (item.type === 'product') {
          // Find the product to check its category
          const product = products.find(p => p.id === item.id);
          if (product) {
            const category = product.category.toLowerCase();
            const name = product.name.toLowerCase();
            
            if (name.includes('metashot') || name.includes('meta shot') || 
                category === 'challenges' || category === 'challenge') {
              metashotSales += discountedItemTotal;
            } else if (category === 'food' || category === 'snacks') {
              foodSales += discountedItemTotal;
            } else if (category === 'beverage' || category === 'drinks') {
              beverageSales += discountedItemTotal;
            } else if (category === 'tobacco') {
              tobaccoSales += discountedItemTotal;
            }
          }
        }
      });
    });
    
    // Calculate total gaming sales and canteen sales
    const totalGameSales = ps5Sales + poolSales + metashotSales;
    const totalCanteenSales = foodSales + beverageSales + tobaccoSales;
    
    // Calculate total revenue as the sum of all sales
    const totalRevenue = totalGameSales + totalCanteenSales;
    
    // Calculate net profit and profit margin
    const netProfit = totalRevenue - totalExpenses;
    // Prevent division by zero
    const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;
    
    // Calculate customer metrics for deeper insights
    const activeCustomers = customers.filter(c => {
      const hasRecentBill = filteredBills.some(bill => bill.customerId === c.id);
      return hasRecentBill;
    });
    
    // Calculate loyalty program efficiency
    const totalLoyaltyPointsEarned = filteredBills.reduce((sum, bill) => sum + (bill.loyaltyPointsEarned || 0), 0);
    const totalLoyaltyPointsUsed = filteredBills.reduce((sum, bill) => sum + (bill.loyaltyPointsUsed || 0), 0);
    const loyaltyRedemptionRate = totalLoyaltyPointsEarned > 0 ? (totalLoyaltyPointsUsed / totalLoyaltyPointsEarned) * 100 : 0;
    
    return {
      categoryTotals,
      totalExpenses,
      gameSales: {
        ps5Sales,
        poolSales,
        metashotSales,
        totalGameSales
      },
      canteenSales: {
        foodSales,
        beverageSales,
        tobaccoSales,
        totalCanteenSales
      },
      businessHealth: {
        totalRevenue,
        netProfit,
        profitMargin
      },
      customerInsights: {
        activeCustomerCount: activeCustomers.length,
        loyaltyRedemptionRate
      }
    };
  }, [expenses, bills, products, customers, startDate, endDate]);

  // Format category name
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

  // Handle download of the Excel report
  const handleDownloadExcel = () => {
    try {
      // Call the passed onDownload function
      onDownload();
    } catch (error) {
      console.error("Error exporting to Excel:", error);
    }
  };
  
  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-xl">Business Summary Report</CardTitle>
          <CardDescription>
            {startDate && endDate 
              ? `From ${format(startDate, 'PP')} to ${format(endDate, 'PP')}`
              : startDate
                ? `From ${format(startDate, 'PP')}`
                : endDate
                  ? `Until ${format(endDate, 'PP')}`
                  : `${format(currentDate, 'MMMM yyyy')}`
            }
          </CardDescription>
        </div>
        <Button
          onClick={handleDownloadExcel}
          className="gap-2 bg-purple-500 hover:bg-purple-600"
        >
          <Download className="h-4 w-4" />
          Export to Excel
        </Button>
      </CardHeader>
      <CardContent>
        <div className="grid gap-6 md:grid-cols-3 mb-6">
          <div className="space-y-1.5">
            <h3 className="font-medium text-sm">Gross Income</h3>
            <p className="text-2xl font-bold">
              <CurrencyDisplay amount={reportData.businessHealth.totalRevenue} />
            </p>
            <p className="text-xs text-gray-500">
              {reportData.businessHealth.totalRevenue > 0
                ? `${reportData.gameSales.totalGameSales / reportData.businessHealth.totalRevenue * 100 < 100
                    ? `${(reportData.gameSales.totalGameSales / reportData.businessHealth.totalRevenue * 100).toFixed(0)}% from gaming`
                    : '100% from gaming'}`
                : '0% from gaming'}
            </p>
          </div>
          <div className="space-y-1.5">
            <h3 className="font-medium text-sm">Total Expenses</h3>
            <p className="text-2xl font-bold">
              <CurrencyDisplay amount={reportData.totalExpenses} />
            </p>
            <p className="text-xs text-gray-500">
              {reportData.categoryTotals.length > 0
                ? `Largest: ${formatCategory(reportData.categoryTotals[0].category)}`
                : 'No expenses recorded'}
            </p>
          </div>
          <div className="space-y-1.5">
            <h3 className="font-medium text-sm">Net Profit</h3>
            <p className={`text-2xl font-bold ${reportData.businessHealth.netProfit < 0 ? 'text-red-500' : ''}`}>
              <CurrencyDisplay amount={reportData.businessHealth.netProfit} />
            </p>
            <p className="text-xs text-gray-500">
              {reportData.businessHealth.profitMargin.toFixed(1)}% profit margin
            </p>
          </div>
        </div>
        
        <div className="grid gap-8 md:grid-cols-2 mb-8">
          <div>
            <h3 className="font-semibold text-base mb-2">Expenses by Category</h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Category</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>% of Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reportData.categoryTotals.length > 0 ? (
                  reportData.categoryTotals.map(({ category, total }) => (
                    <TableRow key={category}>
                      <TableCell>{formatCategory(category)}</TableCell>
                      <TableCell>
                        <CurrencyDisplay amount={total} />
                      </TableCell>
                      <TableCell>
                        {reportData.totalExpenses 
                          ? ((total / reportData.totalExpenses) * 100).toFixed(1) 
                          : '0.0'}%
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-8 text-gray-400">
                      No expenses found in the selected date range
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          
          <div>
            <h3 className="font-semibold text-base mb-2">Gaming Station Revenue</h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Station Type</TableHead>
                  <TableHead>Revenue</TableHead>
                  <TableHead>% of Gaming Revenue</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reportData.gameSales.totalGameSales > 0 ? (
                  <>
                    <TableRow>
                      <TableCell>PS5 Stations</TableCell>
                      <TableCell>
                        <CurrencyDisplay amount={reportData.gameSales.ps5Sales} />
                      </TableCell>
                      <TableCell>
                        {reportData.gameSales.totalGameSales > 0 
                          ? ((reportData.gameSales.ps5Sales / reportData.gameSales.totalGameSales) * 100).toFixed(1) 
                          : '0.0'}%
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>8-Ball Pool</TableCell>
                      <TableCell>
                        <CurrencyDisplay amount={reportData.gameSales.poolSales} />
                      </TableCell>
                      <TableCell>
                        {reportData.gameSales.totalGameSales > 0 
                          ? ((reportData.gameSales.poolSales / reportData.gameSales.totalGameSales) * 100).toFixed(1) 
                          : '0.0'}%
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Metashot Challenges</TableCell>
                      <TableCell>
                        <CurrencyDisplay amount={reportData.gameSales.metashotSales} />
                      </TableCell>
                      <TableCell>
                        {reportData.gameSales.totalGameSales > 0 
                          ? ((reportData.gameSales.metashotSales / reportData.gameSales.totalGameSales) * 100).toFixed(1) 
                          : '0.0'}%
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-semibold">Total</TableCell>
                      <TableCell className="font-semibold">
                        <CurrencyDisplay amount={reportData.gameSales.totalGameSales} />
                      </TableCell>
                      <TableCell>100.0%</TableCell>
                    </TableRow>
                  </>
                ) : (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-8 text-gray-400">
                      No gaming revenue found in the selected date range
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
        
        <div className="mb-6">
          <h3 className="font-semibold text-base mb-2">Canteen Sales</h3>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Category</TableHead>
                <TableHead>Revenue</TableHead>
                <TableHead>% of Canteen Revenue</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reportData.canteenSales.totalCanteenSales > 0 ? (
                <>
                  <TableRow>
                    <TableCell>Food & Snacks</TableCell>
                    <TableCell>
                      <CurrencyDisplay amount={reportData.canteenSales.foodSales} />
                    </TableCell>
                    <TableCell>
                      {reportData.canteenSales.totalCanteenSales > 0 
                        ? ((reportData.canteenSales.foodSales / reportData.canteenSales.totalCanteenSales) * 100).toFixed(1) 
                        : '0.0'}%
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Beverages & Drinks</TableCell>
                    <TableCell>
                      <CurrencyDisplay amount={reportData.canteenSales.beverageSales} />
                    </TableCell>
                    <TableCell>
                      {reportData.canteenSales.totalCanteenSales > 0 
                        ? ((reportData.canteenSales.beverageSales / reportData.canteenSales.totalCanteenSales) * 100).toFixed(1) 
                        : '0.0'}%
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Tobacco Products</TableCell>
                    <TableCell>
                      <CurrencyDisplay amount={reportData.canteenSales.tobaccoSales} />
                    </TableCell>
                    <TableCell>
                      {reportData.canteenSales.totalCanteenSales > 0 
                        ? ((reportData.canteenSales.tobaccoSales / reportData.canteenSales.totalCanteenSales) * 100).toFixed(1) 
                        : '0.0'}%
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-semibold">Total Canteen</TableCell>
                    <TableCell className="font-semibold">
                      <CurrencyDisplay amount={reportData.canteenSales.totalCanteenSales} />
                    </TableCell>
                    <TableCell>100.0%</TableCell>
                  </TableRow>
                </>
              ) : (
                <TableRow>
                  <TableCell colSpan={3} className="text-center py-8 text-gray-400">
                    No canteen sales found in the selected date range
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        
        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <h3 className="font-semibold text-base mb-2">Revenue Distribution</h3>
            <div className="bg-gray-900 rounded-lg p-4 h-48 flex items-center justify-center">
              {reportData.businessHealth.totalRevenue > 0 ? (
                <div className="w-full">
                  <div className="w-full bg-gray-800 rounded-full h-6 overflow-hidden">
                    <div 
                      className="bg-blue-600 h-full" 
                      style={{ 
                        width: `${(reportData.gameSales.totalGameSales / reportData.businessHealth.totalRevenue) * 100}%` 
                      }}
                    ></div>
                  </div>
                  <div className="flex justify-between mt-3">
                    <div className="space-y-1">
                      <div className="flex items-center">
                        <div className="w-3 h-3 rounded-full bg-blue-600 mr-2"></div>
                        <span className="text-sm">Gaming Revenue</span>
                      </div>
                      <p className="font-medium">
                        <CurrencyDisplay amount={reportData.gameSales.totalGameSales} /> 
                        ({((reportData.gameSales.totalGameSales / reportData.businessHealth.totalRevenue) * 100).toFixed(1)}%)
                      </p>
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center">
                        <div className="w-3 h-3 rounded-full bg-gray-600 mr-2"></div>
                        <span className="text-sm">Canteen Revenue</span>
                      </div>
                      <p className="font-medium">
                        <CurrencyDisplay amount={reportData.canteenSales.totalCanteenSales} />
                        ({((reportData.canteenSales.totalCanteenSales / reportData.businessHealth.totalRevenue) * 100).toFixed(1)}%)
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-gray-500">No revenue data available</p>
              )}
            </div>
          </div>
          
          <div>
            <h3 className="font-semibold text-base mb-2">Customer Insights</h3>
            <div className="bg-gray-900 rounded-lg p-4 space-y-3">
              <div className="flex justify-between items-center border-b border-gray-800 pb-3">
                <span className="text-gray-400">Active Customers</span>
                <span className="font-semibold">{reportData.customerInsights.activeCustomerCount}</span>
              </div>
              
              <div className="flex justify-between items-center border-b border-gray-800 pb-3">
                <span className="text-gray-400">Loyalty Redemption Rate</span>
                <span className="font-semibold">{reportData.customerInsights.loyaltyRedemptionRate.toFixed(1)}%</span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Avg Revenue per Customer</span>
                <span className="font-semibold">
                  <CurrencyDisplay 
                    amount={reportData.customerInsights.activeCustomerCount > 0 ? 
                      reportData.businessHealth.totalRevenue / reportData.customerInsights.activeCustomerCount : 0
                    } 
                  />
                </span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default BusinessSummaryReport;
