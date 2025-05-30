import React from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import MobileProductsView from '@/components/mobile/MobileProductsView';
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
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
import { Search } from "lucide-react"

const Products: React.FC = () => {
  const isMobile = useIsMobile();

  if (isMobile) {
    return <MobileProductsView />;
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-3xl font-bold gradient-text font-heading">Products</h1>
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-1/3">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input placeholder="Search products..." className="pl-10 bg-gray-800 border-gray-600 text-white placeholder-gray-400" />
        </div>
        <div className="flex items-center space-x-2">
          <Select>
            <SelectTrigger className="w-[180px] bg-gray-800 border-gray-600 text-white">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent className="bg-gray-800 border-gray-600">
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="food">Food</SelectItem>
              <SelectItem value="drinks">Drinks</SelectItem>
              <SelectItem value="tobacco">Tobacco</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline">Add Product</Button>
        </div>
      </div>

      <div className="table-container">
        <Table>
          <TableCaption>A list of your products.</TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Available</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell>Coca Cola</TableCell>
              <TableCell>Drinks</TableCell>
              <TableCell>₹50</TableCell>
              <TableCell>24</TableCell>
              <TableCell className="text-right">
                <Button variant="ghost" size="sm">Edit</Button>
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell>Fanta</TableCell>
              <TableCell>Drinks</TableCell>
              <TableCell>₹45</TableCell>
              <TableCell>Out of Stock</TableCell>
              <TableCell className="text-right">
                <Button variant="ghost" size="sm">Edit</Button>
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell>Weekly Pass</TableCell>
              <TableCell>Membership</TableCell>
              <TableCell>₹399</TableCell>
              <TableCell>Available</TableCell>
              <TableCell className="text-right">
                <Button variant="ghost" size="sm">Edit</Button>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default Products;
