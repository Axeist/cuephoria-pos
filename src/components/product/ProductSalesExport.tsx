
import React from 'react';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useLocationAnalytics } from '@/hooks/useLocationAnalytics';
import * as XLSX from 'xlsx';

const ProductSalesExport: React.FC = () => {
  const { canteen, loading } = useLocationAnalytics();
  const { toast } = useToast();

  const exportProductSales = () => {
    try {
      const rows = (canteen?.products ?? []).map((p) => ({
        'Product Name': p.name,
        Quantity: p.quantity,
        'Total Sales': p.sales.toFixed(2),
        'Total Profit': p.profit.toFixed(2),
      }));

      if (rows.length === 0) {
        toast({
          title: 'No Data',
          description: 'No product sales data to export.',
          variant: 'destructive',
        });
        return;
      }

      const worksheet = XLSX.utils.json_to_sheet(rows);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Product Sales');
      XLSX.writeFile(workbook, `product_sales_${new Date().toISOString().slice(0, 10)}.xlsx`);

      toast({
        title: 'Export Successful',
        description: `Exported ${rows.length} products.`,
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: 'Export Failed',
        description: 'Could not export product sales.',
        variant: 'destructive',
      });
    }
  };

  return (
    <Button
      onClick={exportProductSales}
      disabled={loading}
      variant="outline"
      className="border-white/10 text-white hover:bg-white/10"
    >
      <Download className="h-4 w-4 mr-2" />
      Export Product Sales
    </Button>
  );
};

export default ProductSalesExport;
