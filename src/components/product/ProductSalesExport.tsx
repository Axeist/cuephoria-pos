
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
      // Extract only food and drinks sales from bills using the EXACT same logic as widgets
      const productSales: any[] = [];

      bills.forEach(bill => {
        const customer = customers.find(c => c.id === bill.customerId);
        const customerName = customer ? customer.name : 'Unknown Customer';
        const billDate = bill.createdAt.toLocaleDateString();

        // Process each item in the bill (only products, not sessions)
        bill.items.forEach(item => {
          if (item.type === 'product') {
            // Find the product to get its category and pricing details
            const product = products.find(p => p.id === item.id || p.name === item.name);
            const productCategory = product?.category?.toLowerCase() || item.category?.toLowerCase() || '';
            
            // Use EXACT same filtering as ProductSalesWidget
            const isFoodOrDrinks = productCategory === 'food' || productCategory === 'drinks' || 
                                 productCategory === 'snacks' || productCategory === 'beverage' || 
                                 productCategory === 'tobacco';
            const isChallenges = productCategory === 'challenges' || productCategory === 'challenge';
            
            if (isFoodOrDrinks && !isChallenges) {
              // Use EXACT same calculation as ProductSalesWidget (direct item total, no proportional)
              const itemTotal = item.total;
              
              // Calculate profit using EXACT same logic as ProductProfitWidget
              let profitPerUnit = 0;
              let totalProfit = 0;
              
              if (product) {
                if (product.profit) {
                  profitPerUnit = product.profit;
                } else if (product.buyingPrice && product.sellingPrice) {
                  profitPerUnit = product.sellingPrice - product.buyingPrice;
                } else if (product.buyingPrice && product.price) {
                  profitPerUnit = product.price - product.buyingPrice;
                }
                
                // Calculate total profit for this item (no proportional calculation)
                totalProfit = profitPerUnit * item.quantity;
              }

              console.log(`Export - Product: ${item.name}`);
              console.log(`Export - Quantity: ${item.quantity}`);
              console.log(`Export - Item Total: ${itemTotal}`);
              console.log(`Export - Profit Per Unit: ${profitPerUnit}`);
              console.log(`Export - Total Profit: ${totalProfit}`);
              console.log('---');

              productSales.push({
                'Customer Name': customerName,
                'Date': billDate,
                'Product Name': item.name,
                'Category': product?.category || item.category || 'Unknown',
                'Quantity': item.quantity,
                'Unit Price': item.price,
                'Total Sales': itemTotal.toFixed(2),
                'Buying Price': product?.buyingPrice || 0,
                'Profit Per Unit': profitPerUnit.toFixed(2),
                'Total Profit': totalProfit.toFixed(2),
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

      // Calculate totals for verification (matching widget calculations)
      const totalSales = productSales.reduce((sum, item) => sum + parseFloat(item['Total Sales']), 0);
      const totalProfit = productSales.reduce((sum, item) => sum + parseFloat(item['Total Profit']), 0);
      
      console.log('Export Totals (matching widgets):');
      console.log('Total Sales:', totalSales.toFixed(2));
      console.log('Total Profit:', totalProfit.toFixed(2));

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
        description: `Food and drinks sales exported successfully to ${filename}. Totals: Sales ₹${totalSales.toFixed(2)}, Profit ₹${totalProfit.toFixed(2)}`,
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
