import React, { useState, useEffect, useMemo } from 'react';
import { Product } from '@/types/pos.types';
import { supabase, handleSupabaseError, convertFromSupabaseProduct, convertToSupabaseProduct } from "@/integrations/supabase/client";
import { scopedTable, f } from '@/services/coreOpsClient';
import { useToast } from '@/hooks/use-toast';
import { generateId } from '@/utils/pos.utils';
import { getCachedData, saveToCache, isCacheStale, invalidateCache, CACHE_KEYS, cacheKeyWithLocation } from '@/utils/dataCache';
import { deleteViaAdminApi } from '@/services/adminRecordsApi';
import { useLocation } from '@/context/LocationContext';

export const useProducts = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const { activeLocationId, loading: locationsLoading } = useLocation();
  const productsCacheKey = useMemo(
    () => cacheKeyWithLocation(CACHE_KEYS.PRODUCTS, activeLocationId),
    [activeLocationId]
  );
  
  const lowStockProducts = products.filter(p => p.stock < 5 && p.category !== 'membership');
  
  useEffect(() => {
    if (locationsLoading) return;

    console.log('useProducts initialized with', products.length, 'products');
    
    const loadProducts = async () => {
      // ✅ Check cache first
      const cachedProducts = getCachedData<Product[]>(productsCacheKey);
      
      if (cachedProducts && cachedProducts.length > 0) {
        console.log('📦 Using cached products');
        setProducts(cachedProducts);
        setLoading(false);
        
        // Background refresh if cache is stale
        if (isCacheStale(productsCacheKey)) {
          refreshFromDB(true).catch(err => {
            console.error('Error refreshing products in background:', err);
          });
        }
        return;
      }
      
      // Load from database
      await refreshFromDB(false);
    };
    
    loadProducts();
  }, [activeLocationId, productsCacheKey, locationsLoading]);
  
  const isProductDuplicate = (productName: string, excludeId?: string): boolean => {
    return products.some(p => 
      p.name.toLowerCase() === productName.toLowerCase() && 
      (!excludeId || p.id !== excludeId)
    );
  };
  
  const addProduct = (product: Omit<Product, 'id'>) => {
    try {
      if (!activeLocationId) {
        toast({
          title: 'Error',
          description: 'Select a branch before adding products.',
          variant: 'destructive',
        });
        throw new Error('No branch selected');
      }

      if (isProductDuplicate(product.name)) {
        toast({
          title: 'Error',
          description: `A product with name "${product.name}" already exists`,
          variant: 'destructive'
        });
        throw new Error(`Product "${product.name}" already exists`);
      }
      
      const newProductId = generateId();
      const newProduct: Product = {
        ...product,
        id: newProductId,
        sellingPrice: product.sellingPrice || product.price,
        // Note: profit will be calculated by the database trigger
      };
      
      setProducts(prev => [...prev, newProduct]);
      
      // ✅ Invalidate cache
      invalidateCache(productsCacheKey);
      
      scopedTable('products', activeLocationId!)
        .insert({
          ...convertToSupabaseProduct(newProduct),
        })
        .then(({ error }) => {
          if (error) {
            console.error('Error adding product to DB:', error);
            setError(`Failed to add product to database: ${error.message}`);
            toast({
              title: 'Database Error',
              description: `Product added locally but failed to sync with database: ${error.message}`,
              variant: 'destructive'
            });
          } else {
            console.log('Product added to DB:', newProduct.name);
            // Update cache after successful DB insert
            setProducts(prev => {
              const updated = [...prev];
              saveToCache(productsCacheKey, updated);
              return updated;
            });
          }
        });
      
      toast({
        title: 'Success',
        description: 'Product added successfully',
      });
      
      return newProduct;
    } catch (error) {
      console.error('Error adding product:', error);
      
      if (!(error instanceof Error && error.message.includes('already exists'))) {
        toast({
          title: 'Error',
          description: error instanceof Error ? error.message : 'Failed to add product',
          variant: 'destructive'
        });
      }
      
      setError(error instanceof Error ? error.message : 'Unknown error adding product');
      throw error;
    }
  };
  
  const updateProduct = (product: Product) => {
    try {
      if (isProductDuplicate(product.name, product.id)) {
        toast({
          title: 'Error',
          description: `Another product with name "${product.name}" already exists`,
          variant: 'destructive'
        });
        throw new Error(`Another product named "${product.name}" already exists`);
      }
      
      // Ensure selling price is set to price if not provided
      const updatedProduct = {
        ...product,
        sellingPrice: product.sellingPrice || product.price,
        // Note: profit will be calculated by the database trigger
      };
      
      setProducts(prev => {
        const updated = prev.map(p => p.id === updatedProduct.id ? updatedProduct : p);
        // ✅ Update cache
        saveToCache(productsCacheKey, updated);
        return updated;
      });
      
      // ✅ Invalidate cache
      invalidateCache(productsCacheKey);
      
      scopedTable('products', activeLocationId!)
        .update(convertToSupabaseProduct(updatedProduct), {
          filters: [f.eq('id', updatedProduct.id)],
        })
        .then(({ error }) => {
          if (error) {
            console.error('Error updating product in DB:', error);
            setError(`Failed to update product in database: ${error.message}`);
            toast({
              title: 'Database Sync Error',
              description: `Product updated locally but failed to sync with database: ${error.message}`,
              variant: 'destructive'
            });
            return scopedTable('products', activeLocationId!).insert({
              ...convertToSupabaseProduct(updatedProduct),
            });
          } else {
            console.log('Product updated in DB:', updatedProduct.name);
            // Update cache after successful DB update
            setProducts(prev => {
              const updated = prev.map(p => p.id === updatedProduct.id ? updatedProduct : p);
              saveToCache(productsCacheKey, updated);
              return updated;
            });
          }
        })
        .then(result => {
          if (result?.error) {
            console.error('Error inserting product after update failure:', result.error);
            setError(`Failed to insert product after update failure: ${result.error.message}`);
          }
        });
      
      toast({
        title: 'Success',
        description: 'Product updated successfully',
      });
      
      return updatedProduct;
    } catch (error) {
      console.error('Error updating product:', error);
      
      if (!(error instanceof Error && error.message.includes('already exists'))) {
        toast({
          title: 'Error',
          description: error instanceof Error ? error.message : 'Failed to update product',
          variant: 'destructive'
        });
      }
      
      setError(error instanceof Error ? error.message : 'Unknown error updating product');
      throw error;
    }
  };
  
  const deleteProduct = (id: string) => {
    try {
      setProducts(prev => {
        const updated = prev.filter(p => p.id !== id);
        // ✅ Update cache
        saveToCache(productsCacheKey, updated);
        return updated;
      });
      
      // ✅ Invalidate cache
      invalidateCache(productsCacheKey);

      void (async () => {
        const server = await deleteViaAdminApi({
          type: 'product',
          id,
          locationId: activeLocationId!,
        });
        if (server.ok) {
          console.log('Product deleted via server API:', id);
          toast({
            title: 'Success',
            description: 'Product deleted successfully',
          });
          return;
        }
        toast({
          title: 'Delete failed',
          description: server.error || 'Could not delete product on the server.',
          variant: 'destructive',
        });
        void refreshFromDB(true);
      })();
    } catch (error) {
      console.error('Error deleting product:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to delete product',
        variant: 'destructive'
      });
      setError(error instanceof Error ? error.message : 'Unknown error deleting product');
      throw error;
    }
  };
  
  const resetToInitialProducts = () => {
    setProducts([]);
    setError(null);
    console.log('Reset to empty products array');
    return [];
  };
  
  const refreshFromDB = async (silent: boolean = false) => {
    try {
      if (!activeLocationId) {
        setProducts([]);
        if (!silent) setLoading(false);
        return [];
      }

      if (!silent) {
        setLoading(true);
        setError(null);
      }
      
      // ✅ OPTIMIZED: Select only needed columns
      const selectFields = 'id,name,category,price,buying_price,selling_price,profit,stock,image,original_price,offer_price,student_price,duration,membership_hours,membership_tier_id,created_at';
      
      // Fetch all products using parallel page batches
      let page = 0;
      const pageSize = 1000;
      const PARALLEL_PAGES = 1;
      let allProductsData: any[] = [];
      let finished = false;
      let firstBatchPainted = false;

      const fetchProductsPage = async (p: number) => {
        const rangeFrom = p * pageSize;
        const rangeTo = (p + 1) * pageSize - 1;
        const orderOpts = {
          order: { column: 'created_at', ascending: false } as const,
          range: [rangeFrom, rangeTo] as [number, number],
        };

        const { data, error } = await supabase
          .from('products')
          .select(selectFields)
          .eq('location_id', activeLocationId)
          .order('created_at', { ascending: false })
          .range(rangeFrom, rangeTo);

        if (!error) {
          return { data, error: null };
        }

        return scopedTable('products', activeLocationId).select(selectFields, orderOpts);
      };

      while (!finished) {
        const pagesToFetch = Array.from({ length: PARALLEL_PAGES }, (_, i) => page + i);
        const results = await Promise.all(pagesToFetch.map(p => fetchProductsPage(p)));

        const batchError = results.find(r => r.error)?.error;
        if (batchError) {
          console.error('Error fetching products:', batchError);
          if (!silent) {
            setError(`Failed to fetch products: ${batchError.message}`);
            toast({
              title: 'Error',
              description: 'Failed to fetch products from database',
              variant: 'destructive'
            });
          }
          return products;
        }

        let batchRows: any[] = [];
        for (const result of results) {
          const data = result.data;
          if (!data || data.length === 0) {
            finished = true;
            break;
          }
          batchRows = batchRows.concat(data);
          if (data.length < pageSize) {
            finished = true;
            break;
          }
        }

        if (batchRows.length === 0) {
          finished = true;
          break;
        }

        allProductsData = allProductsData.concat(batchRows);

        if (!firstBatchPainted && !silent) {
          firstBatchPainted = true;
          setProducts(batchRows.map(convertFromSupabaseProduct));
          setLoading(false);
        }

        page += pagesToFetch.length;
      }
      
      if (allProductsData.length > 0) {
        const dbProducts = allProductsData.map(convertFromSupabaseProduct);
        
        const uniqueProductsById = new Map<string, Product>();
        const duplicates: string[] = [];
        
        dbProducts.forEach(product => {
          if (!uniqueProductsById.has(product.id)) {
            const productNameLower = product.name.toLowerCase();
            const duplicateByName = Array.from(uniqueProductsById.values()).find(
              p => p.name.toLowerCase() === productNameLower && p.id !== product.id
            );
            
            if (duplicateByName) {
              duplicates.push(`${product.name} (ID: ${product.id})`);
            } else {
              uniqueProductsById.set(product.id, product);
            }
          }
        });
        
        if (duplicates.length > 0) {
          const duplicateNames = duplicates.slice(0, 3).join(', ') + 
            (duplicates.length > 3 ? ` and ${duplicates.length - 3} more` : '');
          
          toast({
            title: 'Duplicate Products Removed',
            description: `${duplicates.length} duplicate products were found and removed: ${duplicateNames}`,
            variant: "default"
          });
          
          console.warn('Duplicate products removed:', duplicates);
        }
        
        const allProducts = Array.from(uniqueProductsById.values());
        setProducts(allProducts);
        console.log('✅ Refreshed from DB:', allProducts.length);
        
        // ✅ Save to cache
        saveToCache(productsCacheKey, allProducts);
        
        return allProducts;
      } else {
        console.log('No products in DB, using empty products array');
        if (!silent) {
          toast({
            title: 'Info',
            description: 'No products found in database.',
          });
        }
        
        const emptyProducts = resetToInitialProducts();
        saveToCache(productsCacheKey, emptyProducts);
        return emptyProducts;
      }
    } catch (error) {
      console.error('Error refreshing products:', error);
      if (!silent) {
        setError(error instanceof Error ? error.message : 'Unknown error refreshing products');
        toast({
          title: 'Error',
          description: 'An error occurred while refreshing products',
          variant: 'destructive'
        });
      }
      return products;
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  };
  
  const displayLowStockWarning = () => {
    toast({
      title: "Low Stock Alert",
      description: `You have ${lowStockProducts.length} products with low stock levels.`,
      variant: "destructive"
    });
  };
  
  return {
    products,
    loading,
    error,
    setProducts,
    addProduct,
    updateProduct,
    deleteProduct,
    resetToInitialProducts,
    refreshFromDB,
    displayLowStockWarning
  };
};

export default useProducts;
