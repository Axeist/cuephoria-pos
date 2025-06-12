import React, { useState, useMemo } from 'react';
import { format, isAfter, isBefore, startOfDay, endOfDay } from 'date-fns';
import { usePOS } from '@/context/POSContext';
import { Bill, Customer, Product } from '@/types/pos.types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Download, FileText, TrendingUp, Users, Package, DollarSign } from 'lucide-react';
import { cn } from '@/lib/utils';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { useToast } from '@/hooks/use-toast';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import ExpandableBillRow from '@/components/reports/ExpandableBillRow';
import SalesWidgets from '@/components/reports/SalesWidgets';
import { MobileLayout } from '@/components/mobile/MobileLayout';

const Reports = () => {
  const { bills, customers, products, sessions } = usePOS();
  const { toast } = useToast();
  const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: undefined,
    to: undefined,
  });
  const [selectedCustomer, setSelectedCustomer] = useState<string>('all');
  const [selectedProduct, setSelectedProduct] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [currentTab, setCurrentTab] = useState('bills');

  // Filter bills based on selected criteria
  const filteredBills = useMemo(() => {
    return bills.filter(bill => {
      const billDate = new Date(bill.createdAt);
      const dateInRange = (!dateRange.from || isAfter(billDate, startOfDay(dateRange.from))) &&
                         (!dateRange.to || isBefore(billDate, endOfDay(dateRange.to)));
      
      const customerMatch = selectedCustomer === 'all' || bill.customerId === selectedCustomer;
      
      const productMatch = selectedProduct === 'all' || 
        bill.items.some(item => item.productId === selectedProduct);
      
      const categoryMatch = selectedCategory === 'all' || 
        bill.items.some(item => {
          const product = products.find(p => p.id === item.productId);
          return product?.category === selectedCategory;
        });
      
      return dateInRange && customerMatch && productMatch && categoryMatch;
    });
  }, [bills, dateRange, selectedCustomer, selectedProduct, selectedCategory, products]);

  // Calculate summary statistics
  const summaryStats = useMemo(() => {
    const totalRevenue = filteredBills.reduce((sum, bill) => sum + bill.total, 0);
    const totalTransactions = filteredBills.length;
    const averageTransactionValue = totalTransactions > 0 ? totalRevenue / totalTransactions : 0;
    
    const uniqueCustomers = new Set(filteredBills.map(bill => bill.customerId)).size;
    
    const revenueByCategory = products.reduce((acc, product) => {
      acc[product.category] = 0;
      return acc;
    }, {} as Record<string, number>);
    
    filteredBills.forEach(bill => {
      bill.items.forEach(item => {
        const product = products.find(p => p.id === item.productId);
        if (product) {
          revenueByCategory[product.category] += item.price * item.quantity;
        }
      });
    });
    
    return {
      totalRevenue,
      totalTransactions,
      averageTransactionValue,
      uniqueCustomers,
      revenueByCategory
    };
  }, [filteredBills, products]);

  // Generate chart data
  const chartData = useMemo(() => {
    const dailyRevenue = filteredBills.reduce((acc, bill) => {
      const date = format(new Date(bill.createdAt), 'MMM dd');
      acc[date] = (acc[date] || 0) + bill.total;
      return acc;
    }, {} as Record<string, number>);
    
    return Object.entries(dailyRevenue).map(([date, revenue]) => ({
      date,
      revenue
    }));
  }, [filteredBills]);

  const categoryChartData = Object.entries(summaryStats.revenueByCategory)
    .filter(([, revenue]) => revenue > 0)
    .map(([category, revenue]) => ({
      name: category.charAt(0).toUpperCase() + category.slice(1),
      value: revenue
    }));

  const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#a4de6c'];

  // Get unique categories for filter
  const categories = [...new Set(products.map(p => p.category))];

  // Export functions
  const exportBillsToExcel = () => {
    if (filteredBills.length === 0) {
      toast({
        title: 'No Data',
        description: 'No bills to export based on current filters.',
        variant: 'destructive'
      });
      return;
    }

    const exportData = filteredBills.map(bill => {
      const customer = customers.find(c => c.id === bill.customerId);
      return {
        'Bill ID': bill.id,
        'Date': format(new Date(bill.createdAt), 'yyyy-MM-dd HH:mm'),
        'Customer': customer ? customer.name : 'Unknown',
        'Items': bill.items.map(item => {
          const product = products.find(p => p.id === item.productId);
          return `${product?.name || 'Unknown'} (${item.quantity})`;
        }).join(', '),
        'Subtotal': bill.subtotal,
        'Tax': bill.tax,
        'Discount': bill.discount || 0,
        'Total': bill.total,
        'Payment Method': bill.paymentMethod,
        'Status': bill.status
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Bills Report');

    const fileName = `bills-report-${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, fileName);

    toast({
      title: 'Export Successful',
      description: `Exported ${filteredBills.length} bills to ${fileName}`,
    });
  };

  const exportCustomersToExcel = () => {
    if (customers.length === 0) {
      toast({
        title: 'No Data',
        description: 'No customers to export.',
        variant: 'destructive'
      });
      return;
    }

    const exportData = customers.map(customer => {
      const customerBills = bills.filter(bill => bill.customerId === customer.id);
      const totalSpent = customerBills.reduce((sum, bill) => sum + bill.total, 0);
      const lastVisit = customerBills.length > 0 
        ? format(new Date(Math.max(...customerBills.map(bill => new Date(bill.createdAt).getTime()))), 'yyyy-MM-dd')
        : 'Never';

      return {
        'Customer ID': customer.id,
        'Name': customer.name,
        'Email': customer.email || '',
        'Phone': customer.phone || '',
        'Membership Type': customer.membershipType || 'None',
        'Created Date': format(new Date(customer.createdAt), 'yyyy-MM-dd'),
        'Total Spent': totalSpent,
        'Total Bills': customerBills.length,
        'Last Visit': lastVisit
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Customers Report');

    const fileName = `customers-report-${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, fileName);

    toast({
      title: 'Export Successful',
      description: `Exported ${customers.length} customers to ${fileName}`,
    });
  };

  const exportSessionsToExcel = () => {
    if (sessions.length === 0) {
      toast({
        title: 'No Data',
        description: 'No sessions to export.',
        variant: 'destructive'
      });
      return;
    }

    const exportData = sessions.map(session => {
      const customer = customers.find(c => c.id === session.customerId);
      return {
        'Session ID': session.id,
        'Station ID': session.stationId,
        'Customer': customer ? customer.name : 'Unknown',
        'Start Time': format(new Date(session.startTime), 'yyyy-MM-dd HH:mm:ss'),
        'End Time': session.endTime ? format(new Date(session.endTime), 'yyyy-MM-dd HH:mm:ss') : 'Ongoing',
        'Duration (minutes)': session.duration || 0,
        'Status': session.endTime ? 'Completed' : 'Active'
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Sessions Report');

    const fileName = `sessions-report-${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, fileName);

    toast({
      title: 'Export Successful',
      description: `Exported ${sessions.length} sessions to ${fileName}`,
    });
  };

  const clearFilters = () => {
    setDateRange({ from: undefined, to: undefined });
    setSelectedCustomer('all');
    setSelectedProduct('all');
    setSelectedCategory('all');
  };

  const headerActions = (
    <div className="flex flex-wrap gap-2">
      <Button 
        onClick={() => {
          switch(currentTab) {
            case 'bills':
              exportBillsToExcel();
              break;
            case 'customers':
              exportCustomersToExcel();
              break;
            case 'sessions':
              exportSessionsToExcel();
              break;
          }
        }}
        variant="outline" 
        size="sm"
      >
        <Download className="h-4 w-4 mr-2" />
        Export
      </Button>
    </div>
  );

  return (
    <MobileLayout title="Reports" headerActions={headerActions}>
      <div className="space-y-6">
        {/* Sales Summary Widgets */}
        <SalesWidgets />

        {/* Filters Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Filters & Analytics
            </CardTitle>
            <CardDescription>
              Filter data by date range, customer, product, or category
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Date Range Filter */}
              <div className="space-y-2">
                <Label>Date Range</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      id="date"
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !dateRange.from && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateRange.from ? (
                        dateRange.to ? (
                          <>
                            {format(dateRange.from, "LLL dd, y")} -{" "}
                            {format(dateRange.to, "LLL dd, y")}
                          </>
                        ) : (
                          format(dateRange.from, "LLL dd, y")
                        )
                      ) : (
                        <span>Pick a date range</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      initialFocus
                      mode="range"
                      defaultMonth={dateRange.from}
                      selected={dateRange}
                      onSelect={setDateRange}
                      numberOfMonths={2}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Customer Filter */}
              <div className="space-y-2">
                <Label>Customer</Label>
                <Select value={selectedCustomer} onValueChange={setSelectedCustomer}>
                  <SelectTrigger>
                    <SelectValue placeholder="All customers" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Customers</SelectItem>
                    {customers.map(customer => (
                      <SelectItem key={customer.id} value={customer.id}>
                        {customer.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Product Filter */}
              <div className="space-y-2">
                <Label>Product</Label>
                <Select value={selectedProduct} onValueChange={setSelectedProduct}>
                  <SelectTrigger>
                    <SelectValue placeholder="All products" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Products</SelectItem>
                    {products.map(product => (
                      <SelectItem key={product.id} value={product.id}>
                        {product.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Category Filter */}
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="All categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {categories.map(category => (
                      <SelectItem key={category} value={category}>
                        {category.charAt(0).toUpperCase() + category.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex justify-between items-center">
              <Button variant="outline" onClick={clearFilters} size="sm">
                Clear Filters
              </Button>
              <div className="text-sm text-muted-foreground">
                Showing {filteredBills.length} of {bills.length} transactions
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Summary Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${summaryStats.totalRevenue.toFixed(2)}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Transactions</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summaryStats.totalTransactions}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Transaction</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${summaryStats.averageTransactionValue.toFixed(2)}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Unique Customers</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summaryStats.uniqueCustomers}</div>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Revenue Trend</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip formatter={(value) => [`$${Number(value).toFixed(2)}`, 'Revenue']} />
                  <Line type="monotone" dataKey="revenue" stroke="#8884d8" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Revenue by Category</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={categoryChartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {categoryChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [`$${Number(value).toFixed(2)}`, 'Revenue']} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Data Tables */}
        <Tabs value={currentTab} onValueChange={setCurrentTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="bills">Bills</TabsTrigger>
            <TabsTrigger value="customers">Customers</TabsTrigger>
            <TabsTrigger value="sessions">Sessions</TabsTrigger>
            <TabsTrigger value="summary">Summary</TabsTrigger>
          </TabsList>

          <TabsContent value="bills" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Bills Report
                  <Badge variant="secondary">{filteredBills.length} records</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {filteredBills.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No bills found matching the current filters.
                    </div>
                  ) : (
                    filteredBills.map((bill) => (
                      <ExpandableBillRow key={bill.id} bill={bill} customers={customers} products={products} />
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="customers" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Customers Report
                  <Badge variant="secondary">{customers.length} customers</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2">Name</th>
                        <th className="text-left p-2">Email</th>
                        <th className="text-left p-2">Phone</th>
                        <th className="text-left p-2">Membership</th>
                        <th className="text-left p-2">Total Spent</th>
                        <th className="text-left p-2">Total Bills</th>
                      </tr>
                    </thead>
                    <tbody>
                      {customers.map(customer => {
                        const customerBills = bills.filter(bill => bill.customerId === customer.id);
                        const totalSpent = customerBills.reduce((sum, bill) => sum + bill.total, 0);
                        return (
                          <tr key={customer.id} className="border-b hover:bg-muted/50">
                            <td className="p-2 font-medium">{customer.name}</td>
                            <td className="p-2">{customer.email || '-'}</td>
                            <td className="p-2">{customer.phone || '-'}</td>
                            <td className="p-2">
                              <Badge variant="outline">
                                {customer.membershipType || 'None'}
                              </Badge>
                            </td>
                            <td className="p-2">${totalSpent.toFixed(2)}</td>
                            <td className="p-2">{customerBills.length}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="sessions" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Sessions Report
                  <Badge variant="secondary">{sessions.length} sessions</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2">Station</th>
                        <th className="text-left p-2">Customer</th>
                        <th className="text-left p-2">Start Time</th>
                        <th className="text-left p-2">End Time</th>
                        <th className="text-left p-2">Duration</th>
                        <th className="text-left p-2">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sessions.map(session => {
                        const customer = customers.find(c => c.id === session.customerId);
                        return (
                          <tr key={session.id} className="border-b hover:bg-muted/50">
                            <td className="p-2 font-medium">{session.stationId}</td>
                            <td className="p-2">{customer?.name || 'Unknown'}</td>
                            <td className="p-2">{format(new Date(session.startTime), 'MMM dd, HH:mm')}</td>
                            <td className="p-2">
                              {session.endTime ? format(new Date(session.endTime), 'MMM dd, HH:mm') : '-'}
                            </td>
                            <td className="p-2">{session.duration || 0} min</td>
                            <td className="p-2">
                              <Badge variant={session.endTime ? "secondary" : "default"}>
                                {session.endTime ? 'Completed' : 'Active'}
                              </Badge>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="summary" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Business Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-semibold mb-3">Revenue by Category</h4>
                    <div className="space-y-2">
                      {Object.entries(summaryStats.revenueByCategory)
                        .filter(([, revenue]) => revenue > 0)
                        .sort(([, a], [, b]) => b - a)
                        .map(([category, revenue]) => (
                          <div key={category} className="flex justify-between items-center p-2 bg-muted rounded">
                            <span className="capitalize">{category}</span>
                            <span className="font-medium">${revenue.toFixed(2)}</span>
                          </div>
                        ))
                      }
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-semibold mb-3">Key Metrics</h4>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span>Total Transactions:</span>
                        <span className="font-medium">{summaryStats.totalTransactions}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Total Revenue:</span>
                        <span className="font-medium">${summaryStats.totalRevenue.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Average Transaction:</span>
                        <span className="font-medium">${summaryStats.averageTransactionValue.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Unique Customers:</span>
                        <span className="font-medium">{summaryStats.uniqueCustomers}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MobileLayout>
  );
};

export default Reports;
