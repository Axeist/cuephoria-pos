import React, { useState, useEffect } from 'react';
import { usePOS } from '@/context/POSContext';
import { Button } from '@/components/ui/button';
import { useProducts } from '@/hooks/useProducts';
import { Product } from '@/types/pos.types';
import { Plus, Settings, History } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import ProductDialog from '@/components/product/ProductDialog';
import { ProductFormState } from '@/components/product/ProductForm';
import LowStockAlert from '@/components/product/LowStockAlert';
import ProductTabs from '@/components/product/ProductTabs';
import ProductSearch from '@/components/product/ProductSearch';
import ZeroStockFilter from '@/components/product/ZeroStockFilter';
import CategoryManagement from '@/components/product/CategoryManagement';
import StockValueWidget from '@/components/product/StockValueWidget';
import ProductSalesWidget from '@/components/product/ProductSalesWidget';
import ProductProfitWidget from '@/components/product/ProductProfitWidget';
import ProductSalesExport from '@/components/product/ProductSalesExport';
import StockExport from '@/components/product/StockExport';
import { usePinVerification } from '@/hooks/usePinVerification';
import PinVerificationDialog from '@/components/PinVerificationDialog';
import { useAuth } from '@/context/AuthContext';
import AdvancedFilters from '@/components/product/AdvancedFilters';
import StockLogsViewer from '@/components/product/StockLogsViewer';
import { FilterOptions } from '@/types/stockLog.types';
import { createStockLog, saveStockLog } from '@/utils/stockLogger';
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
  const { user } = useAuth();
  const isAdmin = user?.isAdmin || false;
  const { showPinDialog, requestPinVerification, handlePinSuccess, handlePinCancel } = usePinVerification();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [activeTab, setActiveTab] = useState<string>('all');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [showZeroStockOnly, setShowZeroStockOnly] = useState<boolean>(false);
  
  // Advanced filters state
  const [advancedFilters, setAdvancedFilters] = useState<FilterOptions>({});

  // Filter and sort products based on all filters
  const getFilteredAndSortedProducts = () => {
    let filtered = products.filter(product => {
      // Search filter
      const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.category.toLowerCase().includes(searchTerm.toLowerCase());
      
      // Zero stock filter
      const matchesZeroStock = !showZeroStockOnly || 
        (product.category !== 'membership' && product.stock === 0);
      
      // Advanced stock status filter (multi-select)
      let matchesStockStatus = true;
      if (advancedFilters.stockStatuses && advancedFilters.stockStatuses.length > 0) {
        matchesStockStatus = advancedFilters.stockStatuses.some(status => {
          switch (status) {
            case 'in-stock':
              return product.stock >= 2;
            case 'low-stock':
              return product.stock === 1;
            case 'out-of-stock':
              return product.stock === 0 && product.category !== 'membership';
            default:
              return false;
          }
        });
      }
      
      return matchesSearch && matchesZeroStock && matchesStockStatus;
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
      
      if (!name || !price || !category || stock === undefined) {
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
        // Log stock changes
        if (selectedProduct.stock !== Number(stock)) {
          const stockLog = createStockLog(
            { ...selectedProduct, ...productData, id: selectedProduct.id },
            selectedProduct.stock,
            Number(stock),
            Number(stock) > selectedProduct.stock ? 'addition' : 'deduction',
            user?.name || user?.email || 'Unknown User',
            'Stock updated via product edit'
          );
          saveStockLog(stockLog);
        }

        await updateProduct({ ...productData, id: selectedProduct.id });
        toast({
          title: 'Product Updated',
          description: 'The product has been updated successfully.',
        });
        setIsDialogOpen(false);
      } else {
        const newProduct = await addProduct(productData);
        
        // Log initial stock
        if (newProduct && Number(stock) > 0) {
          const stockLog = createStockLog(
            newProduct as Product,
            0,
            Number(stock),
            'initial',
            user?.name || user?.email || 'Unknown User',
            'Initial stock added'
          );
          saveStockLog(stockLog);
        }

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
    <div className="container mx-auto px-4 py-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
        <h2 className="text-3xl font-bold tracking-tight gradient-text font-heading">Products</h2>
        <div className="flex flex-wrap gap-2">
          <ProductSalesExport />
          <StockExport />
          
          {/* Stock Logs Viewer Button */}
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" className="h-10">
                <History className="h-4 w-4 mr-2" /> 
                Stock Logs
              </Button>
            </SheetTrigger>
            <SheetContent className="w-[90vw] sm:w-[800px] sm:max-w-[90vw]">
              <SheetHeader>
                <SheetTitle>Stock Change Logs</SheetTitle>
                <SheetDescription>
                  View and manage all stock changes
                </SheetDescription>
              </SheetHeader>
              <div className="mt-6">
                <StockLogsViewer />
              </div>
            </SheetContent>
          </Sheet>
          
          {/* Category Management Button */}
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" className="h-10">
                <Settings className="h-4 w-4 mr-2" /> 
                Categories
              </Button>
            </SheetTrigger>
            <SheetContent>
              <SheetHeader>
                <SheetTitle>Category Management</SheetTitle>
                <SheetDescription>
                  Add, edit, or remove product categories.
                </SheetDescription>
              </SheetHeader>
              <div className="mt-6">
                <CategoryManagement />
              </div>
            </SheetContent>
          </Sheet>
          
          {/* Add Product Button */}
          <Button onClick={handleOpenDialog} className="h-10">
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

      <PinVerificationDialog
        open={showPinDialog}
        onOpenChange={handlePinCancel}
        onSuccess={handlePinSuccess}
        title="Verify PIN to Delete"
        description="Enter the PIN to confirm this delete operation."
      />

      {/* Product Widgets Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <StockValueWidget />
        <ProductSalesWidget />
        <ProductProfitWidget />
      </div>

      <div className="mb-6">
        <LowStockAlert products={products} />
      </div>
      
      <div className="bg-card rounded-lg shadow-sm p-4">
        {/* Search Bar, Advanced Filters, and Zero Stock Filter */}
        <div className="mb-6 space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <ProductSearch
                searchTerm={searchTerm}
                onSearchChange={setSearchTerm}
                placeholder="Search products by name or category..."
              />
            </div>
            <AdvancedFilters
              currentFilters={advancedFilters}
              onFilterChange={setAdvancedFilters}
            />
          </div>
          
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
          showManagementActions={true}
          isAdmin={isAdmin}
        />
      </div>
    </div>
  );
};

export default ProductsPage;
