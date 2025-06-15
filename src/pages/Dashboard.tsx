
import React, { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { generateId } from "@/utils/pos.utils";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { format } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import HowToUsePopup from "@/components/HowToUsePopup";
import { useHowToUsePopup } from "@/hooks/useHowToUsePopup";

interface RecentActivity {
  id: string;
  timestamp: string;
  type: string;
  description: string;
}

const Dashboard = () => {
  const { user } = useAuth();
  const { shouldShow, loading, dismiss } = useHowToUsePopup();
  const [popupOpen, setPopupOpen] = useState(false);
  const { toast } = useToast();

  // Fetch total sales (from bills)
  const { data: totalSales, isLoading: isTotalSalesLoading, error: totalSalesError } = useQuery({
    queryKey: ['totalSales'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bills')
        .select('total');
      if (error) {
        console.error("Error fetching total sales:", error);
        throw error;
      }
      return data ? data.reduce((acc, bill) => acc + Number(bill.total), 0) : 0;
    },
  });

  // Fetch total expenses
  const { data: totalExpenses, isLoading: isTotalExpensesLoading, error: totalExpensesError } = useQuery({
    queryKey: ['totalExpenses'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('expenses')
        .select('amount');
      if (error) {
        console.error("Error fetching total expenses:", error);
        throw error;
      }
      return data ? data.reduce((acc, expense) => acc + Number(expense.amount), 0) : 0;
    },
  });

  // Fetch recent activity (using bills as a stand-in for demo, as activity_log table does not exist)
  const { data: recentActivity, isLoading: isRecentActivityLoading, error: recentActivityError } = useQuery({
    queryKey: ['recentActivity'],
    queryFn: async () => {
      // As there is no activity_log table, let's show latest 5 bills as activity
      const { data, error } = await supabase
        .from('bills')
        .select('id, created_at, total, payment_method')
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) {
        console.error("Error fetching recent activity:", error);
        throw error;
      }

      return data
        ? data.map((bill: any) => ({
            id: bill.id,
            timestamp: bill.created_at,
            type: "Bill Created",
            description: `Total: $${bill.total} • Method: ${bill.payment_method ?? "unknown"}`
          }))
        : [];
    },
  });

  // Fetch low stock products
  const { data: lowStockProducts, isLoading: isLowStockProductsLoading, error: lowStockProductsError } = useQuery({
    queryKey: ['lowStockProducts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('id, name, stock')
        .lt('stock', 10);
      if (error) {
        console.error("Error fetching low stock products:", error);
        throw error;
      }
      return data || [];
    },
  });

  // Fetch sales data for the last 7 days (from bills)
  const { data: salesData, isLoading: isSalesDataLoading, error: salesDataError } = useQuery({
    queryKey: ['salesData'],
    queryFn: async () => {
      const today = new Date();
      const lastWeek = new Date(today);
      lastWeek.setDate(today.getDate() - 7);

      const { data, error } = await supabase
        .from('bills')
        .select('total, created_at')
        .gte('created_at', lastWeek.toISOString())
        .lte('created_at', today.toISOString());

      if (error) {
        console.error("Error fetching sales data:", error);
        throw error;
      }

      // Aggregate sales by date
      const aggregatedSales = (data || []).reduce((acc: { [key: string]: number }, bill: any) => {
        const saleDate = format(new Date(bill.created_at), 'yyyy-MM-dd');
        acc[saleDate] = (acc[saleDate] || 0) + Number(bill.total);
        return acc;
      }, {});

      // Convert aggregated data to array format for Recharts
      const chartData = Object.entries(aggregatedSales).map(([date, amount]) => ({
        date,
        amount,
      }));

      return chartData;
    },
  });

  useEffect(() => {
    if (!loading && shouldShow) {
      setPopupOpen(true);
    }
  }, [shouldShow, loading]);

  useEffect(() => {
    if (totalSalesError || totalExpensesError || recentActivityError || lowStockProductsError || salesDataError) {
      toast({
        title: "Error",
        description: "Failed to load dashboard data. Please try again.",
        variant: "destructive"
      });
    }
  }, [totalSalesError, totalExpensesError, recentActivityError, lowStockProductsError, salesDataError, toast]);

  return (
    <div className="container p-4 mx-auto max-w-7xl">
      {/* HowToUse Popup for staff */}
      <HowToUsePopup
        open={popupOpen}
        onClose={() => setPopupOpen(false)}
        onDismiss={() => {
          dismiss();
          setPopupOpen(false);
        }}
      />
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Here&apos;s an overview of your business
        </p>
      </div>

      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle>Total Sales</CardTitle>
            <CardDescription>All sales recorded</CardDescription>
          </CardHeader>
          <CardContent>
            {isTotalSalesLoading ? (
              <Skeleton className="h-10 w-32" />
            ) : (
              <div className="text-2xl font-bold">${totalSales?.toFixed(2) || 0}</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Total Expenses</CardTitle>
            <CardDescription>All expenses recorded</CardDescription>
          </CardHeader>
          <CardContent>
            {isTotalExpensesLoading ? (
              <Skeleton className="h-10 w-32" />
            ) : (
              <div className="text-2xl font-bold">${totalExpenses?.toFixed(2) || 0}</div>
            )}
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Sales Chart (Last 7 Days)</CardTitle>
            <CardDescription>Overview of sales trends</CardDescription>
          </CardHeader>
          <CardContent>
            {isSalesDataLoading ? (
              <Skeleton className="h-40 w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={salesData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="amount" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 grid-cols-1 lg:grid-cols-2 mt-4">
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest actions performed</CardDescription>
          </CardHeader>
          <CardContent className="h-[400px]">
            {isRecentActivityLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-4 w-[80%]" />
                <Skeleton className="h-4 w-[50%]" />
                <Skeleton className="h-4 w-[90%]" />
                <Skeleton className="h-4 w-[60%]" />
                <Skeleton className="h-4 w-[75%]" />
              </div>
            ) : (
              <ScrollArea className="rounded-md border">
                <div className="p-4">
                  {recentActivity?.map((activity: RecentActivity) => (
                    <div key={activity.id} className="mb-4 last:mb-0">
                      <div className="text-sm font-medium">{activity.type}</div>
                      <div className="text-xs text-muted-foreground">{activity.description}</div>
                      <div className="text-xs text-muted-foreground">{new Date(activity.timestamp).toLocaleString()}</div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Low Stock Products</CardTitle>
            <CardDescription>Products with stock less than 10</CardDescription>
          </CardHeader>
          <CardContent className="h-[400px]">
            {isLowStockProductsLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-4 w-[80%]" />
                <Skeleton className="h-4 w-[50%]" />
                <Skeleton className="h-4 w-[90%]" />
                <Skeleton className="h-4 w-[60%]" />
                <Skeleton className="h-4 w-[75%]" />
              </div>
            ) : (
              <ScrollArea className="rounded-md border">
                <div className="p-4">
                  {lowStockProducts?.map((product: any) => (
                    <div key={product.id} className="mb-2 last:mb-0 flex items-center justify-between">
                      <div>
                        <div className="text-sm font-medium">{product.name}</div>
                        <div className="text-xs text-muted-foreground">Stock: {product.stock}</div>
                      </div>
                      <Badge variant="secondary">Low Stock</Badge>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
