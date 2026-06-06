import React, { useMemo, useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { usePOS, Customer, Station, Product } from '@/context/POSContext';
import { CurrencyDisplay } from '@/components/ui/currency';
import { getCartItemDisplayName } from '@/utils/cartItem.utils';
import {
  getCategoryCardStyle,
  getCategoryChipStyle,
  hexWithAlpha,
} from '@/utils/colorTheme.utils';
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from '@/components/ui/responsive-dialog';
import { Minus, Plus, Search, ShoppingBag, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getStationTheme } from '@/utils/stationTheme';

type QuickShopTab = 'products' | 'order';

interface StationQuickShopDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  station: Station;
  customer: Customer | null;
  sessionId: string;
  initialTab?: QuickShopTab;
}

const StationQuickShopDialog: React.FC<StationQuickShopDialogProps> = ({
  open,
  onOpenChange,
  station,
  customer,
  sessionId,
  initialTab = 'products',
}) => {
  const {
    products,
    categories,
    categoryMeta,
    getCategoryAccentColor,
    isCategoryInQuickShop,
    getStationQuickShopItems,
    addToStationQuickShop,
    updateStationQuickShopQuantity,
    removeFromStationQuickShop,
  } = usePOS();
  const { toast } = useToast();
  const stationTheme = getStationTheme(station);
  const accentHex = stationTheme.accentHex;
  const [activeTab, setActiveTab] = useState<QuickShopTab>(initialTab);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  useEffect(() => {
    if (open) {
      setActiveTab(initialTab);
    }
  }, [open, initialTab]);

  const orderItems = getStationQuickShopItems(sessionId);
  const orderCount = orderItems.reduce((sum, item) => sum + item.quantity, 0);
  const orderTotal = orderItems.reduce((sum, item) => sum + item.total, 0);

  const quickShopCategories = useMemo(() => {
    const fromProducts = new Set(
      products
        .filter((p) => p.stock > 0 && isCategoryInQuickShop(p.category))
        .map((p) => p.category.toLowerCase())
    );
    return categories.filter(
      (cat) => fromProducts.has(cat.toLowerCase()) && isCategoryInQuickShop(cat)
    );
  }, [products, categories, isCategoryInQuickShop]);

  const availableProducts = useMemo(
    () =>
      products.filter(
        (product) => product.stock > 0 && isCategoryInQuickShop(product.category)
      ),
    [products, isCategoryInQuickShop]
  );

  const filteredProducts = useMemo(() => {
    let list = availableProducts;
    if (categoryFilter !== 'all') {
      list = list.filter(
        (product) => product.category.toLowerCase() === categoryFilter.toLowerCase()
      );
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((product) => product.name.toLowerCase().includes(q));
    }
    return list.sort((a, b) => a.name.localeCompare(b.name));
  }, [availableProducts, categoryFilter, searchQuery]);

  const getQtyInOrder = (productId: string) =>
    orderItems.find((item) => item.id === productId)?.quantity ?? 0;

  const getRemainingStock = (product: Product) => {
    const inOrder = getQtyInOrder(product.id);
    return Math.max(0, product.stock - inOrder);
  };

  const handleAddProduct = (product: Product) => {
    const remaining = getRemainingStock(product);
    if (remaining <= 0) {
      toast({
        title: 'Out of stock',
        description: `No more ${product.name} available for this order.`,
        variant: 'destructive',
      });
      return;
    }

    addToStationQuickShop(sessionId, product, 1, station.name);
    toast({
      title: 'Added',
      description: `${product.name} added to ${station.name} order.`,
    });
  };

  const tabActiveStyle = {
    borderColor: accentHex,
    color: accentHex,
  };

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange} mobileVariant="sheet-bottom">
      <ResponsiveDialogContent
        className="max-w-4xl max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden"
        mobileClassName="px-0 pt-2 pb-0"
      >
        <ResponsiveDialogHeader className="px-4 sm:px-6 pt-4 sm:pt-6 pb-3 border-b border-white/10 shrink-0">
          <ResponsiveDialogTitle className="flex items-center gap-2 text-lg sm:text-xl">
            <ShoppingBag className="h-5 w-5" style={{ color: accentHex }} />
            Quick Shop — {station.name}
          </ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            {customer
              ? `Add products for ${customer.name}. Items stay on this station until the session ends.`
              : 'Add items for this active session.'}
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>

        <div className="flex border-b border-white/10 px-4 sm:px-6 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('products')}
            className="px-4 py-2.5 text-sm font-medium border-b-2 transition-colors border-transparent text-muted-foreground hover:text-white"
            style={activeTab === 'products' ? tabActiveStyle : undefined}
          >
            Products
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('order')}
            className="px-4 py-2.5 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 border-transparent text-muted-foreground hover:text-white"
            style={activeTab === 'order' ? tabActiveStyle : undefined}
          >
            Station Order
            {orderCount > 0 && (
              <span
                className="rounded-full text-xs px-2 py-0.5"
                style={{
                  backgroundColor: hexWithAlpha(accentHex, 0.2),
                  color: accentHex,
                }}
              >
                {orderCount}
              </span>
            )}
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
          {activeTab === 'products' ? (
            <>
              <div className="px-4 sm:px-6 py-3 space-y-3 shrink-0 border-b border-white/5">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search products..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8 h-9"
                  />
                </div>
                <div className="flex gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setCategoryFilter('all')}
                    className="text-xs px-3 py-1.5 rounded-lg font-medium capitalize transition-colors border bg-white/5 text-muted-foreground hover:text-white border-transparent"
                    style={getCategoryChipStyle('all', accentHex, categoryFilter === 'all')}
                  >
                    All
                  </button>
                  {quickShopCategories.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setCategoryFilter(cat)}
                      className="text-xs px-3 py-1.5 rounded-lg font-medium capitalize transition-colors border bg-white/5 text-muted-foreground hover:text-white border-transparent"
                      style={getCategoryChipStyle(
                        cat,
                        categoryMeta[cat]?.accentColor ?? getCategoryAccentColor(cat),
                        categoryFilter === cat
                      )}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-3">
                {filteredProducts.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {filteredProducts.map((product) => {
                      const inOrder = getQtyInOrder(product.id);
                      const remaining = getRemainingStock(product);
                      const catHex = getCategoryAccentColor(product.category);
                      const cardStyle = getCategoryCardStyle(
                        product.category,
                        categoryMeta[product.category.toLowerCase()]?.accentColor
                      );
                      return (
                        <div
                          key={product.id}
                          className="flex items-center justify-between gap-3 rounded-lg border p-3"
                          style={cardStyle}
                        >
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-sm truncate">{product.name}</p>
                            <p
                              className="text-xs capitalize"
                              style={{ color: hexWithAlpha(catHex, 0.85) }}
                            >
                              {product.category}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              <span style={{ color: catHex }}>
                                <CurrencyDisplay amount={product.price} className="text-sm font-medium" />
                              </span>
                              <span className="text-[10px] text-muted-foreground">
                                {remaining} left
                              </span>
                              {inOrder > 0 && (
                                <span className="text-[10px]" style={{ color: catHex }}>
                                  · {inOrder} in order
                                </span>
                              )}
                            </div>
                          </div>
                          <Button
                            size="sm"
                            disabled={remaining <= 0}
                            className="shrink-0 text-white border-0"
                            style={{ backgroundColor: catHex }}
                            onClick={() => handleAddProduct(product)}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                    <ShoppingBag className="h-10 w-10 mb-3 opacity-40" />
                    <p className="text-sm">No products match your search.</p>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-3">
              {orderItems.length > 0 ? (
                <div className="space-y-2">
                  {orderItems.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/[0.03] p-3"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-sm truncate">{getCartItemDisplayName(item)}</p>
                        <CurrencyDisplay amount={item.price} className="text-xs text-muted-foreground" />
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() =>
                            updateStationQuickShopQuantity(sessionId, item.id, item.quantity - 1)
                          }
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </Button>
                        <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => {
                            const product = products.find((p) => p.id === item.id);
                            if (product && getRemainingStock(product) <= 0) {
                              toast({
                                title: 'Stock limit',
                                description: `Cannot add more ${item.name}.`,
                                variant: 'destructive',
                              });
                              return;
                            }
                            updateStationQuickShopQuantity(
                              sessionId,
                              item.id,
                              item.quantity + 1,
                              product
                            );
                          }}
                          disabled={
                            (() => {
                              const product = products.find((p) => p.id === item.id);
                              return product ? getRemainingStock(product) <= 0 : false;
                            })()
                          }
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-red-400 hover:text-red-300"
                          onClick={() => removeFromStationQuickShop(sessionId, item.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                      <CurrencyDisplay amount={item.total} className="text-sm font-medium w-16 text-right shrink-0" />
                    </div>
                  ))}
                  <div className="flex justify-between items-center pt-3 border-t border-white/10 mt-2">
                    <span className="font-medium">Order total</span>
                    <span style={{ color: accentHex }}>
                      <CurrencyDisplay amount={orderTotal} className="text-lg font-bold" />
                    </span>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <ShoppingBag className="h-10 w-10 mb-3 opacity-40" />
                  <p className="text-sm mb-3">No items added yet.</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setActiveTab('products')}
                    style={{
                      borderColor: hexWithAlpha(accentHex, 0.35),
                      color: accentHex,
                    }}
                  >
                    Browse products
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>

        <ResponsiveDialogFooter className="px-4 sm:px-6 py-3 border-t border-white/10 shrink-0 flex-row justify-between sm:justify-between gap-2">
          <div className="text-sm text-muted-foreground">
            {orderCount > 0 ? (
              <span>
                {orderCount} item{orderCount !== 1 ? 's' : ''} ·{' '}
                <span style={{ color: accentHex }}>
                  <CurrencyDisplay amount={orderTotal} className="inline" />
                </span>
              </span>
            ) : (
              'Nothing added yet'
            )}
          </div>
          <Button
            onClick={() => onOpenChange(false)}
            className="text-white border-0"
            style={{ backgroundColor: accentHex }}
          >
            Done
          </Button>
        </ResponsiveDialogFooter>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
};

export default StationQuickShopDialog;
