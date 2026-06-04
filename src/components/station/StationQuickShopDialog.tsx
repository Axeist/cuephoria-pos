import React, { useMemo, useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { usePOS, Customer, Station, Product } from '@/context/POSContext';
import { CurrencyDisplay } from '@/components/ui/currency';
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

type QuickShopTab = 'products' | 'order';

interface StationQuickShopDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  station: Station;
  customer: Customer | null;
  sessionId: string;
  initialTab?: QuickShopTab;
}

const QUICK_SHOP_CATEGORIES = new Set(['food', 'drinks']);

const StationQuickShopDialog: React.FC<StationQuickShopDialogProps> = ({
  open,
  onOpenChange,
  station,
  customer,
  sessionId,
  initialTab = 'products',
}) => {
  const { products, getStationQuickShopItems, addToStationQuickShop, updateStationQuickShopQuantity, removeFromStationQuickShop } = usePOS();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<QuickShopTab>(initialTab);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'food' | 'drinks'>('all');

  useEffect(() => {
    if (open) {
      setActiveTab(initialTab);
    }
  }, [open, initialTab]);

  const orderItems = getStationQuickShopItems(sessionId);
  const orderCount = orderItems.reduce((sum, item) => sum + item.quantity, 0);
  const orderTotal = orderItems.reduce((sum, item) => sum + item.total, 0);

  const availableProducts = useMemo(
    () =>
      products.filter(
        (product) =>
          QUICK_SHOP_CATEGORIES.has(product.category) && product.stock > 0
      ),
    [products]
  );

  const filteredProducts = useMemo(() => {
    let list = availableProducts;
    if (categoryFilter !== 'all') {
      list = list.filter((product) => product.category === categoryFilter);
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

    addToStationQuickShop(sessionId, product, 1);
    toast({
      title: 'Added',
      description: `${product.name} added to ${station.name} order.`,
    });
  };

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange} mobileVariant="sheet-bottom">
      <ResponsiveDialogContent
        className="max-w-4xl max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden"
        mobileClassName="px-0 pt-2 pb-0"
      >
        <ResponsiveDialogHeader className="px-4 sm:px-6 pt-4 sm:pt-6 pb-3 border-b border-white/10 shrink-0">
          <ResponsiveDialogTitle className="flex items-center gap-2 text-lg sm:text-xl">
            <ShoppingBag className="h-5 w-5 text-emerald-400" />
            Quick Shop — {station.name}
          </ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            {customer
              ? `Adding snacks & drinks for ${customer.name}. Items stay on this station until the session ends.`
              : 'Add items for this active session.'}
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>

        <div className="flex border-b border-white/10 px-4 sm:px-6 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('products')}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'products'
                ? 'border-emerald-400 text-emerald-300'
                : 'border-transparent text-muted-foreground hover:text-white'
            }`}
          >
            Products
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('order')}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'order'
                ? 'border-emerald-400 text-emerald-300'
                : 'border-transparent text-muted-foreground hover:text-white'
            }`}
          >
            Station Order
            {orderCount > 0 && (
              <span className="rounded-full bg-emerald-500/20 text-emerald-300 text-xs px-2 py-0.5">
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
                    placeholder="Search snacks & drinks..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8 h-9"
                  />
                </div>
                <div className="flex gap-2">
                  {(['all', 'food', 'drinks'] as const).map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setCategoryFilter(cat)}
                      className={`text-xs px-3 py-1.5 rounded-lg font-medium capitalize transition-colors ${
                        categoryFilter === cat
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : 'bg-white/5 text-muted-foreground hover:text-white'
                      }`}
                    >
                      {cat === 'all' ? 'All' : cat}
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
                      return (
                        <div
                          key={product.id}
                          className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/[0.03] p-3"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-sm truncate">{product.name}</p>
                            <p className="text-xs text-muted-foreground capitalize">{product.category}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <CurrencyDisplay amount={product.price} className="text-sm text-emerald-300" />
                              <span className="text-[10px] text-muted-foreground">
                                {remaining} left
                              </span>
                              {inOrder > 0 && (
                                <span className="text-[10px] text-emerald-400">
                                  · {inOrder} in order
                                </span>
                              )}
                            </div>
                          </div>
                          <Button
                            size="sm"
                            disabled={remaining <= 0}
                            className="shrink-0 bg-emerald-600 hover:bg-emerald-700"
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
                        <p className="font-medium text-sm truncate">{item.name}</p>
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
                    <CurrencyDisplay amount={orderTotal} className="text-lg font-bold text-emerald-300" />
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
                    className="border-emerald-500/30 text-emerald-300"
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
                <CurrencyDisplay amount={orderTotal} className="inline text-emerald-300" />
              </span>
            ) : (
              'Nothing added yet'
            )}
          </div>
          <Button onClick={() => onOpenChange(false)} className="bg-emerald-600 hover:bg-emerald-700">
            Done
          </Button>
        </ResponsiveDialogFooter>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
};

export default StationQuickShopDialog;
