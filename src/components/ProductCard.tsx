import React from 'react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { usePOS, Product } from '@/context/POSContext';
import { CurrencyDisplay } from '@/components/ui/currency';
import { ShoppingCart, Edit, Trash, Clock, GraduationCap } from 'lucide-react';

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

  const getCategoryStyles = (category: string) => {
    const categoryStyleMap: Record<string, string> = {
      'food': 'border-l-4 border-l-cuephoria-orange hover:shadow-[0_0_15px_rgba(249,115,22,0.3)] hover:shadow-[0_0_25px_rgba(249,115,22,0.5)] bg-gradient-to-r from-cuephoria-orange/5 via-transparent to-transparent',
      'drinks': 'border-l-4 border-l-cuephoria-blue hover:shadow-[0_0_15px_rgba(14,165,233,0.3)] hover:shadow-[0_0_25px_rgba(14,165,233,0.5)] bg-gradient-to-r from-cuephoria-blue/5 via-transparent to-transparent',
      'tobacco': 'border-l-4 border-l-red-500 hover:shadow-[0_0_15px_rgba(239,68,68,0.3)] hover:shadow-[0_0_25px_rgba(239,68,68,0.5)] bg-gradient-to-r from-red-500/5 via-transparent to-transparent',
      'challenges': 'border-l-4 border-l-green-500 hover:shadow-[0_0_15px_rgba(34,197,94,0.3)] hover:shadow-[0_0_25px_rgba(34,197,94,0.5)] bg-gradient-to-r from-green-500/5 via-transparent to-transparent',
      'membership': 'border-l-4 border-l-violet-600 hover:shadow-[0_0_15px_rgba(124,58,237,0.4)] hover:shadow-[0_0_30px_rgba(124,58,237,0.6)] bg-gradient-to-r from-violet-600/8 via-indigo-600/5 to-transparent',
    };
    
    return categoryStyleMap[category] || 'border-l-4 border-l-gray-500 hover:shadow-[0_0_10px_rgba(107,114,128,0.2)] bg-gradient-to-r from-gray-500/5 via-transparent to-transparent';
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
    <Card className={`flex flex-col h-full transition-all duration-300 ease-out transform hover:-translate-y-1 ${className} ${getCategoryStyles(product.category)} backdrop-blur-sm`}>
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
  );
};

export default ProductCard;
