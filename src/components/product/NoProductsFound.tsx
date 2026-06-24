
import React from 'react';
import { Link } from 'react-router-dom';
import { IdCard, Package, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface NoProductsFoundProps {
  activeTab: string;
  onAddProduct: () => void;
}

const NoProductsFound: React.FC<NoProductsFoundProps> = ({ activeTab, onAddProduct }) => {
  if (activeTab === 'membership') {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center px-4">
        <IdCard className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-xl font-medium">No membership plans yet</h3>
        <p className="text-muted-foreground mt-2 max-w-md">
          Membership products are created from tier plans in the Memberships hub and appear here automatically in POS.
        </p>
        <Button className="mt-4" asChild>
          <Link to="/memberships?zone=setup&section=tiers">
            <IdCard className="h-4 w-4 mr-2" /> Open Memberships
          </Link>
        </Button>
      </div>
    );
  }

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
