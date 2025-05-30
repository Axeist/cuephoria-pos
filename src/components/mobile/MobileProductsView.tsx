
import React, { useState } from 'react';
import { Search, ShoppingCart, Plus } from 'lucide-react';
import MobileContainer from '@/components/ui/mobile-container';
import MobileTabs from '@/components/ui/mobile-tabs';
import MobileCard from '@/components/ui/mobile-card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useIsMobile } from '@/hooks/use-mobile';

const MobileProductsView: React.FC = () => {
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const isMobile = useIsMobile();

  if (!isMobile) return null;

  const categories = [
    { id: 'all', label: 'All (65)', isActive: activeCategory === 'all' },
    { id: 'food', label: 'Food (35)', isActive: activeCategory === 'food' },
    { id: 'drinks', label: 'Drinks (20)', isActive: activeCategory === 'drinks' },
    { id: 'tobacco', label: 'Tobacco (10)', isActive: activeCategory === 'tobacco' }
  ];

  const products = [
    {
      id: '1',
      name: 'Fanta',
      category: 'Drinks',
      price: 45,
      profit: 12,
      available: 0,
      total: 0,
      status: 'out-of-stock'
    },
    {
      id: '2',
      name: 'Weekly Pass',
      category: 'Membership',
      price: 399,
      originalPrice: 799,
      offerPrice: 399,
      studentPrice: 399,
      validFor: '7 days',
      hoursCredit: '7 hours',
      status: 'available'
    },
    {
      id: '3',
      name: 'Coca Cola',
      category: 'Drinks',
      price: 50,
      profit: 15,
      available: 24,
      total: 24,
      status: 'available'
    }
  ];

  return (
    <MobileContainer>
      <div className="space-y-4">
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search products..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-gray-800 border-gray-600 text-white placeholder-gray-400"
          />
        </div>

        {/* Category Filters */}
        <MobileTabs 
          tabs={categories}
          onTabChange={setActiveCategory}
        />

        {/* Products List */}
        <div className="space-y-3">
          {products.map((product) => (
            <MobileCard key={product.id} compact>
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-white text-base">{product.name}</h3>
                      <Badge 
                        variant="secondary" 
                        className={`text-xs ${
                          product.category === 'Drinks' 
                            ? 'bg-cuephoria-blue/20 text-cuephoria-blue' 
                            : 'bg-cuephoria-purple/20 text-cuephoria-lightpurple'
                        }`}
                      >
                        {product.category}
                      </Badge>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-gray-400">Price:</span>
                    <span className="ml-2 text-white font-medium">₹{product.price}</span>
                  </div>
                  {product.profit && (
                    <div>
                      <span className="text-gray-400">Profit:</span>
                      <span className="ml-2 text-green-400 font-medium">₹{product.profit}</span>
                    </div>
                  )}
                </div>

                {product.category === 'Membership' ? (
                  <div className="space-y-2 text-sm">
                    {product.originalPrice && (
                      <div className="flex justify-between">
                        <span className="text-gray-400">Original Price:</span>
                        <span className="text-gray-500 line-through">₹{product.originalPrice}</span>
                      </div>
                    )}
                    {product.offerPrice && (
                      <div className="flex justify-between">
                        <span className="text-gray-400">Offer Price:</span>
                        <span className="text-green-400 font-medium">₹{product.offerPrice}</span>
                      </div>
                    )}
                    {product.studentPrice && (
                      <div className="flex justify-between">
                        <span className="text-gray-400">Student Price:</span>
                        <span className="text-cuephoria-blue font-medium">₹{product.studentPrice}</span>
                      </div>
                    )}
                    {product.validFor && (
                      <div className="flex justify-between">
                        <span className="text-gray-400">Valid for:</span>
                        <span className="text-white">{product.validFor}</span>
                      </div>
                    )}
                    {product.hoursCredit && (
                      <div className="flex justify-between">
                        <span className="text-gray-400">Hours credit:</span>
                        <span className="text-white">{product.hoursCredit}</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Available:</span>
                    <span className={`font-medium ${
                      product.available === 0 ? 'text-red-400' : 'text-white'
                    }`}>
                      {product.available} / {product.total}
                    </span>
                  </div>
                )}

                <div className="pt-2">
                  {product.status === 'out-of-stock' ? (
                    <Button 
                      variant="secondary" 
                      className="w-full bg-gray-600 text-gray-300 cursor-not-allowed"
                      disabled
                    >
                      Out of Stock
                    </Button>
                  ) : (
                    <Button className="w-full bg-cuephoria-lightpurple hover:bg-cuephoria-purple text-white">
                      <ShoppingCart className="h-4 w-4 mr-2" />
                      Add to Cart
                    </Button>
                  )}
                </div>
              </div>
            </MobileCard>
          ))}
        </div>

        {/* Add Product Button */}
        <div className="fixed bottom-20 right-4 z-30">
          <Button 
            size="icon" 
            className="h-12 w-12 rounded-full bg-cuephoria-lightpurple hover:bg-cuephoria-purple shadow-lg"
          >
            <Plus className="h-6 w-6" />
          </Button>
        </div>
      </div>
    </MobileContainer>
  );
};

export default MobileProductsView;
