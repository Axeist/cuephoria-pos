
import React, { useState, useEffect } from 'react';
import { usePOS } from '@/context/POSContext';
import { Button } from '@/components/ui/button';
import { useProducts } from '@/hooks/useProducts';
import { Product } from '@/types/pos.types';
import { Plus, RefreshCw, RotateCcw, Settings, Package, Zap } from 'lucide-react';
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
        variant: 'success',
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
          variant: 'success',
        });
        setIsDialogOpen(false);
      } else {
        await addProduct(productData);
        toast({
          title: 'Product Added',
          description: 'The product has been added successfully.',
          variant: 'success',
        });
        setIsDialogOpen(false);
      }
    } catch (error) {
      console.error('Form submission error:', error);
      
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
        variant: 'success',
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
        variant: 'success',
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
    <div className="min-h-screen circuit-pattern">
      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4 animate-slide-in-top">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-cyber-purple to-neon-blue flex items-center justify-center animate-cyber-pulse">
              <Package className="h-6 w-6 text-white" />
            </div>
            <h2 className="text-4xl font-bold holographic-text font-orbitron">Products</h2>
            <Zap className="h-6 w-6 text-neon-orange animate-pulse" />
          </div>
          
          <div className="flex flex-wrap gap-3 animate-slide-in-right">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" className="gaming-button h-10 font-rajdhani">
                  <Settings className="h-4 w-4 mr-2" /> 
                  Categories
                </Button>
              </SheetTrigger>
              <SheetContent className="gaming-sidebar">
                <SheetHeader>
                  <SheetTitle className="font-orbitron text-white">Category Management</SheetTitle>
                  <SheetDescription className="font-rajdhani text-gray-300">
                    Add, edit, or remove product categories.
                  </SheetDescription>
                </SheetHeader>
                <div className="mt-6">
                  <CategoryManagement />
                </div>
              </SheetContent>
            </Sheet>
            
            <Button 
              onClick={handleRefreshProducts} 
              variant="outline" 
              disabled={isRefreshing} 
              className="gaming-button h-10 font-rajdhani"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} /> 
              Refresh DB
            </Button>
            
            <Button 
              onClick={handleResetProducts} 
              variant="outline" 
              disabled={isResetting} 
              className="gaming-button h-10 font-rajdhani"
            >
              <RotateCcw className={`h-4 w-4 mr-2 ${isResetting ? 'animate-spin' : ''}`} /> 
              Reset
            </Button>
            
            <Button 
              onClick={handleOpenDialog} 
              className="gaming-button h-10 font-rajdhani bg-gradient-to-r from-cyber-purple to-neon-blue hover:opacity-90"
            >
              <Plus className="h-4 w-4 mr-2" /> Add Product
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

        <div className="mb-6 animate-slide-in-left">
          <LowStockAlert products={products} />
        </div>
        
        <div className="cyber-card rounded-xl shadow-2xl p-6 animate-fade-in-scale">
          <div className="mb-6 space-y-4">
            <ProductSearch
              searchTerm={searchTerm}
              onSearchChange={setSearchTerm}
              placeholder="Search products by name or category..."
            />
            
            {zeroStockCount > 0 && (
              <ZeroStockFilter
                showZeroStockOnly={showZeroStockOnly}
                onToggle={setShowZeroStockOnly}
                zeroStockCount={zeroStockCount}
              />
            )}
          </div>

          <ProductTabs
            products={filteredProducts}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            categoryCounts={categoryCounts}
            onEdit={handleEditProduct}
            onDelete={handleDeleteProduct}
            onAddProduct={handleOpenDialog}
          />
        </div>
      </div>
    </div>
  );
};

export default ProductsPage;
