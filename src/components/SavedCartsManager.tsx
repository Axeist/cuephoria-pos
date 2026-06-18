import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { getCustomersWithSavedCarts, clearAllCarts, clearCartFromStorage, loadCartFromStorage } from '@/utils/cartStorage';
import { ShoppingCart, Trash2, Clock, RefreshCw, AlertCircle, ChevronDown, ChevronUp, ArrowRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { usePOS } from '@/context/POSContext';
import { CurrencyDisplay } from '@/components/ui/currency';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

const SavedCartsManager: React.FC = () => {
  const { toast } = useToast();
  const { selectCustomer } = usePOS();
  const [savedCarts, setSavedCarts] = useState(getCustomersWithSavedCarts());
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [cartToDelete, setCartToDelete] = useState<{id: string, name: string} | null>(null);
  const [isClearAllOpen, setIsClearAllOpen] = useState(false);
  const [expandedCarts, setExpandedCarts] = useState<Set<string>>(new Set());

  const refreshCarts = () => {
    setSavedCarts(getCustomersWithSavedCarts());
  };

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      refreshCarts();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const toggleCartExpansion = (customerId: string) => {
    setExpandedCarts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(customerId)) {
        newSet.delete(customerId);
      } else {
        newSet.add(customerId);
      }
      return newSet;
    });
  };

  const handleGoToBill = (customerId: string, customerName: string) => {
    // Select the customer - this will automatically load their cart
    selectCustomer(customerId);
    
    toast({
      title: 'Customer Selected',
      description: `${customerName}'s cart has been loaded. Ready to checkout!`,
      duration: 3000,
    });

    // Scroll to top to see the cart
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleClearCart = (customerId: string, customerName: string) => {
    setCartToDelete({ id: customerId, name: customerName });
    setIsAlertOpen(true);
  };

  const confirmClearCart = () => {
    if (cartToDelete) {
      clearCartFromStorage(cartToDelete.id);
      refreshCarts();
      
      // Remove from expanded set if it was expanded
      setExpandedCarts(prev => {
        const newSet = new Set(prev);
        newSet.delete(cartToDelete.id);
        return newSet;
      });
      
      toast({
        title: 'Cart Cleared',
        description: `Cart for ${cartToDelete.name} has been cleared.`,
      });
      setCartToDelete(null);
    }
    setIsAlertOpen(false);
  };

  const handleClearAll = () => {
    setIsClearAllOpen(true);
  };

  const confirmClearAll = () => {
    const count = clearAllCarts();
    refreshCarts();
    setExpandedCarts(new Set());
    toast({
      title: 'All Carts Cleared',
      description: `${count} cart(s) have been cleared.`,
    });
    setIsClearAllOpen(false);
  };

  const formatTimestamp = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return `${hours}h ${minutes}m ago`;
    }
    return `${minutes}m ago`;
  };

  const formatTimestampDetailed = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  return (
    <>
      <Card className="animate-slide-up">
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="font-heading flex items-center gap-2">
                <ShoppingCart className="h-5 w-5 text-cuephoria-purple" />
                Saved Carts
              </CardTitle>
              <CardDescription>
                {savedCarts.length} customer{savedCarts.length !== 1 ? 's' : ''} with pending carts
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={refreshCarts}
                className="hover:bg-cuephoria-purple/10"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
              {savedCarts.length > 0 && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleClearAll}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Clear All
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {savedCarts.length > 0 ? (
            <>
              <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-md flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-blue-900 dark:text-blue-100">
                  Carts are automatically saved when customers are selected and items are added. 
                  They expire after 24 hours.
                </p>
              </div>
              
              <div className="space-y-3">
                {savedCarts
                  .sort((a, b) => b.timestamp - a.timestamp)
                  .map((cart, index) => {
                    const isExpanded = expandedCarts.has(cart.customerId);
                    const cartData = loadCartFromStorage(cart.customerId);
                    
                    return (
                      <Collapsible
                        key={cart.customerId}
                        open={isExpanded}
                        onOpenChange={() => toggleCartExpansion(cart.customerId)}
                      >
                        <div
                          className="border rounded-lg bg-gradient-to-r from-cuephoria-purple/5 to-transparent hover:from-cuephoria-purple/10 transition-all animate-fade-in"
                          style={{ animationDelay: `${index * 50}ms` }}
                        >
                          {/* Cart Header */}
                          <div className="flex items-center justify-between p-4">
                            <div className="flex items-center gap-3 flex-1">
                              <div className="bg-cuephoria-purple/20 p-3 rounded-full">
                                <ShoppingCart className="h-5 w-5 text-cuephoria-purple" />
                              </div>
                              <div className="flex-1">
                                <p className="font-medium font-quicksand text-base">
                                  {cart.customerName}
                                </p>
                                <div className="flex items-center gap-3 mt-1">
                                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    {formatTimestamp(cart.timestamp)}
                                  </p>
                                  <p className="text-sm font-semibold text-cuephoria-orange">
                                    {cart.itemCount} item{cart.itemCount !== 1 ? 's' : ''}
                                  </p>
                                </div>
                                <p className="text-xs text-muted-foreground mt-1">
                                  Last updated: {formatTimestampDetailed(cart.timestamp)}
                                </p>
                              </div>
                            </div>
                            
                            {/* Action Buttons */}
                            <div className="flex items-center gap-2">
                              <Button
                                variant="default"
                                size="sm"
                                onClick={() => handleGoToBill(cart.customerId, cart.customerName)}
                                className="bg-gradient-to-r from-cuephoria-purple to-cuephoria-lightpurple hover:opacity-90"
                              >
                                <ArrowRight className="h-4 w-4 mr-1" />
                                Go to Bill
                              </Button>
                              
                              <CollapsibleTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="hover:bg-cuephoria-purple/10"
                                >
                                  {isExpanded ? (
                                    <ChevronUp className="h-4 w-4" />
                                  ) : (
                                    <ChevronDown className="h-4 w-4" />
                                  )}
                                </Button>
                              </CollapsibleTrigger>
                              
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleClearCart(cart.customerId, cart.customerName)}
                                className="hover:text-destructive hover:bg-red-50 dark:hover:bg-red-950/20"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>

                          {/* Expandable Cart Items */}
                          <CollapsibleContent>
                            <div className="border-t px-4 py-3 bg-gradient-to-r from-cuephoria-purple/5 to-transparent">
                              {cartData && cartData.items.length > 0 ? (
                                <>
                                  <div className="space-y-2 mb-3">
                                    {cartData.items.map((item, idx) => (
                                      <div 
                                        key={idx} 
                                        className="flex justify-between items-center text-sm py-2 border-b last:border-b-0"
                                      >
                                        <div className="flex-1">
                                          <p className="font-medium font-quicksand">{item.name}</p>
                                          <p className="text-xs text-muted-foreground">
                                            ₹{item.price.toLocaleString('en-IN')} × {item.quantity}
                                          </p>
                                        </div>
                                        <div className="font-semibold text-cuephoria-purple">
                                          <CurrencyDisplay amount={item.total} />
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                  
                                  {/* Cart Summary */}
                                  <div className="border-t pt-3 space-y-1">
                                    {cartData.discount && cartData.discount > 0 && (
                                      <div className="flex justify-between text-sm text-cuephoria-orange">
                                        <span>
                                          Discount {cartData.discountType === 'percentage' ? `(${cartData.discount}%)` : ''}
                                        </span>
                                        <span>
                                          - ₹{cartData.discountType === 'percentage' 
                                            ? (cartData.items.reduce((sum, item) => sum + item.total, 0) * cartData.discount / 100).toFixed(2)
                                            : cartData.discount.toFixed(2)}
                                        </span>
                                      </div>
                                    )}
                                    {cartData.loyaltyPointsUsed && cartData.loyaltyPointsUsed > 0 && (
                                      <div className="flex justify-between text-sm text-cuephoria-lightpurple">
                                        <span>Loyalty Points</span>
                                        <span>- ₹{cartData.loyaltyPointsUsed}</span>
                                      </div>
                                    )}
                                    <div className="flex justify-between font-bold text-base pt-2 border-t">
                                      <span>Total</span>
                                      <CurrencyDisplay 
                                        amount={
                                          cartData.items.reduce((sum, item) => sum + item.total, 0) - 
                                          (cartData.discount || 0) - 
                                          (cartData.loyaltyPointsUsed || 0)
                                        } 
                                        className="text-cuephoria-purple"
                                      />
                                    </div>
                                  </div>
                                </>
                              ) : (
                                <p className="text-sm text-muted-foreground text-center py-2">
                                  No items found in cart
                                </p>
                              )}
                            </div>
                          </CollapsibleContent>
                        </div>
                      </Collapsible>
                    );
                  })}
              </div>
            </>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <div className="bg-muted/50 rounded-full p-6 w-24 h-24 mx-auto mb-4 flex items-center justify-center">
                <ShoppingCart className="h-12 w-12 opacity-20" />
              </div>
              <p className="font-medium text-lg mb-1">No Saved Carts</p>
              <p className="text-sm">Carts will appear here when customers leave items pending</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Single Cart Alert Dialog */}
      <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear Cart?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to clear the cart for <strong>{cartToDelete?.name}</strong>? 
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setCartToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmClearCart}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Clear Cart
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Clear All Carts Alert Dialog */}
      <AlertDialog open={isClearAllOpen} onOpenChange={setIsClearAllOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear All Carts?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to clear all {savedCarts.length} saved cart{savedCarts.length !== 1 ? 's' : ''}? 
              This action cannot be undone and will permanently delete all pending carts.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmClearAll}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Clear All Carts
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default SavedCartsManager;
