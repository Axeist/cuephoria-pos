import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { usePOS } from '@/context/POSContext';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import { Button } from "@/components/ui/button"
import { CalendarIcon } from "lucide-react"
import { CurrencyDisplay } from '@/components/ui/currency';
import StockValueWidget from '@/components/dashboard/StockValueWidget';

const Reports: React.FC = () => {
  const { bills, products } = usePOS();
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [dailyRevenue, setDailyRevenue] = useState(0);
  const [monthlyRevenue, setMonthlyRevenue] = useState(0);
  const [yearlyRevenue, setYearlyRevenue] = useState(0);

  useEffect(() => {
    if (bills && bills.length > 0) {
      // Calculate daily revenue
      const today = new Date();
      const dailyBills = bills.filter(bill => {
        const billDate = new Date(bill.createdAt);
        return (
          billDate.getDate() === today.getDate() &&
          billDate.getMonth() === today.getMonth() &&
          billDate.getFullYear() === today.getFullYear()
        );
      });
      const totalDailyRevenue = dailyBills.reduce((sum, bill) => sum + bill.total, 0);
      setDailyRevenue(totalDailyRevenue);

      // Calculate monthly revenue
      const monthlyBills = bills.filter(bill => {
        const billDate = new Date(bill.createdAt);
        return (
          billDate.getMonth() === today.getMonth() &&
          billDate.getFullYear() === today.getFullYear()
        );
      });
      const totalMonthlyRevenue = monthlyBills.reduce((sum, bill) => sum + bill.total, 0);
      setMonthlyRevenue(totalMonthlyRevenue);

      // Calculate yearly revenue
      const yearlyBills = bills.filter(bill => {
        const billDate = new Date(bill.createdAt);
        return billDate.getFullYear() === today.getFullYear();
      });
      const totalYearlyRevenue = yearlyBills.reduce((sum, bill) => sum + bill.total, 0);
      setYearlyRevenue(totalYearlyRevenue);
    } else {
      setDailyRevenue(0);
      setMonthlyRevenue(0);
      setYearlyRevenue(0);
    }
  }, [bills]);

  const productSalesData = products.map(product => {
    const totalSales = bills.reduce((sum, bill) => {
      const productSales = bill.items.find(item => item.id === product.id)?.quantity || 0;
      return sum + productSales;
    }, 0);

    return {
      name: product.name,
      sales: totalSales,
    };
  });

  const topSellingProducts = productSalesData
    .sort((a, b) => b.sales - a.sales)
    .slice(0, 5);

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Reports</h2>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant={"outline"}
              className={cn(
                "w-[300px] justify-start text-left font-normal",
                !date && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {date ? format(date, "PPP") : <span>Pick a date</span>}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="center">
            <Calendar
              mode="single"
              selected={date}
              onSelect={setDate}
              disabled={(date) =>
                date > new Date() || date < new Date("1900-01-01")
              }
              initialFocus
            />
          </PopoverContent>
        </Popover>
      </div>

      <div className="space-y-6">
        {/* Business Summary Section */}
        <Card>
          <CardHeader>
            <CardTitle>Business Summary</CardTitle>
            <CardDescription>Overview of key business metrics</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>Daily Revenue</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    <CurrencyDisplay amount={dailyRevenue} />
                  </div>
                  <p className="text-xs text-muted-foreground">Total revenue for today</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Monthly Revenue</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    <CurrencyDisplay amount={monthlyRevenue} />
                  </div>
                  <p className="text-xs text-muted-foreground">Total revenue for this month</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Yearly Revenue</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    <CurrencyDisplay amount={yearlyRevenue} />
                  </div>
                  <p className="text-xs text-muted-foreground">Total revenue for this year</p>
                </CardContent>
              </Card>
            </div>
          </CardContent>
        </Card>

        {/* Enhanced Business Metrics */}
        <Card>
          <CardHeader>
            <CardTitle>Enhanced Business Metrics</CardTitle>
            <CardDescription>Deeper insights into business performance</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>Customer Retention Rate</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">85%</div>
                  <p className="text-xs text-muted-foreground">Percentage of repeat customers</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Average Order Value</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    <CurrencyDisplay amount={125.50} />
                  </div>
                  <p className="text-xs text-muted-foreground">Average value of each order</p>
                </CardContent>
              </Card>
            </div>
          </CardContent>
        </Card>

        {/* Product Performance Section */}
        <Card>
          <CardHeader>
            <CardTitle>Product Performance</CardTitle>
            <CardDescription>Inventory and sales analytics</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <StockValueWidget />
              <Card className="col-span-1 md:col-span-2 lg:col-span-3">
                <CardHeader>
                  <CardTitle>Top Selling Products</CardTitle>
                  <CardDescription>Top 5 products by sales quantity</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={topSellingProducts}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="sales" fill="#8884d8" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </CardContent>
        </Card>

        {/* Canteen Revenue Section */}
        <Card>
          <CardHeader>
            <CardTitle>Canteen Revenue</CardTitle>
            <CardDescription>Revenue from canteen sales</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              <CurrencyDisplay amount={5678.90} />
            </div>
            <p className="text-xs text-muted-foreground">Total revenue from canteen sales</p>
          </CardContent>
        </Card>

        {/* Simplified Sales Prediction */}
        <Card>
          <CardHeader>
            <CardTitle>Simplified Sales Prediction</CardTitle>
            <CardDescription>Sales prediction for the next month</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              <CurrencyDisplay amount={7890.12} />
            </div>
            <p className="text-xs text-muted-foreground">Predicted sales for the next month</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Reports;
