import React, { useState, useEffect } from 'react';
import { usePOS } from '@/context/POSContext';
import { Button } from '@/components/ui/button';
import { useProducts } from '@/hooks/useProducts';
import { Product } from '@/types/pos.types';
import { Plus, RefreshCw, RotateCcw, Settings, Package, Zap, Database } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import ProductDialog from '@/components/product/ProductDialog';
import LowStockAlert from '@/components/product/LowStockAlert';
import ProductTabs from '@/components/product/ProductTabs';
import ProductSearch from '@/components/product/ProductSearch';
import ZeroStockFilter from '@/components/product/ZeroStockFilter';
import CategoryManagement from '@/components/product/CategoryManagement';
import { ProductFormState } from '@/components/product/ProductForm';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

const ProductsPage: React.FC = () => {
  const { addProduct, updateProduct, deleteProduct, products } = usePOS();
  const { resetToInitialProducts, refreshFromDB } = useProducts();
  const { toast } = useToast();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [activeTab, setActiveTab] = useState<string>('all');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [showZeroStockOnly, setShowZeroStockOnly] = useState<boolean>(false);

  // Filter and sort products based on search term, active tab, and zero stock filter
  const getFilteredAndSortedProducts = () => {
    let filtered = products.filter(product => {
      const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.category.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesZeroStock = !showZeroStockOnly || 
        (product.category !== 'membership' && product.stock === 0);
      
      return matchesSearch && matchesZeroStock;
    });

    // Sort by category when "All" tab is selected
    if (activeTab === 'all') {
      filtered = filtered.sort((a, b) => {
        if (a.category.toLowerCase() === b.category.toLowerCase()) {
          return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
        }
        return a.category.toLowerCase().localeCompare(b.category.toLowerCase());
      });
    }

    return filtered;
  };

  const filteredProducts = getFilteredAndSortedProducts();

  // Count zero stock items (excluding membership products)
  const zeroStockCount = products.filter(product => 
    product.category !== 'membership' && product.stock === 0
  ).length;

  const handleOpenDialog = () => {
    setIsEditMode(false);
    setSelectedProduct(null);
    setFormError(null);
    setIsDialogOpen(true);
  };

  const handleEditProduct = (product: Product) => {
    setIsEditMode(true);
    setSelectedProduct(product);
    setFormError(null);
    setIsDialogOpen(true);
  };

  const handleDeleteProduct = (id: string) => {
    try {
      deleteProduct(id);
      toast({
        title: 'Product Deleted',
        description: 'The product has been removed successfully.',
      });
    } catch (error) {
      console.error('Delete product error:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete product. Please try again.',
        variant: 'destructive',
      });
    }
  };

  // Define categories that shouldn't show buying/selling price fields
  const hidePricingFieldsCategories = ['membership', 'challenges'];

  const handleSubmit = async (e: React.FormEvent, formData: ProductFormState) => {
    e.preventDefault();
    
    try {
      setIsSubmitting(true);
      setFormError(null);
      
      const { 
        name, price, category, stock, originalPrice, offerPrice, 
        studentPrice, duration, membershipHours, buyingPrice, sellingPrice 
      } = formData;
      
      if (!name || !price || !category || !stock) {
        toast({
          title: 'Error',
          description: 'Please fill out all required fields',
          variant: 'destructive',
        });
        setIsSubmitting(false);
        return;
      }
      
      const productData: Omit<Product, 'id'> = {
        name,
        price: Number(price),
        category: category as string,
        stock: Number(stock),
      };
      
      // Add the new fields for buying price and profit only for applicable categories
      const shouldIncludePriceFields = !hidePricingFieldsCategories.includes(category);
      if (shouldIncludePriceFields) {
        if (buyingPrice) productData.buyingPrice = Number(buyingPrice);
        if (sellingPrice) productData.sellingPrice = Number(sellingPrice);
      }
      
      if (originalPrice) productData.originalPrice = Number(originalPrice);
      if (offerPrice) productData.offerPrice = Number(offerPrice);
      if (studentPrice) productData.studentPrice = Number(studentPrice);
      
      if (category === 'membership') {
        if (duration) productData.duration = duration as 'weekly' | 'monthly';
        if (membershipHours) productData.membershipHours = Number(membershipHours);
      }
      
      console.log('Submitting product data:', productData);
      
      if (isEditMode && selectedProduct) {
        await updateProduct({ ...productData, id: selectedProduct.id });
        toast({
          title: 'Product Updated',
          description: 'The product has been updated successfully.',
        });
        setIsDialogOpen(false);
      } else {
        await addProduct(productData);
        toast({
          title: 'Product Added',
          description: 'The product has been added successfully.',
        });
        setIsDialogOpen(false);
      }
    } catch (error) {
      console.error('Form submission error:', error);
      
      // Check if it's a duplicate product error
      if (error instanceof Error && error.message.includes('already exists')) {
        setFormError(error.message);
      } else {
        toast({
          title: 'Error',
          description: error instanceof Error ? error.message : 'Failed to save product. Please try again.',
          variant: 'destructive',
        });
        setIsDialogOpen(false);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetProducts = async () => {
    try {
      setIsResetting(true);
      await resetToInitialProducts();
      toast({
        title: 'Products Reset',
        description: 'Products have been reset to default values.',
      });
    } catch (error) {
      console.error('Error resetting products:', error);
      toast({
        title: 'Error',
        description: 'Failed to reset products. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsResetting(false);
    }
  };

  const handleRefreshProducts = async () => {
    try {
      setIsRefreshing(true);
      await refreshFromDB();
      toast({
        title: 'Products Refreshed',
        description: 'Products have been refreshed from the database.',
      });
    } catch (error) {
      console.error('Error refreshing products:', error);
      toast({
        title: 'Error',
        description: 'Failed to refresh products from database. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  const getCategoryCounts = () => {
    const counts: Record<string, number> = { all: filteredProducts.length };
    filteredProducts.forEach(product => {
      counts[product.category] = (counts[product.category] || 0) + 1;
    });
    return counts;
  };

  const categoryCounts = getCategoryCounts();

  useEffect(() => {
    console.log('Products component rendered with', products.length, 'products');
  }, [products]);

  return (
    <div className="container mx-auto px-4 py-6 bg-gradient-to-br from-cuephoria-darker via-cuephoria-dark to-cuephoria-darker min-h-screen relative">
      {/* Futuristic background effects */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full bg-cyber-grid bg-cyber-grid opacity-20"></div>
        <div className="absolute top-1/4 right-1/3 w-80 h-80 bg-cuephoria-neon-purple/3 rounded-full blur-3xl animate-breathe"></div>
        <div className="absolute bottom-1/3 left-1/4 w-72 h-72 bg-cuephoria-neon-cyan/3 rounded-full blur-3xl animate-pulse-soft"></div>
      </div>

      <div className="relative z-10">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4 animate-slide-up">
          <div className="relative">
            <h2 className="text-4xl font-bold tracking-tight hologram-text animate-cyber-glow">
              <Package className="inline-block w-10 h-10 mr-3 text-cuephoria-neon-cyan animate-float" />
              Quantum Inventory
            </h2>
            <div className="h-1 w-48 bg-gradient-to-r from-cuephoria-neon-cyan via-cuephoria-neon-purple to-cuephoria-neon-pink mt-3 rounded-full animate-shimmer"></div>
          </div>
          <div className="flex flex-wrap gap-3">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" className="h-12 cyber-button border-cuephoria-neon-purple/30">
                  <Settings className="h-4 w-4 mr-2 animate-spin-slow" /> 
                  Neural Categories
                </Button>
              </SheetTrigger>
              <SheetContent className="cyber-card border-cuephoria-neon-purple/30">
                <SheetHeader>
                  <SheetTitle className="hologram-text">Category Matrix</SheetTitle>
                  <SheetDescription className="text-cuephoria-neon-purple/70">
                    Configure product classification protocols.
                  </SheetDescription>
                </SheetHeader>
                <div className="mt-6">
                  <CategoryManagement />
                </div>
              </SheetContent>
            </Sheet>
            
            <Button onClick={handleRefreshProducts} variant="outline" disabled={isRefreshing} className="h-12 cyber-button border-cuephoria-neon-cyan/30">
              <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : 'animate-pulse'}`} /> 
              <span className="font-mono">SYNC DB</span>
            </Button>
            <Button onClick={handleResetProducts} variant="outline" disabled={isResetting} className="h-12 cyber-button border-cuephoria-neon-orange/30">
              <RotateCcw className={`h-4 w-4 mr-2 ${isResetting ? 'animate-spin' : ''}`} /> 
              <span className="font-mono">RESET</span>
            </Button>
            <Button onClick={handleOpenDialog} className="h-12 bg-gradient-to-r from-cuephoria-neon-purple/20 to-cuephoria-neon-cyan/20 border border-cuephoria-neon-purple/40 hover:from-cuephoria-neon-purple/30 hover:to-cuephoria-neon-cyan/30 transition-all duration-300 animate-pulse-cyber">
              <Plus className="h-4 w-4 mr-2" /> 
              <span className="font-mono">ADD PRODUCT</span>
            </Button>
          </div>
        </div>

        <ProductDialog
          isOpen={isDialogOpen}
          onOpenChange={setIsDialogOpen}
          isEditMode={isEditMode}
          selectedProduct={selectedProduct}
          onSubmit={handleSubmit}
          isSubmitting={isSubmitting}
        />

        <div className="mb-8 animate-slide-up" style={{animationDelay: '0.1s'}}>
          <LowStockAlert products={products} />
        </div>
        
        <div className="cyber-card circuit-border p-6 animate-slide-up" style={{animationDelay: '0.2s'}}>
          <div className="mb-8 space-y-6">
            <div className="scanner-line">
              <ProductSearch
                searchTerm={searchTerm}
                onSearchChange={setSearchTerm}
                placeholder="Search quantum database..."
              />
            </div>
            
            {zeroStockCount > 0 && (
              <div className="animate-fade-in">
                <ZeroStockFilter
                  showZeroStockOnly={showZeroStockOnly}
                  onToggle={setShowZeroStockOnly}
                  zeroStockCount={zeroStockCount}
                />
              </div>
            )}
          </div>

          <div className="data-grid">
            <ProductTabs
              products={filteredProducts}
              activeTab={activeTab}
              onTabChange={setActiveTab}
              categoryCounts={getCategoryCounts()}
              onEdit={handleEditProduct}
              onDelete={handleDeleteProduct}
              onAddProduct={handleOpenDialog}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductsPage;
