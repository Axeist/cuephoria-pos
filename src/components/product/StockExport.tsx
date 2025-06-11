
import React from 'react';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { usePOS } from '@/context/POSContext';
import { useToast } from '@/hooks/use-toast';
import * as XLSX from 'xlsx';

const StockExport: React.FC = () => {
  const { products } = usePOS();
  const { toast } = useToast();

  const exportTotalStock = () => {
    try {
      if (products.length === 0) {
        toast({
          title: 'No Data',
          description: 'No products found to export.',
          variant: 'destructive'
        });
        return;
      }

      // Prepare stock data for export
      const stockData = products.map(product => {
        // Calculate profit per unit
        let profitPerUnit = 0;
        if (product.profit) {
          profitPerUnit = product.profit;
        } else if (product.buyingPrice && product.sellingPrice) {
          profitPerUnit = product.sellingPrice - product.buyingPrice;
        } else if (product.buyingPrice && product.price) {
          profitPerUnit = product.price - product.buyingPrice;
        }

        // Calculate total stock value at buying price
        const totalBuyingValue = (product.buyingPrice || 0) * product.stock;
        
        // Calculate total stock value at selling price
        const totalSellingValue = (product.sellingPrice || product.price) * product.stock;
        
        // Calculate total potential profit
        const totalPotentialProfit = profitPerUnit * product.stock;

        return {
          'Product Name': product.name,
          'Category': product.category,
          'Available Stock': product.stock,
          'Buying Price': product.buyingPrice || 0,
          'Selling Price': product.sellingPrice || product.price,
          'Regular Price': product.price,
          'Profit Per Unit': profitPerUnit.toFixed(2),
          'Total Buying Value': totalBuyingValue.toFixed(2),
          'Total Selling Value': totalSellingValue.toFixed(2),
          'Total Potential Profit': totalPotentialProfit.toFixed(2),
          'Original Price': product.originalPrice || '',
          'Offer Price': product.offerPrice || '',
          'Student Price': product.studentPrice || '',
          'Duration': product.duration || '',
          'Membership Hours': product.membershipHours || ''
        };
      });

      // Calculate totals
      const totalBuyingValue = stockData.reduce((sum, item) => sum + parseFloat(item['Total Buying Value']), 0);
      const totalSellingValue = stockData.reduce((sum, item) => sum + parseFloat(item['Total Selling Value']), 0);
      const totalPotentialProfit = stockData.reduce((sum, item) => sum + parseFloat(item['Total Potential Profit']), 0);
      const totalStock = stockData.reduce((sum, item) => sum + item['Available Stock'], 0);

      console.log('Stock Export Summary:');
      console.log('Total Products:', products.length);
      console.log('Total Stock Units:', totalStock);
      console.log('Total Buying Value:', totalBuyingValue.toFixed(2));
      console.log('Total Selling Value:', totalSellingValue.toFixed(2));
      console.log('Total Potential Profit:', totalPotentialProfit.toFixed(2));

      // Create worksheet
      const worksheet = XLSX.utils.json_to_sheet(stockData);
      
      // Create workbook
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Available Stock');

      // Generate filename with current date
      const currentDate = new Date().toISOString().split('T')[0];
      const filename = `available_stock_${currentDate}.xlsx`;

      // Export the file
      XLSX.writeFile(workbook, filename);

      toast({
        title: 'Export Successful',
        description: `Stock data exported successfully to ${filename}. Total products: ${products.length}, Total stock value: ₹${totalSellingValue.toFixed(2)}`,
      });

    } catch (error) {
      console.error('Error exporting stock data:', error);
      toast({
        title: 'Export Failed',
        description: 'Failed to export stock data. Please try again.',
        variant: 'destructive'
      });
    }
  };

  return (
    <Button onClick={exportTotalStock} variant="outline" className="h-10">
      <Download className="h-4 w-4 mr-2" />
      Export Available Stock
    </Button>
  );
};

export default StockExport;
