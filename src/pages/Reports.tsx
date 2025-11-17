import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useExpenses } from '@/context/ExpenseContext';
import { usePOS } from '@/context/POSContext';
import { Calendar } from '@/components/ui/calendar';
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subMonths, startOfYear, endOfYear, subDays } from 'date-fns';
import { DateRange } from 'react-day-picker';
import { CurrencyDisplay } from '@/components/ui/currency';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { CalendarIcon, Download, Search, Trash2, ArrowUpDown, ArrowUp, ArrowDown, Gift } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import BusinessSummaryReport from '@/components/dashboard/BusinessSummaryReport';
import { useSessionsData } from '@/hooks/stations/useSessionsData';
import ExpandableBillRow from '@/components/reports/ExpandableBillRow';
import SalesWidgets from '@/components/reports/SalesWidgets';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';

// Add types for sorting
type SortField = 'date' | 'total' | 'customer' | 'subtotal' | 'discount';
type SortDirection = 'asc' | 'desc' | null;

const ReportsPage: React.FC = () => {
  const {
    expenses,
    businessSummary
  } = useExpenses();
  const {
    customers,
    bills,
    products,
    exportBills,
    exportCustomers,
    stations,
    deleteBill
  } = usePOS();
  const {
    sessions,
    sessionsLoading,
    deleteSession
  } = useSessionsData();
  
  const { toast } = useToast();
  const isMobile = useIsMobile();

  // Set default range to "this month"
  const today = new Date();
  const [date, setDate] = useState<DateRange | undefined>({
    from: startOfMonth(today),
    to: endOfMonth(today)
  });
  const [dateRangeKey, setDateRangeKey] = useState<string>('thisMonth');
  const [activeTab, setActiveTab] = useState<'bills' | 'customers' | 'sessions' | 'summary'>('bills');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [billSearchQuery, setBillSearchQuery] = useState<string>('');
  const [paymentTypeFilter, setPaymentTypeFilter] = useState<string>('all');

  // Add sorting state
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  // Initialize with "thisMonth" as the default date range
  useEffect(() => {
    handleDateRangeChange('thisMonth');
  }, []);

  // Memoize customer lookup functions to prevent expensive recalculations
  const customerLookup = useMemo(() => {
    const lookup: Record<string, {
      name: string;
      email: string | undefined;
      phone: string | undefined;
      playTime: string;
      totalSpent: number;
    }> = {};
    customers.forEach(customer => {
      lookup[customer.id] = {
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        playTime: '0h 0m',
        totalSpent: 0
      };
    });
    return lookup;
  }, [customers]);

  // Use customer lookup for performance
  const getCustomerName = (customerId: string) => customerLookup[customerId]?.name || 'Unknown';
  const getCustomerEmail = (customerId: string) => customerLookup[customerId]?.email || '';
  const getCustomerPhone = (customerId: string) => customerLookup[customerId]?.phone || '';

  // Enhanced filtered data to include payment type filtering with null checks
  const filteredData = useMemo(() => {
    const filterByDateRange = <T extends {
      createdAt: Date | string;
    }>(items: T[]): T[] => {
      if (!date?.from && !date?.to) return items;
      return items.filter(item => {
        const itemDate = item.createdAt instanceof Date ? item.createdAt : new Date(item.createdAt);
        if (date?.from && date?.to) {
          return itemDate >= date.from && itemDate <= date.to;
        } else if (date?.from) {
          return itemDate >= date.from;
        } else if (date?.to) {
          return itemDate <= date.to;
        }
        return true;
      });
    };

    const filteredCustomers = filterByDateRange(customers);
    let filteredBills = filterByDateRange(bills);

    // Apply bill search filtering
    if (billSearchQuery.trim()) {
      const query = billSearchQuery.toLowerCase().trim();
      filteredBills = filteredBills.filter(bill => {
        const customer = customers.find(c => c.id === bill.customerId);
        return (
          bill.id.toLowerCase().includes(query) ||
          (customer && (
            customer.name.toLowerCase().includes(query) ||
            (customer.email && customer.email.toLowerCase().includes(query)) ||
            customer.phone.includes(query)
          ))
        );
      });
    }

    // Apply payment type filtering with null checks
    if (paymentTypeFilter !== 'all') {
      filteredBills = filteredBills.filter(bill => {
        if (paymentTypeFilter === 'split') {
          return bill.splitPayment && bill.splitPayment.length > 0;
        } else {
          const paymentMethod = bill.paymentMethod || '';
          return paymentMethod.toLowerCase() === paymentTypeFilter.toLowerCase();
        }
      });
    }

    // Filter sessions
    let filteredSessions = sessions.filter(session => {
      if (!date?.from && !date?.to) return true;
      const startTime = new Date(session.startTime);
      if (date?.from && date?.to) {
        return startTime >= date.from && startTime <= date.to;
      } else if (date?.from) {
        return startTime >= date.from;
      } else if (date?.to) {
        return startTime <= date.to;
      }
      return true;
    });

    // Apply search filtering
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filteredSessions = filteredSessions.filter(session => {
        const customer = customers.find(c => c.id === session.customerId);
        if (!customer) return false;
        return (
          customer.name.toLowerCase().includes(query) ||
          (customer.email && customer.email.toLowerCase().includes(query)) ||
          customer.phone.includes(query)
        );
      });
    }

    return {
      filteredCustomers,
      filteredBills,
      filteredSessions
    };
  }, [bills, customers, sessions, date, searchQuery, billSearchQuery, paymentTypeFilter]);

  // Calculate customer play time and total spent
  const getCustomerPlayTime = useCallback((customerId: string) => {
    const customerSessions = filteredData.filteredSessions.filter(session => session.customerId === customerId);
    const totalMinutes = customerSessions.reduce((total, session) => {
      if (session.endTime) {
        const start = new Date(session.startTime).getTime();
        const end = new Date(session.endTime).getTime();
        return total + (end - start) / (1000 * 60);
      }
      return total;
    }, 0);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = Math.floor(totalMinutes % 60);
    return `${hours}h ${minutes}m`;
  }, [filteredData.filteredSessions]);

  const getCustomerTotalSpent = useCallback((customerId: string) => {
    return filteredData.filteredBills.filter(bill => bill.customerId === customerId).reduce((total, bill) => total + bill.total, 0);
  }, [filteredData.filteredBills]);

  // Sort bills based on current sort field and direction
  const sortedBills = useMemo(() => {
    if (!sortField || !sortDirection) return filteredData.filteredBills;
    return [...filteredData.filteredBills].sort((a, b) => {
      let aValue: any;
      let bValue: any;
      switch (sortField) {
        case 'date':
          aValue = new Date(a.createdAt).getTime();
          bValue = new Date(b.createdAt).getTime();
          break;
        case 'total':
          aValue = a.total;
          bValue = b.total;
          break;
        case 'subtotal':
          aValue = a.subtotal;
          bValue = b.subtotal;
          break;
        case 'discount':
          aValue = a.discountValue || 0;
          bValue = b.discountValue || 0;
          break;
        case 'customer':
          aValue = getCustomerName(a.customerId).toLowerCase();
          bValue = getCustomerName(b.customerId).toLowerCase();
          break;
        default:
          return 0;
      }
      if (sortDirection === 'asc') {
        return aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
      } else {
        return aValue < bValue ? 1 : aValue > bValue ? -1 : 0;
      }
    });
  }, [filteredData.filteredBills, sortField, sortDirection, getCustomerName]);

  // Handle sorting
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else if (sortDirection === 'desc') {
        setSortDirection(null);
        setSortField('date');
      } else {
        setSortDirection('asc');
      }
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Get sort icon for a field
  const getSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="h-4 w-4 text-gray-500" />;
    }
    if (sortDirection === 'asc') {
      return <ArrowUp className="h-4 w-4 text-blue-400" />;
    } else if (sortDirection === 'desc') {
      return <ArrowDown className="h-4 w-4 text-blue-400" />;
    } else {
      return <ArrowUpDown className="h-4 w-4 text-gray-500" />;
    }
  };

  // Handle date range selection from dropdown
  const handleDateRangeChange = useCallback((value: string) => {
    setDateRangeKey(value);
    const today = new Date();
    let from: Date | undefined;
    let to: Date | undefined = today;
    switch (value) {
      case 'today':
        from = startOfDay(today);
        to = endOfDay(today);
        break;
      case 'yesterday':
        from = startOfDay(subDays(today, 1));
        to = endOfDay(subDays(today, 1));
        break;
      case 'thisWeek':
        from = startOfWeek(today, { weekStartsOn: 1 });
        to = endOfWeek(today, { weekStartsOn: 1 });
        break;
      case 'thisMonth':
        from = startOfMonth(today);
        to = endOfMonth(today);
        break;
      case 'last3Months':
        from = startOfMonth(subMonths(today, 2));
        to = endOfMonth(today);
        break;
      case 'thisYear':
        from = startOfYear(today);
        to = endOfYear(today);
        break;
      case 'custom':
        from = date?.from;
        to = date?.to;
        break;
      default:
        from = subDays(today, 30);
        to = today;
    }
    setDate({ from, to });
  }, [date]);

  // Memoize the date range string
  const dateRangeString = useMemo(() => {
    if (date?.from && date?.to) {
      return `${format(date.from, 'dd MMM yyyy')} - ${format(date.to, 'dd MMM yyyy')}`;
    }
    return 'Select date range';
  }, [date]);

  // Export data to Excel file
  const exportToExcel = (data: any[], fileName: string) => {
    try {
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');

      const excelBuffer = XLSX.write(wb, {
        bookType: 'xlsx',
        type: 'array'
      });
      const blob = new Blob([excelBuffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8'
      });
      saveAs(blob, `${fileName}_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
    } catch (error) {
      console.error("Error exporting to Excel:", error);
    }
  };

  // Function to handle downloading reports as Excel
  const handleDownloadReport = useCallback(() => {
    console.log('Downloading report with date range:', date);
    switch (activeTab) {
      case 'bills':
        const billsData = sortedBills.map(bill => ({
          Date: format(new Date(bill.createdAt), 'yyyy-MM-dd'),
          Time: format(new Date(bill.createdAt), 'HH:mm:ss'),
          BillID: bill.id,
          Customer: getCustomerName(bill.customerId),
          ItemsCount: bill.items.length,
          Subtotal: bill.subtotal,
          DiscountValue: bill.discountValue || 0,
          PointsUsed: bill.loyaltyPointsUsed || 0,
          Total: bill.total,
          PaymentMethod: bill.paymentMethod || 'N/A',
          ComplimentaryNote: bill.paymentMethod === 'complimentary' ? (bill.compNote || 'No note') : ''
        }));
        exportToExcel(billsData, 'Bills_Report');
        break;
      case 'customers':
        const customersData = filteredData.filteredCustomers.map(customer => ({
          Name: customer.name,
          Phone: customer.phone || '',
          Email: customer.email || '',
          MemberStatus: customer.isMember ? 'Member' : 'Non-Member',
          TotalSpent: getCustomerTotalSpent(customer.id),
          PlayTime: getCustomerPlayTime(customer.id),
          LoyaltyPoints: customer.loyaltyPoints || 0,
          JoinedOn: customer.createdAt ? format(new Date(customer.createdAt), 'yyyy-MM-dd') : 'N/A'
        }));
        exportToExcel(customersData, 'Customers_Report');
        break;
      case 'sessions':
        const sessionsData = filteredData.filteredSessions.map(session => {
          const durationInMinutes = session.endTime ? Math.round((new Date(session.endTime).getTime() - new Date(session.startTime).getTime()) / (1000 * 60)) : session.duration || 0;
          return {
            Station: session.stationId,
            Customer: getCustomerName(session.customerId),
            Contact: getCustomerPhone(session.customerId),
            StartDate: format(new Date(session.startTime), 'yyyy-MM-dd'),
            StartTime: format(new Date(session.startTime), 'HH:mm:ss'),
            EndDate: session.endTime ? format(new Date(session.endTime), 'yyyy-MM-dd') : '-',
            EndTime: session.endTime ? format(new Date(session.endTime), 'HH:mm:ss') : '-',
            DurationMinutes: durationInMinutes,
            Status: session.endTime ? 'Completed' : 'Active'
          };
        });
        exportToExcel(sessionsData, 'Sessions_Report');
        break;
      case 'summary':
        const summaryData = [{
          TotalRevenue: summaryMetrics.financial.totalRevenue,
          ComplimentarySales: summaryMetrics.financial.complimentarySales,
          ComplimentaryCount: summaryMetrics.financial.complimentaryCount,
          ComplimentaryPercentage: `${summaryMetrics.financial.complimentaryPercentage.toFixed(1)}%`,
          AvgComplimentaryValue: summaryMetrics.financial.avgComplimentaryValue,
          GrossProfit: summaryMetrics.financial.grossProfit,
          ProfitMargin: `${summaryMetrics.financial.profitMargin.toFixed(1)}%`,
          TotalTransactions: summaryMetrics.operational.totalTransactions,
          ActiveSessions: summaryMetrics.operational.activeSessions,
          CompletedSessions: summaryMetrics.operational.completedSessions,
          TotalCustomers: summaryMetrics.customer.totalCustomers,
          MembershipRate: `${summaryMetrics.customer.membershipRate.toFixed(1)}%`,
          GeneratedOn: format(new Date(), 'yyyy-MM-dd HH:mm:ss')
        }];
        exportToExcel(summaryData, 'Business_Summary_Report');
        break;
      default:
        console.log(`Exporting ${activeTab} report`);
    }
  }, [activeTab, date, sortedBills]);

  // Pre-calculate summary metrics once when filtered data changes
  const summaryMetrics = useMemo(() => calculateSummaryMetrics(), [filteredData]);

  // Handle session deletion
  const handleDeleteSession = useCallback(async (sessionId: string) => {
    const success = await deleteSession(sessionId);
    if (success) {
      console.log(`Session ${sessionId} deleted successfully`);
    }
  }, [deleteSession]);

  // Handler for editing bill
  const handleEditBill = (bill: any) => {
    toast({
      title: "Edit Transaction",
      description: `Opening editor for bill ${bill.id.substring(0, 8)}...`,
    });
    console.log('Edit bill:', bill);
  };

  // Handler for deleting bill
  const handleDeleteBill = async (bill: any) => {
    try {
      const success = await deleteBill(bill.id, bill.customerId);
      
      if (success) {
        toast({
          title: "Transaction Deleted",
          description: `Bill ${bill.id.substring(0, 8)} has been deleted successfully.`,
          variant: "default",
        });
      } else {
        toast({
          title: "Delete Failed",
          description: "Unable to delete the transaction. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error deleting bill:', error);
      toast({
        title: "Error",
        description: "An error occurred while deleting the transaction.",
        variant: "destructive",
      });
    }
  };

  // Calculate business summary metrics function
  function calculateSummaryMetrics() {
    const { filteredBills } = filteredData;

    // Calculate complimentary metrics
    const complimentaryBills = filteredBills.filter(bill => 
      bill.paymentMethod?.toLowerCase() === 'complimentary'
    );
    const complimentarySales = complimentaryBills.reduce((sum, bill) => sum + bill.total, 0);
    const complimentaryCount = complimentaryBills.length;

    // Calculate paid revenue (excluding complimentary)
    const paidBills = filteredBills.filter(bill => 
      bill.paymentMethod?.toLowerCase() !== 'complimentary'
    );
    const totalRevenue = paidBills.reduce((sum, bill) => sum + bill.total, 0);
    
    // Calculate total transaction volume (including complimentary)
    const totalTransactionVolume = totalRevenue + complimentarySales;
    const complimentaryPercentage = totalTransactionVolume > 0 ? 
      (complimentarySales / totalTransactionVolume) * 100 : 0;
    
    // Average complimentary value
    const avgComplimentaryValue = complimentaryCount > 0 ? 
      complimentarySales / complimentaryCount : 0;

    const averageBillValue = paidBills.length > 0 ? totalRevenue / paidBills.length : 0;
    const totalDiscounts = filteredBills.reduce((sum, bill) => sum + (bill.discountValue || 0), 0);
    const grossProfit = totalRevenue - (businessSummary?.totalExpenses || 0);
    const profitMargin = totalRevenue > 0 ? grossProfit / totalRevenue * 100 : 0;

    const revenueByDay: Record<string, number> = {};
    let highestRevenue = 0;
    let highestRevenueDay = '';
    paidBills.forEach(bill => {
      const day = format(new Date(bill.createdAt), 'yyyy-MM-dd');
      revenueByDay[day] = (revenueByDay[day] || 0) + bill.total;
      if (revenueByDay[day] > highestRevenue) {
        highestRevenue = revenueByDay[day];
        highestRevenueDay = day;
      }
    });

    const cashSales = paidBills.filter(bill => bill.paymentMethod === 'cash').reduce((sum, bill) => sum + bill.total, 0);
    const upiSales = paidBills.filter(bill => bill.paymentMethod === 'upi').reduce((sum, bill) => sum + bill.total, 0);
    const cashPercentage = totalRevenue > 0 ? cashSales / totalRevenue * 100 : 0;
    const upiPercentage = totalRevenue > 0 ? upiSales / totalRevenue * 100 : 0;

    const totalTransactions = filteredBills.length;
    const activeSessions = sessions.filter(s => s.endTime === null).length;
    const completedSessions = filteredData.filteredSessions.filter(s => s.endTime !== null).length;

    let totalSessionDuration = 0;
    let sessionsWithDuration = 0;
    filteredData.filteredSessions.forEach(session => {
      if (session.endTime) {
        const startMs = new Date(session.startTime).getTime();
        const endMs = new Date(session.endTime).getTime();
        const durationMinutes = Math.max(1, Math.round((endMs - startMs) / (1000 * 60)));
        totalSessionDuration += durationMinutes;
        sessionsWithDuration++;
      } else if (session.duration) {
        totalSessionDuration += session.duration;
        sessionsWithDuration++;
      }
    });
    const avgSessionDuration = sessionsWithDuration > 0 ? Math.round(totalSessionDuration / sessionsWithDuration) : 0;

    const sessionsByHour: Record<number, number> = {};
    let peakHour = 0;
    let peakHourCount = 0;
    filteredData.filteredSessions.forEach(session => {
      const hour = new Date(session.startTime).getHours();
      sessionsByHour[hour] = (sessionsByHour[hour] || 0) + 1;
      if (sessionsByHour[hour] > peakHourCount) {
        peakHourCount = sessionsByHour[hour];
        peakHour = hour;
      }
    });

    const formattedPeakHour = peakHour < 12 ? `${peakHour}:00 AM` : `${peakHour === 12 ? 12 : peakHour - 12}:00 PM`;

    const restockExpenses = expenses.filter(e => e.category.toLowerCase() === 'restock').sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const daysSinceRestock = restockExpenses.length > 0 ? Math.floor((new Date().getTime() - new Date(restockExpenses[0].date).getTime()) / (1000 * 3600 * 24)) : null;

    const productFrequency: Record<string, number> = {};
    let mostPopularProductId = '';
    let maxFrequency = 0;
    filteredBills.forEach(bill => {
      bill.items.forEach(item => {
        if (item.type === 'product') {
          const newFreq = (productFrequency[item.id] || 0) + item.quantity;
          productFrequency[item.id] = newFreq;
          if (newFreq > maxFrequency) {
            mostPopularProductId = item.id;
            maxFrequency = newFreq;
          }
        }
      });
    });
    const mostPopularProduct = products.find(p => p.id === mostPopularProductId)?.name || 'None';

    const totalUnitsSold = filteredBills.reduce((sum, bill) => {
      return sum + bill.items.reduce((itemSum, item) => {
        return item.type === 'product' ? itemSum + item.quantity : itemSum;
      }, 0);
    }, 0);

    let ps5Sales = 0;
    let poolSales = 0;
    let metashotSales = 0;
    paidBills.forEach(bill => {
      const discountRatio = bill.total / bill.subtotal;
      bill.items.forEach(item => {
        const discountedItemTotal = item.total * discountRatio;
        if (item.type === 'session') {
          const itemName = item.name.toLowerCase();
          if (itemName.includes('ps5') || itemName.includes('playstation')) {
            ps5Sales += discountedItemTotal;
          } else if (itemName.includes('pool') || itemName.includes('8-ball') || itemName.includes('8 ball')) {
            poolSales += discountedItemTotal;
          }
        } else if (item.type === 'product') {
          const product = products.find(p => p.id === item.id);
          if (product) {
            const category = product.category.toLowerCase();
            const name = product.name.toLowerCase();
            if (name.includes('metashot') || name.includes('meta shot') || category === 'challenges' || category === 'challenge') {
              metashotSales += discountedItemTotal;
            }
          }
        }
      });
    });

    const ps5Sessions = filteredData.filteredSessions.filter(s => {
      if (!stations) return false;
      const station = stations.find(st => st.id === s.stationId);
      return station?.type?.toLowerCase()?.includes('ps5') || station?.name?.toLowerCase()?.includes('ps5') || station?.name?.toLowerCase()?.includes('playstation');
    });
    const ps5UsageRate = ps5Sessions.length > 0 ? Math.round(ps5Sessions.filter(s => s.endTime).length / ps5Sessions.length * 100) : 0;

    const totalCustomers = filteredData.filteredCustomers.length;
    const memberCount = filteredData.filteredCustomers.filter(c => c.isMember).length;
    const nonMemberCount = filteredData.filteredCustomers.filter(c => !c.isMember).length;
    const membershipRate = totalCustomers > 0 ? memberCount / totalCustomers * 100 : 0;

    const avgSpendPerCustomer = totalCustomers > 0 ? totalRevenue / totalCustomers : 0;

    const customerSpending: Record<string, number> = {};
    let topCustomerId = '';
    let topCustomerSpend = 0;
    paidBills.forEach(bill => {
      if (bill.customerId) {
        customerSpending[bill.customerId] = (customerSpending[bill.customerId] || 0) + bill.total;
        if (customerSpending[bill.customerId] > topCustomerSpend) {
          topCustomerId = bill.customerId;
          topCustomerSpend = customerSpending[bill.customerId];
        }
      }
    });
    const topCustomer = customers.find(c => c.id === topCustomerId)?.name || 'None';

    const customersWithMultipleBills: Record<string, boolean> = {};
    const customerBillCounts: Record<string, number> = {};
    filteredBills.forEach(bill => {
      if (bill.customerId) {
        customerBillCounts[bill.customerId] = (customerBillCounts[bill.customerId] || 0) + 1;
        if (customerBillCounts[bill.customerId] > 1) {
          customersWithMultipleBills[bill.customerId] = true;
        }
      }
    });
    const returningCustomers = Object.keys(customersWithMultipleBills).length;
    const retentionRate = totalCustomers > 0 ? returningCustomers / totalCustomers * 100 : 0;

    const loyaltyPointsUsed = filteredBills.reduce((sum, bill) => sum + (bill.loyaltyPointsUsed || 0), 0);
    const loyaltyPointsEarned = filteredBills.reduce((sum, bill) => sum + (bill.loyaltyPointsEarned || 0), 0);
    const loyaltyUsageRate = loyaltyPointsEarned > 0 ? loyaltyPointsUsed / loyaltyPointsEarned * 100 : 0;
    const loyaltyPointsPerRupee = totalRevenue > 0 ? loyaltyPointsEarned / totalRevenue : 0;
    
    return {
      financial: {
        totalRevenue,
        averageBillValue,
        totalDiscounts,
        cashSales,
        upiSales,
        complimentarySales,
        complimentaryCount,
        complimentaryPercentage,
        avgComplimentaryValue,
        cashPercentage,
        upiPercentage,
        grossProfit,
        profitMargin,
        highestRevenueDay: highestRevenueDay ? format(new Date(highestRevenueDay), 'dd MMM yyyy') : 'None',
        highestRevenue
      },
      operational: {
        totalTransactions,
        activeSessions,
        completedSessions,
        avgSessionDuration,
        peakHour: formattedPeakHour,
        peakHourCount,
        mostPopularProduct,
        daysSinceRestock,
        totalUnitsSold,
        ps5UsageRate
      },
      customer: {
        totalCustomers,
        memberCount,
        nonMemberCount,
        membershipRate,
        avgSpendPerCustomer,
        topCustomer,
        topCustomerSpend,
        returningCustomers,
        retentionRate,
        loyaltyPointsUsed,
        loyaltyPointsEarned,
        loyaltyUsageRate,
        loyaltyPointsPerRupee
      },
      gaming: {
        ps5Sales,
        poolSales,
        metashotSales,
        totalGamingSales: ps5Sales + poolSales + metashotSales
      }
    };
  }

  // Pagination
  const itemsPerPage = 50;
  const [currentPage, setCurrentPage] = useState(1);

  const paginatedData = useMemo(() => {
    const startIdx = (currentPage - 1) * itemsPerPage;
    const endIdx = startIdx + itemsPerPage;
    return {
      bills: sortedBills.slice(startIdx, endIdx),
      customers: filteredData.filteredCustomers.slice(startIdx, endIdx),
      sessions: filteredData.filteredSessions.slice(startIdx, endIdx)
    };
  }, [currentPage, sortedBills, filteredData, itemsPerPage]);

  // Reset pagination when tab or filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, date, searchQuery, billSearchQuery, sortField, sortDirection, paymentTypeFilter]);

  // Render content based on active tab
  const renderContent = () => {
    switch (activeTab) {
      case 'bills':
        return renderBillsTab();
      case 'customers':
        return renderCustomersTab();
      case 'sessions':
        return renderSessionsTab();
      case 'summary':
        return renderSummaryTab();
      default:
        return null;
    }
  };

  // Bills tab
  const renderBillsTab = () => (
    <div className="space-y-4">
      <SalesWidgets filteredBills={filteredData.filteredBills} />
      <div className="bg-[#1A1F2C] border border-gray-800 rounded-lg overflow-hidden">
        <div className="p-6">
          <h2 className="text-2xl font-bold mb-1">Transaction History</h2>
          <p className="text-gray-400">
            View all transactions 
            {date?.from && date?.to ? ` from ${format(date.from, 'MMMM do, yyyy')} to ${format(date.to, 'MMMM do, yyyy')}` : ''}
          </p>
          
          <div className="mt-4 flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 h-4 w-4" />
              <Input
                placeholder="Search by customer name, email, phone, or bill ID"
                value={billSearchQuery}
                onChange={(e) => setBillSearchQuery(e.target.value)}
                className="pl-10 bg-gray-800 border-gray-700 text-white w-full"
              />
            </div>
            
            <Select value={paymentTypeFilter} onValueChange={setPaymentTypeFilter}>
              <SelectTrigger className="w-full md:w-[180px] bg-gray-800 border-gray-700 text-white">
                <SelectValue placeholder="Payment Type" />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-gray-700 text-white">
                <SelectItem value="all">All Payments</SelectItem>
                <SelectItem value="upi">UPI</SelectItem>
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="credit">Credit</SelectItem>
                <SelectItem value="complimentary">Complimentary</SelectItem>
                <SelectItem value="split">Split Payment</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {(billSearchQuery || paymentTypeFilter !== 'all') && (
            <p className="text-sm text-gray-400 mt-2">
              Found {filteredData.filteredBills.length} matching transactions
            </p>
          )}
          
          {sortedBills.length > itemsPerPage && (
            <div className="mt-4 flex justify-between items-center">
              <span className="text-sm text-gray-400">
                Showing {Math.min(paginatedData.bills.length, itemsPerPage)} of {sortedBills.length} transactions
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(curr => Math.max(1, curr - 1))}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage * itemsPerPage >= sortedBills.length}
                  onClick={() => setCurrentPage(curr => curr + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>
        <div className="rounded-md overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                  <Button
                    variant="ghost"
                    onClick={() => handleSort('date')}
                    className="h-auto p-0 font-medium text-gray-400 hover:text-white flex items-center gap-1"
                  >
                    Date & Time
                    {getSortIcon('date')}
                  </Button>
                </TableHead>
                <TableHead>Bill ID</TableHead>
                <TableHead>
                  <Button
                    variant="ghost"
                    onClick={() => handleSort('customer')}
                    className="h-auto p-0 font-medium text-gray-400 hover:text-white flex items-center gap-1"
                  >
                    Customer
                    {getSortIcon('customer')}
                  </Button>
                </TableHead>
                <TableHead>Items</TableHead>
                <TableHead>
                  <Button
                    variant="ghost"
                    onClick={() => handleSort('subtotal')}
                    className="h-auto p-0 font-medium text-gray-400 hover:text-white flex items-center gap-1"
                  >
                    Subtotal
                    {getSortIcon('subtotal')}
                  </Button>
                </TableHead>
                <TableHead>
                  <Button
                    variant="ghost"
                    onClick={() => handleSort('discount')}
                    className="h-auto p-0 font-medium text-gray-400 hover:text-white flex items-center gap-1"
                  >
                    Discount
                    {getSortIcon('discount')}
                  </Button>
                </TableHead>
                <TableHead>Points Used</TableHead>
                <TableHead>
                  <Button
                    variant="ghost"
                    onClick={() => handleSort('total')}
                    className="h-auto p-0 font-medium text-gray-400 hover:text-white flex items-center gap-1"
                  >
                    Total
                    {getSortIcon('total')}
                  </Button>
                </TableHead>
                <TableHead>Payment</TableHead>
                <TableHead>Split</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedData.bills.map(bill => (
                <ExpandableBillRow
                  key={bill.id}
                  bill={bill}
                  getCustomerName={getCustomerName}
                  getCustomerPhone={getCustomerPhone}
                  searchTerm={billSearchQuery}
                  onEdit={handleEditBill}
                  onDelete={handleDeleteBill}
                />
              ))}
              
              {paginatedData.bills.length === 0 && (
                <TableRow>
                  <TableCell colSpan={11} className="text-center py-16 text-gray-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-500 mb-2">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <path d="M14 2v6h6" />
                        <path d="M16 13H8" />
                        <path d="M16 17H8" />
                        <path d="M10 9H8" />
                      </svg>
                      <p className="text-lg font-medium">No bills available</p>
                      <p className="text-sm">
                        {billSearchQuery || paymentTypeFilter !== 'all' ? 
                          `No transactions found matching current filters` : 
                          "No transactions found in the selected date range"
                        }
                      </p>
                      {(date?.from || date?.to || billSearchQuery || paymentTypeFilter !== 'all') ? (
                        <div className="flex gap-2 mt-2">
                          {billSearchQuery && (
                            <Button
                              variant="outline"
                              className="text-purple-400 border-purple-800 hover:bg-purple-900/20"
                              onClick={() => setBillSearchQuery('')}
                            >
                              Clear search
                            </Button>
                          )}
                          {paymentTypeFilter !== 'all' && (
                            <Button
                              variant="outline"
                              className="text-purple-400 border-purple-800 hover:bg-purple-900/20"
                              onClick={() => setPaymentTypeFilter('all')}
                            >
                              Clear payment filter
                            </Button>
                          )}
                          {(date?.from || date?.to) && (
                            <Button
                              variant="outline"
                              className="text-purple-400 border-purple-800 hover:bg-purple-900/20"
                              onClick={() => setDate(undefined)}
                            >
                              Reset date filter
                            </Button>
                          )}
                        </div>
                      ) : null}
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );

  const renderCustomersTab = () => (
    <div className="bg-[#1A1F2C] border border-gray-800 rounded-lg overflow-hidden">
      <div className="p-6">
        <h2 className="text-2xl font-bold mb-1">Customer Activity</h2>
        <p className="text-gray-400">
          View all customers and their activity
          {date?.from && date?.to ? ` from ${format(date.from, 'MMMM do, yyyy')} to ${format(date.to, 'MMMM do, yyyy')}` : ''}
        </p>
        
        {filteredData.filteredCustomers.length > itemsPerPage && (
          <div className="mt-4 flex justify-between items-center">
            <span className="text-sm text-gray-400">
              Showing {Math.min(paginatedData.customers.length, itemsPerPage)} of {filteredData.filteredCustomers.length} customers
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(curr => Math.max(1, curr - 1))}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage * itemsPerPage >= filteredData.filteredCustomers.length}
                onClick={() => setCurrentPage(curr => curr + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>
      <div className="rounded-md overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Customer</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Member Status</TableHead>
              <TableHead>Total Spent</TableHead>
              <TableHead>Play Time</TableHead>
              <TableHead>Loyalty Points</TableHead>
              <TableHead>Joined On</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedData.customers.map(customer => (
              <TableRow key={customer.id}>
                <TableCell className="text-white font-medium">{customer.name}</TableCell>
                <TableCell className="text-white">
                  <div>{customer.phone}</div>
                  {customer.email && <div className="text-gray-400 text-xs">{customer.email}</div>}
                </TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className={customer.isMember ? "bg-purple-900/30 text-purple-400 border-purple-800" : "bg-gray-800/50 text-gray-400 border-gray-700"}
                  >
                    {customer.isMember ? "Member" : "Non-Member"}
                  </Badge>
                </TableCell>
                <TableCell className="text-white">
                  <CurrencyDisplay amount={getCustomerTotalSpent(customer.id)} />
                </TableCell>
                <TableCell className="text-white">{getCustomerPlayTime(customer.id)}</TableCell>
                <TableCell className="text-white">{customer.loyaltyPoints || 0}</TableCell>
                <TableCell className="text-white">{customer.createdAt ? format(new Date(customer.createdAt), 'd MMM yyyy') : 'N/A'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );

  const renderSessionsTab = () => (
    <div className="bg-[#1A1F2C] border border-gray-800 rounded-lg overflow-hidden">
      <div className="p-6">
        <h2 className="text-2xl font-bold mb-1">Session History</h2>
        <p className="text-gray-400">
          View all game sessions and their details
          {date?.from && date?.to ? ` from ${format(date.from, 'MMMM do, yyyy')} to ${format(date.to, 'MMMM do, yyyy')}` : ''}
        </p>
        
        <div className="mt-4 relative">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 h-4 w-4" />
            <Input
              placeholder="Search by customer name, email or phone"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-gray-800 border-gray-700 text-white w-full md:w-96"
            />
          </div>
          {searchQuery && (
            <p className="text-sm text-gray-400 mt-2">
              Found {filteredData.filteredSessions.length} matching sessions
            </p>
          )}
        </div>
        
        {filteredData.filteredSessions.length > itemsPerPage && (
          <div className="mt-4 flex justify-between items-center">
            <span className="text-sm text-gray-400">
              Showing {Math.min(paginatedData.sessions.length, itemsPerPage)} of {filteredData.filteredSessions.length} sessions
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(curr => Math.max(1, curr - 1))}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage * itemsPerPage >= filteredData.filteredSessions.length}
                onClick={() => setCurrentPage(curr => curr + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>
      <div className="rounded-md overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Station</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Start Time</TableHead>
              <TableHead>End Time</TableHead>
              <TableHead>Duration</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedData.sessions.map(session => {
              let durationDisplay = "0h 1m";
              if (session.endTime) {
                const startMs = new Date(session.startTime).getTime();
                const endMs = new Date(session.endTime).getTime();
                const durationMinutes = Math.max(1, Math.round((endMs - startMs) / (1000 * 60)));
                const hours = Math.floor(durationMinutes / 60);
                const minutes = durationMinutes % 60;
                durationDisplay = `${hours}h ${minutes}m`;
              } else if (session.duration) {
                const hours = Math.floor(session.duration / 60);
                const minutes = session.duration % 60;
                durationDisplay = `${hours}h ${minutes}m`;
              }

              return (
                <TableRow key={session.id}>
                  <TableCell className="text-white font-medium">{session.stationId}</TableCell>
                  <TableCell className="text-white">{getCustomerName(session.customerId)}</TableCell>
                  <TableCell className="text-white text-sm">
                    {getCustomerPhone(session.customerId)}
                    {getCustomerEmail(session.customerId) && (
                      <div className="text-gray-400">{getCustomerEmail(session.customerId)}</div>
                    )}
                  </TableCell>
                  <TableCell className="text-white">
                    <div>{format(new Date(session.startTime), 'd MMM yyyy')}</div>
                    <div className="text-gray-400">{format(new Date(session.startTime), 'HH:mm')}</div>
                  </TableCell>
                  <TableCell className="text-white">
                    {session.endTime ? (
                      <>
                        <div>{format(new Date(session.endTime), 'd MMM yyyy')}</div>
                        <div className="text-gray-400">{format(new Date(session.endTime), 'HH:mm')}</div>
                      </>
                    ) : '-'}
                  </TableCell>
                  <TableCell className="text-white">{durationDisplay}</TableCell>
                  <TableCell>
                    <Badge
                      className={!session.endTime ?
                        "bg-green-900/30 text-green-400 border-green-800" :
                        "bg-gray-700 text-gray-300"
                      }
                    >
                      {session.endTime ? 'Completed' : 'Active'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-red-400 hover:text-red-300 hover:bg-red-950/30"
                        >
                          <Trash2 className="h-4 w-4" />
                          <span className="sr-only">Delete session</span>
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="bg-gray-900 border-gray-800 text-white">
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Session</AlertDialogTitle>
                          <AlertDialogDescription className="text-gray-400">
                            Are you sure you want to delete this session? This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel className="bg-gray-800 text-white hover:bg-gray-700">Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            className="bg-red-900 hover:bg-red-800 focus:ring-red-800"
                            onClick={() => handleDeleteSession(session.id)}
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </TableCell>
                </TableRow>
              );
            })}
            {paginatedData.sessions.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-gray-400">
                  {sessionsLoading ? (
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-cuephoria-purple"></div>
                      <span className="ml-3">Loading sessions...</span>
                    </div>
                  ) : searchQuery ? (
                    <div>
                      <p>No sessions found matching "{searchQuery}"</p>
                      <Button
                        variant="link"
                        className="text-cuephoria-purple"
                        onClick={() => setSearchQuery('')}
                      >
                        Clear search
                      </Button>
                    </div>
                  ) : (
                    "No sessions found in the selected date range"
                  )}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );

  const renderSummaryTab = () => (
    <div className="space-y-8">
      <BusinessSummaryReport
        startDate={date?.from}
        endDate={date?.to}
        onDownload={handleDownloadReport}
      />
      
      {/* Complimentary Insights Widget - Moved to bottom with matching theme */}
      <Card className="bg-gradient-to-br from-gray-900/95 to-gray-800/90 border-gray-700/50 shadow-xl hover:shadow-amber-500/20 hover:border-amber-500/30 transition-all duration-300 backdrop-blur-sm">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 border-b border-gray-700/30">
          <CardTitle className="text-lg font-semibold text-white flex items-center gap-2">
            <Gift className="h-5 w-5 text-amber-400" />
            Complimentary Sales Insights
          </CardTitle>
          <div className="h-8 w-8 rounded-full bg-amber-500/20 flex items-center justify-center">
            <Gift className="h-4 w-4 text-amber-400" />
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-4">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-gray-800/30 rounded-lg p-4 border border-gray-700/30">
                <div className="flex items-center gap-2 mb-2">
                  <div className="h-8 w-8 rounded-full bg-amber-500/20 flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-amber-400">
                      <line x1="12" y1="1" x2="12" y2="23"></line>
                      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
                    </svg>
                  </div>
                  <p className="text-sm text-gray-400">Total Value Given</p>
                </div>
                <CurrencyDisplay 
                  amount={summaryMetrics.financial.complimentarySales} 
                  className="text-2xl font-bold text-amber-400"
                />
              </div>
              
              <div className="bg-gray-800/30 rounded-lg p-4 border border-gray-700/30">
                <div className="flex items-center gap-2 mb-2">
                  <div className="h-8 w-8 rounded-full bg-blue-500/20 flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-400">
                      <rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect>
                      <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
                    </svg>
                  </div>
                  <p className="text-sm text-gray-400">Transactions</p>
                </div>
                <p className="text-2xl font-bold text-white">
                  {summaryMetrics.financial.complimentaryCount}
                </p>
              </div>
              
              <div className="bg-gray-800/30 rounded-lg p-4 border border-gray-700/30">
                <div className="flex items-center gap-2 mb-2">
                  <div className="h-8 w-8 rounded-full bg-purple-500/20 flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-purple-400">
                      <line x1="12" y1="20" x2="12" y2="10"></line>
                      <line x1="18" y1="20" x2="18" y2="4"></line>
                      <line x1="6" y1="20" x2="6" y2="16"></line>
                    </svg>
                  </div>
                  <p className="text-sm text-gray-400">Avg. Per Transaction</p>
                </div>
                <CurrencyDisplay 
                  amount={summaryMetrics.financial.avgComplimentaryValue} 
                  className="text-2xl font-bold text-white"
                />
              </div>
            </div>
            
            {/* Percentage of Total Volume */}
            <div className="bg-gray-800/30 rounded-lg p-4 border border-gray-700/30">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-gray-200">% of Total Transaction Volume</span>
                <span className="text-lg font-bold text-amber-400">
                  {summaryMetrics.financial.complimentaryPercentage.toFixed(1)}%
                </span>
              </div>
              
              {/* Visual Progress Bar */}
              <div className="space-y-2">
                <div className="w-full bg-gray-700/50 rounded-full h-3 overflow-hidden">
                  <div 
                    className="bg-gradient-to-r from-amber-500 to-orange-500 h-3 rounded-full transition-all duration-500 ease-out shadow-lg shadow-amber-500/30"
                    style={{width: `${Math.min(summaryMetrics.financial.complimentaryPercentage, 100)}%`}}
                  />
                </div>
                <div className="flex justify-between text-xs text-gray-500">
                  <span>0%</span>
                  <span>50%</span>
                  <span>100%</span>
                </div>
              </div>
            </div>
            
            {/* Additional Info */}
            <div className="pt-2 border-t border-gray-700/30">
              <div className="text-xs text-gray-500 flex justify-between items-center">
                <p>Complimentary items help build customer loyalty and drive repeat visits</p>
                <p className="text-amber-400 flex items-center gap-1">
                  <Gift className="h-3 w-3" />
                  Promotional Tracking
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  // Handle calendar date changes
  const handleCalendarSelect = (newDate: DateRange | undefined) => {
    setDate(newDate);
    if (newDate?.from && newDate?.to) {
      setDateRangeKey('custom');
    }
  };

  return (
    <div className="p-3 sm:p-6 space-y-4 sm:space-y-6 min-h-screen text-white bg-transparent">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-2">
        <h1 className="text-2xl sm:text-4xl font-bold gradient-text font-heading">Reports</h1>
        <div className="flex flex-wrap items-center gap-2 sm:gap-4 w-full sm:w-auto">
          <Select value={dateRangeKey} onValueChange={handleDateRangeChange}>
            <SelectTrigger className="w-full sm:w-[180px] bg-gray-800 border-gray-700 text-white text-sm">
              <SelectValue placeholder="Select period" />
            </SelectTrigger>
            <SelectContent className="bg-gray-800 border-gray-700 text-white">
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="yesterday">Yesterday</SelectItem>
              <SelectItem value="thisWeek">This week</SelectItem>
              <SelectItem value="thisMonth">This month</SelectItem>
              <SelectItem value="last3Months">Last 3 months</SelectItem>
              <SelectItem value="thisYear">This year</SelectItem>
              <SelectItem value="custom">Custom range</SelectItem>
            </SelectContent>
          </Select>
          
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="gap-2 bg-gray-800 border-gray-700 text-white text-xs sm:text-sm flex-1 sm:flex-initial">
                <CalendarIcon className="h-4 w-4" />
                <span className="hidden sm:inline">{dateRangeString}</span>
                <span className="sm:hidden">Date</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 bg-gray-800 border-gray-700" align={isMobile ? "start" : "end"}>
              <Calendar
                initialFocus
                mode="range"
                defaultMonth={date?.from}
                selected={date}
                onSelect={handleCalendarSelect}
                numberOfMonths={isMobile ? 1 : 2}
                className="p-3 pointer-events-auto bg-gray-800 text-white"
              />
            </PopoverContent>
          </Popover>
          
          <Button onClick={handleDownloadReport} className="gap-2 bg-purple-500 hover:bg-purple-600 text-white text-xs sm:text-sm flex-1 sm:flex-initial">
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">Export</span>
            <span className="sm:hidden">Export</span>
          </Button>
        </div>
      </div>
      
      <div className="bg-gray-800/60 rounded-lg p-1 flex gap-2 overflow-x-auto scrollbar-hide">
        <Button
          onClick={() => setActiveTab('bills')}
          variant={activeTab === 'bills' ? 'default' : 'ghost'}
          className={`gap-2 whitespace-nowrap flex-shrink-0 text-xs sm:text-sm ${activeTab === 'bills' ? 'bg-gray-700' : 'text-gray-400'}`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <path d="M14 2v6h6" />
            <path d="M16 13H8" />
            <path d="M16 17H8" />
            <path d="M10 9H8" />
          </svg>
          Bills
        </Button>
        <Button
          onClick={() => setActiveTab('customers')}
          variant={activeTab === 'customers' ? 'default' : 'ghost'}
          className={`gap-2 whitespace-nowrap flex-shrink-0 text-xs sm:text-sm ${activeTab === 'customers' ? 'bg-gray-700' : 'text-gray-400'}`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M22 21v-2a4 4 0 0 1 0 7.75" />
          </svg>
          Customers
        </Button>
        <Button
          onClick={() => setActiveTab('sessions')}
          variant={activeTab === 'sessions' ? 'default' : 'ghost'}
          className={`gap-2 whitespace-nowrap flex-shrink-0 text-xs sm:text-sm ${activeTab === 'sessions' ? 'bg-gray-700' : 'text-gray-400'}`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
          Sessions
        </Button>
        <Button
          onClick={() => setActiveTab('summary')}
          variant={activeTab === 'summary' ? 'default' : 'ghost'}
          className={`gap-2 whitespace-nowrap flex-shrink-0 text-xs sm:text-sm ${activeTab === 'summary' ? 'bg-gray-700' : 'text-gray-400'}`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect width="20" height="14" x="2" y="5" rx="2" />
            <line x1="2" x2="22" y1="10" y2="10" />
          </svg>
          Summary
        </Button>
      </div>
      
      <div className="space-y-6">
        {renderContent()}
      </div>
    </div>
  );
};

export default ReportsPage;
