
import React from 'react';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { usePOS } from '@/context/POSContext';
import { useToast } from '@/hooks/use-toast';
import * as XLSX from 'xlsx';

const ProductSalesExport: React.FC = () => {
  const { bills, customers, products } = usePOS();
  const { toast } = useToast();

  const exportProductSales = () => {
    try {
      // Extract only food and drinks sales from bills
      const productSales: any[] = [];

      bills.forEach(bill => {
        const customer = customers.find(c => c.id === bill.customerId);
        const customerName = customer ? customer.name : 'Unknown Customer';
        const billDate = bill.createdAt.toLocaleDateString();

        // Process each item in the bill (only products, not sessions)
        bill.items.forEach(item => {
          if (item.type === 'product') {
            // Find the product to get its category and pricing details
            const product = products.find(p => p.name === item.name);
            const productCategory = product?.category?.toLowerCase() || item.category?.toLowerCase() || '';
            
            // Only include food and drinks
            if (productCategory === 'food' || productCategory === 'drinks') {
              // Calculate profit per unit and total profit
              const buyingPrice = product?.buyingPrice || 0;
              const sellingPrice = product?.sellingPrice || item.price;
              const profitPerUnit = sellingPrice - buyingPrice;
              const totalProfit = profitPerUnit * item.quantity;

              productSales.push({
                'Customer Name': customerName,
                'Date': billDate,
                'Product Name': item.name,
                'Category': product?.category || item.category || 'Unknown',
                'Quantity': item.quantity,
                'Unit Price': item.price,
                'Total Value': item.total,
                'Buying Price': buyingPrice,
                'Profit Per Unit': profitPerUnit,
                'Total Profit': totalProfit,
                'Bill ID': bill.id
              });
            }
          }
        });
      });

      if (productSales.length === 0) {
        toast({
          title: 'No Data',
          description: 'No food and drinks sales found to export.',
          variant: 'destructive'
        });
        return;
      }

      // Create worksheet
      const worksheet = XLSX.utils.json_to_sheet(productSales);
      
      // Create workbook
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Food & Drinks Sales');

      // Generate filename with current date
      const currentDate = new Date().toISOString().split('T')[0];
      const filename = `food_drinks_sales_${currentDate}.xlsx`;

      // Export the file
      XLSX.writeFile(workbook, filename);

      toast({
        title: 'Export Successful',
        description: `Food and drinks sales exported successfully to ${filename}`,
      });

    } catch (error) {
      console.error('Error exporting product sales:', error);
      toast({
        title: 'Export Failed',
        description: 'Failed to export food and drinks sales. Please try again.',
        variant: 'destructive'
      });
    }
  };

  return (
    <Button onClick={exportProductSales} variant="outline" className="h-10">
      <Download className="h-4 w-4 mr-2" />
      Export Food & Drinks Sales
    </Button>
  );
};

export default ProductSalesExport;
