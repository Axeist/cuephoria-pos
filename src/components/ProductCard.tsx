
import React from 'react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { usePOS, Product } from '@/context/POSContext';
import { CurrencyDisplay } from '@/components/ui/currency';
import { ShoppingCart, Edit, Trash, Tag, Clock, GraduationCap } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface ProductCardProps {
  product: Product;
  isAdmin?: boolean;
  onEdit?: (product: Product) => void;
  onDelete?: (id: string) => void;
  className?: string;
}

const ProductCard: React.FC<ProductCardProps> = ({ 
  product, 
  isAdmin = false, 
  onEdit, 
  onDelete,
  className = ''
}) => {
  const { addToCart, isStudentDiscount, setIsStudentDiscount, cart } = usePOS();

  // Define categories that shouldn't show buying/selling price info
  const hidePricingFieldsCategories = ['membership', 'challenges'];
  const shouldShowPricingFields = !hidePricingFieldsCategories.includes(product.category);

  const getCategoryColor = (category: string) => {
    const categoryColorMap: Record<string, string> = {
      'food': 'bg-cuephoria-orange',
      'drinks': 'bg-cuephoria-blue',
      'tobacco': 'bg-red-500',
      'challenges': 'bg-green-500',
      'membership': 'bg-gradient-to-r from-violet-600 to-indigo-600',
    };
    
    return categoryColorMap[category] || 'bg-gray-500';
  };

  const handleAddToCart = () => {
    // Check stock only for non-membership products
    if (product.category !== 'membership') {
      const existingCartItem = cart.find(item => item.id === product.id && item.type === 'product');
      const cartQuantity = existingCartItem ? existingCartItem.quantity : 0;
      
      if (cartQuantity >= product.stock) {
        return;
      }
    }
    
    addToCart({
      id: product.id,
      type: 'product',
      name: product.name,
      price: product.price,
      quantity: 1,
      category: product.category
    });
    
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
    <Card className={`flex flex-col h-full card-hover transition-all ${className} shadow-md`}>
      <CardHeader className="pb-2 space-y-1">
        <div className="flex justify-between items-start gap-2">
          <div className="flex-1 min-w-0">
            {/* Fixed height container for product name to maintain alignment */}
            <div className="h-14 flex items-start">
              <h3 className="text-lg font-semibold leading-tight break-words">
                {product.name}
              </h3>
            </div>
          </div>
          <Badge className={`${getCategoryColor(product.category)} flex-shrink-0 text-xs mt-1`}>
            {product.category.charAt(0).toUpperCase() + product.category.slice(1)}
          </Badge>
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
              <span>Available:</span>
              <span className={remainingStock <= 10 ? 'text-red-500' : ''}>
                {remainingStock} / {product.stock}
              </span>
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter className="mt-auto pt-2">
        {isAdmin ? (
          <div className="flex w-full space-x-2">
            <Button 
              variant="outline" 
              size="sm" 
              className="flex-1 justify-center"
              onClick={() => onEdit && onEdit(product)}
            >
              <Edit className="h-4 w-4 mr-2" /> Edit
            </Button>
            <Button 
              variant="destructive" 
              size="sm" 
              className="flex-1 justify-center"
              onClick={() => onDelete && onDelete(product.id)}
            >
              <Trash className="h-4 w-4 mr-2" /> Delete
            </Button>
          </div>
        ) : (
          <Button 
            variant="default" 
            className={`w-full ${product.category === 'membership' ? 'bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700' : ''}`}
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
  );
};

export default ProductCard;
