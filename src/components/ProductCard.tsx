import React from 'react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { usePOS, Product } from '@/context/POSContext';
import { CurrencyDisplay } from '@/components/ui/currency';
import { ShoppingCart, Edit, Trash, Clock, GraduationCap, Lock, Truck } from 'lucide-react';
import { usePinVerification } from '@/hooks/usePinVerification';
import PinVerificationDialog from '@/components/PinVerificationDialog';
import { getRestockHeadroom } from '@/utils/productStock.utils';
import { getCategoryCardStyle } from '@/utils/colorTheme.utils';

interface ProductCardProps {
  product: Product;
  canEdit?: boolean;
  canDelete?: boolean;
  canRestock?: boolean;
  /** When true, delete still requires PIN for non-admin login users. */
  requiresPinForDelete?: boolean;
  onEdit?: (product: Product) => void;
  onRestock?: (product: Product) => void;
  onDelete?: (id: string) => void;
  className?: string;
  showManagementActions?: boolean;
}

const ProductCard: React.FC<ProductCardProps> = ({ 
  product, 
  canEdit = false,
  canDelete = false,
  canRestock = false,
  requiresPinForDelete = false,
  onEdit,
  onRestock,
  onDelete,
  className = '',
  showManagementActions = false
}) => {
  const { addToCart, isStudentDiscount, setIsStudentDiscount, cart, categoryMeta } = usePOS();
  const { showPinDialog, requestPinVerification, handlePinSuccess, handlePinCancel } = usePinVerification();

  // Define categories that shouldn't show buying/selling price info
  const hidePricingFieldsCategories = ['membership', 'challenges'];
  const shouldShowPricingFields = !hidePricingFieldsCategories.includes(product.category);

  const handleDelete = () => {
    if (!canDelete || !onDelete) return;
    if (requiresPinForDelete) {
      requestPinVerification(() => onDelete(product.id));
    } else {
      onDelete(product.id);
    }
  };

  const categoryAccent = categoryMeta[product.category.toLowerCase()]?.accentColor;
  const cardStyle = getCategoryCardStyle(product.category, categoryAccent);

  const handleAddToCart = () => {
    // Check stock only for non-membership products
    if (product.category !== 'membership') {
      const existingCartItem = cart.find(item => item.id === product.id && item.type === 'product');
      const cartQuantity = existingCartItem ? existingCartItem.quantity : 0;
      
      if (cartQuantity >= product.stock) {
        return;
      }
    }
    
    addToCart(
      {
        id: product.id,
        type: 'product',
        name: product.name,
        price: product.price,
        quantity: 1,
        category: product.category,
      },
      product.category !== 'membership' ? product.stock : undefined
    );
    
    if (product.category === 'membership' && product.studentPrice) {
      setIsStudentDiscount(true);
    }
  };

  const getDurationText = () => {
    if (product.category !== 'membership') return '';
    
    if (product.duration === 'weekly') {
      return 'Valid for 7 days';
    } else if (product.duration === 'monthly') {
      return 'Valid for 30 days';
    } else if (product.name.includes('Weekly')) {
      return 'Valid for 7 days';
    } else if (product.name.includes('Monthly')) {
      return 'Valid for 30 days';
    }
    
    return '';
  };

  const getMembershipHours = () => {
    if (product.category !== 'membership') return '';
    
    if (product.membershipHours) {
      return `${product.membershipHours} hours credit`;
    }
    
    return '';
  };

  const getRemainingStock = () => {
    if (product.category === 'membership') return Infinity;
    
    const existingCartItem = cart.find(item => item.id === product.id && item.type === 'product');
    const cartQuantity = existingCartItem ? existingCartItem.quantity : 0;
    return product.stock - cartQuantity;
  };

  const remainingStock = getRemainingStock();
  const isOutOfStock = product.category !== 'membership' && remainingStock <= 0;

  // Calculate profit for display (only for applicable categories)
  const profit = shouldShowPricingFields && product.buyingPrice ? 
    (product.price - product.buyingPrice).toFixed(2) : null;

  return (
    <>
      <Card
        className={`flex flex-col h-full transition-all duration-300 ease-out transform hover:-translate-y-1 ${className} backdrop-blur-sm`}
        style={cardStyle}
      >
        <CardHeader className="pb-3 space-y-2 relative overflow-hidden">
          {/* Subtle animated background glow - only on hover */}
          <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-transparent opacity-0 hover:opacity-100 transition-opacity duration-300"></div>
          
          {/* Product name with proper spacing */}
          <div className="min-h-[3.5rem] flex items-start relative z-10">
            <h3 className="text-base font-semibold leading-snug break-words hyphens-auto text-foreground">
              {product.name}
            </h3>
          </div>
        </CardHeader>
        <CardContent className="flex-grow py-3">
          <div className="flex flex-col space-y-2">
            <div className="flex justify-between text-sm font-medium">
              <span>Price:</span>
              <CurrencyDisplay amount={product.price} />
            </div>
            
            {/* Only display profit information for applicable categories */}
            {shouldShowPricingFields && product.buyingPrice !== undefined && profit && (
              <div className="flex justify-between text-sm">
                <span>Profit:</span>
                <span className="text-green-600 dark:text-green-400">
                  <CurrencyDisplay amount={parseFloat(profit)} />
                </span>
              </div>
            )}
            
            {product.category === 'membership' && (
              <>
                {product.originalPrice && (
                  <div className="flex justify-between text-sm">
                    <span>Original Price:</span>
                    <span className="line-through text-gray-500">
                      <CurrencyDisplay amount={product.originalPrice} />
                    </span>
                  </div>
                )}
                {product.offerPrice && (
                  <div className="flex justify-between text-sm text-green-600">
                    <span>Offer Price:</span>
                    <CurrencyDisplay amount={product.offerPrice} />
                  </div>
                )}
                {product.studentPrice && (
                  <div className="flex justify-between text-sm text-blue-600">
                    <span><GraduationCap className="h-3 w-3 inline mr-1" />Student Price:</span>
                    <CurrencyDisplay amount={product.studentPrice} />
                  </div>
                )}
                <div className="text-xs text-gray-500 pt-1 flex items-center">
                  <Clock className="h-3 w-3 inline mr-1" />
                  {getDurationText()}
                </div>
                {product.membershipHours && (
                  <div className="text-xs text-gray-500 pt-1 flex items-center">
                    <Clock className="h-3 w-3 inline mr-1" />
                    {getMembershipHours()}
                  </div>
                )}
              </>
            )}
            
            {product.category !== 'membership' && (
              <div className="flex justify-between text-sm">
                <span>On hand:</span>
                <span className={remainingStock <= 10 ? 'text-red-500' : ''}>
                  {product.stock}
                  {product.maxStock != null ? ` / ${product.maxStock} max` : ''}
                  {remainingStock !== product.stock ? ` (${remainingStock} avail.)` : ''}
                </span>
              </div>
            )}
          </div>
        </CardContent>
        <CardFooter className="mt-auto pt-2">
          {showManagementActions ? (
            <div className="flex w-full flex-col gap-2">
              {canRestock && product.category !== 'membership' && onRestock && getRestockHeadroom(product) !== 0 && (
                <Button
                  variant="default"
                  size="sm"
                  className="w-full justify-center bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500"
                  onClick={() => onRestock(product)}
                >
                  <Truck className="h-4 w-4 mr-2" /> Restock
                </Button>
              )}
              {(canEdit || canDelete) && (
                <div className="flex w-full space-x-2">
                  {canEdit && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1 justify-center"
                      onClick={() => onEdit && onEdit(product)}
                    >
                      <Edit className="h-4 w-4 mr-2" /> Edit
                    </Button>
                  )}
                  {canDelete && (
                    <Button 
                      variant="destructive" 
                      size="sm" 
                      className="flex-1 justify-center relative"
                      onClick={handleDelete}
                      title={requiresPinForDelete ? "PIN verification required" : "Delete product"}
                    >
                      <Trash className="h-4 w-4 mr-2" /> Delete
                      {requiresPinForDelete && (
                        <Lock className="h-3 w-3 absolute -top-1 -right-1 text-amber-500" />
                      )}
                    </Button>
                  )}
                </div>
              )}
            </div>
          ) : (
            <Button 
              variant="default" 
              className="w-full transition-all duration-300 bg-gradient-to-r from-cuephoria-purple to-cuephoria-lightpurple hover:opacity-90"
              disabled={isOutOfStock}
              onClick={handleAddToCart}
            >
              {isOutOfStock ? (
                "Out of Stock"
              ) : (
                <>
                  <ShoppingCart className="h-4 w-4 mr-2" /> Add to Cart
                </>
              )}
            </Button>
          )}
        </CardFooter>
      </Card>
      
      <PinVerificationDialog
        open={showPinDialog}
        onOpenChange={handlePinCancel}
        onSuccess={handlePinSuccess}
        title="Verify PIN to Delete"
        description="Enter the PIN to confirm this delete operation."
      />
    </>
  );
};

export default ProductCard;
