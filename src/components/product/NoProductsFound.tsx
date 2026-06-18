
import React from 'react';
import { Package, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface NoProductsFoundProps {
  activeTab: string;
  onAddProduct: () => void;
}

const NoProductsFound: React.FC<NoProductsFoundProps> = ({ activeTab, onAddProduct }) => {
  return (
    <div className="flex flex-col items-center justify-center h-64">
      <Package className="h-12 w-12 text-muted-foreground mb-4" />
      <h3 className="text-xl font-medium">No Products Found</h3>
      <p className="text-muted-foreground mt-2">
        {activeTab === 'all'
          ? "You haven't added any products yet."
          : `No products in the ${activeTab} category.`}
      </p>
      <Button className="mt-4" onClick={onAddProduct}>
        <Plus className="h-4 w-4 mr-2" /> Add Product
      </Button>
    </div>
  );
};

export default NoProductsFound;
