
import React from 'react';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { usePOS } from '@/context/POSContext';
import { useToast } from '@/hooks/use-toast';
import * as XLSX from 'xlsx';

const ProductSalesExport: React.FC = () => {
  const { bills, customers } = usePOS();
  const { toast } = useToast();

  const exportProductSales = () => {
    try {
      // Extract all product sales from bills
      const productSales: any[] = [];

      bills.forEach(bill => {
        const customer = customers.find(c => c.id === bill.customerId);
        const customerName = customer ? customer.name : 'Unknown Customer';
        const billDate = bill.createdAt.toLocaleDateString();

        // Process each item in the bill (only products, not sessions)
        bill.items.forEach(item => {
          if (item.type === 'product') {
            productSales.push({
              'Customer Name': customerName,
              'Date': billDate,
              'Product Name': item.name,
              'Quantity': item.quantity,
              'Unit Price': item.price,
              'Total Value': item.total,
              'Bill ID': bill.id
            });
          }
        });
      });

      if (productSales.length === 0) {
        toast({
          title: 'No Data',
          description: 'No product sales found to export.',
          variant: 'destructive'
        });
        return;
      }

      // Create worksheet
      const worksheet = XLSX.utils.json_to_sheet(productSales);
      
      // Create workbook
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Product Sales');

      // Generate filename with current date
      const currentDate = new Date().toISOString().split('T')[0];
      const filename = `product_sales_${currentDate}.xlsx`;

      // Export the file
      XLSX.writeFile(workbook, filename);

      toast({
        title: 'Export Successful',
        description: `Product sales exported successfully to ${filename}`,
      });

    } catch (error) {
      console.error('Error exporting product sales:', error);
      toast({
        title: 'Export Failed',
        description: 'Failed to export product sales. Please try again.',
        variant: 'destructive'
      });
    }
  };

  return (
    <Button onClick={exportProductSales} variant="outline" className="h-10">
      <Download className="h-4 w-4 mr-2" />
      Export Product Sales
    </Button>
  );
};

export default ProductSalesExport;
