
import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Product } from '@/types/pos.types';
import ProductCard from '@/components/ProductCard';
import NoProductsFound from './NoProductsFound';

interface ProductTabsProps {
  products: Product[];
  activeTab: string;
  onTabChange: (value: string) => void;
  categoryCounts: Record<string, number>;
  onEdit: (product: Product) => void;
  onDelete: (id: string) => void;
  onAddProduct: () => void;
  showManagementActions?: boolean;
  isAdmin?: boolean;
}

const ProductTabs: React.FC<ProductTabsProps> = ({
  products,
  activeTab,
  onTabChange,
  categoryCounts,
  onEdit,
  onDelete,
  onAddProduct,
  showManagementActions = false,
  isAdmin = false
}) => {
  // Get unique categories from products
  const categories = Array.from(new Set(products.map(p => p.category))).sort();

  const getTabProducts = (category: string) => {
    if (category === 'all') {
      return products;
    }
    return products.filter(p => p.category === category);
  };

  const renderProductGrid = (categoryProducts: Product[], currentTab: string) => {
    if (categoryProducts.length === 0) {
      return <NoProductsFound activeTab={currentTab} onAddProduct={onAddProduct} />;
    }

    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {categoryProducts.map(product => (
          <ProductCard
            key={product.id}
            product={product}
            isAdmin={isAdmin}
            onEdit={onEdit}
            onDelete={onDelete}
            showManagementActions={showManagementActions}
          />
        ))}
      </div>
    );
  };

  return (
    <Tabs value={activeTab} onValueChange={onTabChange} className="w-full">
      <TabsList className="grid w-full overflow-x-auto" style={{ gridTemplateColumns: `repeat(${categories.length + 1}, minmax(120px, 1fr))` }}>
        <TabsTrigger value="all" className="whitespace-nowrap">
          All ({categoryCounts.all || 0})
        </TabsTrigger>
        {categories.map(category => (
          <TabsTrigger key={category} value={category} className="whitespace-nowrap capitalize">
            {category} ({categoryCounts[category] || 0})
          </TabsTrigger>
        ))}
      </TabsList>

      <TabsContent value="all" className="mt-6">
        {renderProductGrid(getTabProducts('all'), 'all')}
      </TabsContent>

      {categories.map(category => (
        <TabsContent key={category} value={category} className="mt-6">
          {renderProductGrid(getTabProducts(category), category)}
        </TabsContent>
      ))}
    </Tabs>
  );
};

export default ProductTabs;
