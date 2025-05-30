import React from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import MobileReportsView from '@/components/mobile/MobileReportsView';
import { BarChart, CalendarDays, DollarSign, Users } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

const Reports: React.FC = () => {
  const isMobile = useIsMobile();

  if (isMobile) {
    return <MobileReportsView />;
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-3xl font-bold gradient-text font-heading">Reports & Analytics</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="card-hover">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Total Revenue</CardTitle>
            <CardDescription>From January 1, 2024 to December 31, 2024</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$120,000</div>
            <div className="text-sm text-gray-500 flex items-center mt-2">
              <DollarSign className="h-4 w-4 mr-1" />
              <span>+12% from last year</span>
            </div>
          </CardContent>
        </Card>

        <Card className="card-hover">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">New Customers</CardTitle>
            <CardDescription>From January 1, 2024 to December 31, 2024</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">345</div>
            <div className="text-sm text-gray-500 flex items-center mt-2">
              <Users className="h-4 w-4 mr-1" />
              <span>+8% from last year</span>
            </div>
          </CardContent>
        </Card>

        <Card className="card-hover">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Orders Placed</CardTitle>
            <CardDescription>From January 1, 2024 to December 31, 2024</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">1,245</div>
            <div className="text-sm text-gray-500 flex items-center mt-2">
              <BarChart className="h-4 w-4 mr-1" />
              <span>+15% from last year</span>
            </div>
          </CardContent>
        </Card>

        <Card className="card-hover">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Active Subscriptions</CardTitle>
            <CardDescription>As of December 31, 2024</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">678</div>
            <div className="text-sm text-gray-500 flex items-center mt-2">
              <CalendarDays className="h-4 w-4 mr-1" />
              <span>+5% from last year</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold gradient-text font-heading">Recent Transactions</h2>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="btn-hover-effect">
              View All <CalendarDays className="ml-2 h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="sm:w-[400px]">
            <DropdownMenuLabel>Filters</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>All Transactions</DropdownMenuItem>
            <DropdownMenuItem>Today</DropdownMenuItem>
            <DropdownMenuItem>This Week</DropdownMenuItem>
            <DropdownMenuItem>This Month</DropdownMenuItem>
            <DropdownMenuItem>This Year</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="table-container">
        <Table>
          <TableCaption>A list of your recent transactions.</TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[100px]">Invoice No.</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="text-right">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell className="font-medium">INV001</TableCell>
              <TableCell>John Doe</TableCell>
              <TableCell>$100.00</TableCell>
              <TableCell>2024-01-01</TableCell>
              <TableCell className="text-right">
                <Badge variant="outline">Paid</Badge>
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="font-medium">INV002</TableCell>
              <TableCell>Jane Smith</TableCell>
              <TableCell>$200.00</TableCell>
              <TableCell>2024-01-02</TableCell>
              <TableCell className="text-right">
                <Badge variant="secondary">Pending</Badge>
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="font-medium">INV003</TableCell>
              <TableCell>David Johnson</TableCell>
              <TableCell>$150.00</TableCell>
              <TableCell>2024-01-03</TableCell>
              <TableCell className="text-right">
                <Badge variant="outline">Paid</Badge>
              </TableCell>
            </TableRow>
          </TableBody>
          <TableFooter>
            <TableRow>
              <TableCell colSpan={3}>Total</TableCell>
              <TableCell className="text-right">$450.00</TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      </div>
    </div>
  );
};

export default Reports;
