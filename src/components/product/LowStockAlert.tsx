
import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { Product } from '@/types/pos.types';

interface LowStockAlertProps {
  products: Product[];
}

const LowStockAlert: React.FC<LowStockAlertProps> = ({ products }) => {
  const lowStockProducts = products.filter(product => 
    (product.stock === 1 || product.stock === 0) && 
    product.category !== 'membership' &&
    product.category !== 'challenges'
  );

  if (lowStockProducts.length === 0) {
    return null;
  }

  return (
    <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
      <div className="flex">
        <div className="flex-shrink-0">
          <AlertTriangle className="h-5 w-5 text-yellow-400" />
        </div>
        <div className="ml-3">
          <p className="text-sm text-yellow-700">
            <span className="font-medium">Inventory Alert:</span> The following products are critically low in stock:
            {lowStockProducts.map((product, index) => (
              <span key={product.id} className="font-medium">
                {index === 0 ? ' ' : ', '}
                {product.name} ({product.stock} left)
              </span>
            ))}
          </p>
        </div>
      </div>
    </div>
  );
};

export default LowStockAlert;
