import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { getCustomersWithSavedCarts, clearAllCarts, clearCartFromStorage } from '@/utils/cartStorage';
import { ShoppingCart, Trash2, Clock, RefreshCw, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
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

const SavedCartsManager: React.FC = () => {
  const { toast } = useToast();
  const [savedCarts, setSavedCarts] = useState(getCustomersWithSavedCarts());
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [cartToDelete, setCartToDelete] = useState<{id: string, name: string} | null>(null);
  const [isClearAllOpen, setIsClearAllOpen] = useState(false);

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

  const handleClearCart = (customerId: string, customerName: string) => {
    setCartToDelete({ id: customerId, name: customerName });
    setIsAlertOpen(true);
  };

  const confirmClearCart = () => {
    if (cartToDelete) {
      clearCartFromStorage(cartToDelete.id);
      refreshCarts();
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
                  .sort((a, b) => b.timestamp - a.timestamp) // Most recent first
                  .map((cart, index) => (
                    <div
                      key={cart.customerId}
                      className="flex items-center justify-between border rounded-lg p-4 bg-gradient-to-r from-cuephoria-purple/5 to-transparent hover:from-cuephoria-purple/10 transition-all animate-fade-in"
                      style={{ animationDelay: `${index * 50}ms` }}
                    >
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
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleClearCart(cart.customerId, cart.customerName)}
                        className="hover:text-destructive hover:bg-red-50 dark:hover:bg-red-950/20"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
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
