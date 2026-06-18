
import React, { useState } from 'react';
import { AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';
import { Product } from '@/types/pos.types';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface LowStockAlertProps {
  products: Product[];
}

const LowStockAlert: React.FC<LowStockAlertProps> = ({ products }) => {
  const [isOpen, setIsOpen] = useState(false);
  
  const lowStockProducts = products.filter(product => 
    (product.stock === 1 || product.stock === 0) && 
    product.category !== 'membership' &&
    product.category !== 'challenges'
  );

  if (lowStockProducts.length === 0) {
    return null;
  }

  const displayProducts = lowStockProducts.slice(0, 3);
  const remainingCount = lowStockProducts.length - 3;

  return (
    <div className="bg-gradient-to-r from-cuephoria-orange/10 via-cuephoria-orange/5 to-transparent border-l-4 border-cuephoria-orange rounded-lg p-4 mb-4 shadow-sm">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-3 flex-1">
            <div className="flex-shrink-0 mt-0.5">
              <AlertTriangle className="h-5 w-5 text-cuephoria-orange" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-foreground/90 font-medium mb-1">
                Inventory Alert: {lowStockProducts.length} products are critically low in stock
              </p>
              <div className="text-sm text-foreground/70">
                {displayProducts.map((product, index) => (
                  <span key={product.id} className="font-medium text-cuephoria-orange">
                    {index === 0 ? '' : ', '}
                    {product.name} ({product.stock} left)
                  </span>
                ))}
                {remainingCount > 0 && !isOpen && (
                  <span className="text-foreground/60">
                    {displayProducts.length > 0 ? ', ' : ''}and {remainingCount} more...
                  </span>
                )}
              </div>
            </div>
          </div>
          
          {lowStockProducts.length > 3 && (
            <CollapsibleTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 hover:bg-cuephoria-orange/10"
              >
                {isOpen ? (
                  <ChevronUp className="h-4 w-4 text-cuephoria-orange" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-cuephoria-orange" />
                )}
              </Button>
            </CollapsibleTrigger>
          )}
        </div>
        
        {lowStockProducts.length > 3 && (
          <CollapsibleContent className="mt-3">
            <div className="text-sm text-foreground/70 pl-8">
              {lowStockProducts.slice(3).map((product, index) => (
                <span key={product.id} className="font-medium text-cuephoria-orange">
                  {index === 0 ? '' : ', '}
                  {product.name} ({product.stock} left)
                </span>
              ))}
            </div>
          </CollapsibleContent>
        )}
      </Collapsible>
    </div>
  );
};

export default LowStockAlert;
