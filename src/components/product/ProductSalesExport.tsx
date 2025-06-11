
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
      // Extract only food and drinks sales from bills using the same logic as widgets
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
            
            // Include food, drinks, snacks, beverage, and tobacco (same as widgets) but exclude challenges
            const isFoodOrDrinks = productCategory === 'food' || productCategory === 'drinks' || 
                                 productCategory === 'snacks' || productCategory === 'beverage' || 
                                 productCategory === 'tobacco';
            const isChallenges = productCategory === 'challenges' || productCategory === 'challenge';
            
            if (isFoodOrDrinks && !isChallenges) {
              // Calculate proportional amounts based on bill's discount/total ratio (same as widgets)
              let proportionalItemTotal = item.total;
              let proportionalProfit = 0;
              
              if (bill.subtotal > 0) {
                proportionalItemTotal = (item.total / bill.subtotal) * bill.total;
              }

              // Calculate profit using the same logic as ProductProfitWidget
              if (product) {
                let profitPerUnit = 0;
                
                if (product.profit) {
                  profitPerUnit = product.profit;
                } else if (product.buyingPrice && product.sellingPrice) {
                  profitPerUnit = product.sellingPrice - product.buyingPrice;
                } else if (product.buyingPrice && product.price) {
                  profitPerUnit = product.price - product.buyingPrice;
                }
                
                // Calculate proportional profit
                const totalItemProfit = profitPerUnit * item.quantity;
                if (bill.subtotal > 0) {
                  proportionalProfit = (totalItemProfit / bill.subtotal) * bill.total;
                } else {
                  proportionalProfit = totalItemProfit;
                }
              }

              // Debug logging to match widget calculations
              console.log(`Export - Product: ${item.name}`);
              console.log(`Export - Quantity: ${item.quantity}`);
              console.log(`Export - Original Item Total: ${item.total}`);
              console.log(`Export - Proportional Item Total: ${proportionalItemTotal}`);
              console.log(`Export - Proportional Profit: ${proportionalProfit}`);
              console.log(`Export - Bill Subtotal: ${bill.subtotal}, Bill Total: ${bill.total}`);
              console.log('---');

              productSales.push({
                'Customer Name': customerName,
                'Date': billDate,
                'Product Name': item.name,
                'Category': product?.category || item.category || 'Unknown',
                'Quantity': item.quantity,
                'Unit Price': item.price,
                'Original Item Total': item.total,
                'Proportional Total Value': proportionalItemTotal.toFixed(2),
                'Buying Price': product?.buyingPrice || 0,
                'Profit Per Unit': product?.profit || ((product?.sellingPrice || product?.price || 0) - (product?.buyingPrice || 0)),
                'Proportional Total Profit': proportionalProfit.toFixed(2),
                'Bill ID': bill.id,
                'Bill Subtotal': bill.subtotal,
                'Bill Total': bill.total
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

      // Calculate totals for verification
      const totalProportionalSales = productSales.reduce((sum, item) => sum + parseFloat(item['Proportional Total Value']), 0);
      const totalProportionalProfit = productSales.reduce((sum, item) => sum + parseFloat(item['Proportional Total Profit']), 0);
      
      console.log('Export Totals:');
      console.log('Total Proportional Sales:', totalProportionalSales.toFixed(2));
      console.log('Total Proportional Profit:', totalProportionalProfit.toFixed(2));

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
        description: `Food and drinks sales exported successfully to ${filename}. Totals: Sales ₹${totalProportionalSales.toFixed(2)}, Profit ₹${totalProportionalProfit.toFixed(2)}`,
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
