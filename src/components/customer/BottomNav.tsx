import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Calendar, Gift, User, Gamepad2, Ticket } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { getCustomerSession } from '@/utils/customerAuth';
import '@/styles/customer-animations.css';

export default function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeOffersCount, setActiveOffersCount] = useState(0);
  const customer = getCustomerSession();

  useEffect(() => {
    if (customer) {
      loadActiveOffersCount();
    }
  }, [customer]);

  const loadActiveOffersCount = async () => {
    if (!customer) return;

    try {
      const { count } = await supabase
        .from('customer_offer_assignments')
        .select('*', { count: 'exact', head: true })
        .eq('customer_id', customer.id)
        .in('status', ['assigned', 'viewed']);

      setActiveOffersCount(count || 0);
    } catch (error) {
      console.error('Error loading offers count:', error);
    }
  };

  const navItems = [
    {
      path: '/customer/dashboard',
      icon: Gamepad2,
      label: 'Home',
      matchPaths: ['/customer/dashboard']
    },
    {
      path: '/public/booking',
      icon: Calendar,
      label: 'Book',
      matchPaths: ['/public/booking', '/booking']
    },
    {
      path: '/customer/bookings',
      icon: Ticket,
      label: 'Bookings',
      matchPaths: ['/customer/bookings']
    },
    {
      path: '/customer/offers',
      icon: Gift,
      label: 'Offers',
      matchPaths: ['/customer/offers'],
      badge: activeOffersCount
    },
    {
      path: '/customer/profile',
      icon: User,
      label: 'Profile',
      matchPaths: ['/customer/profile']
    }
  ];

  const isActive = (paths: string[]) => {
    return paths.some(path => location.pathname === path);
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-r from-purple-900/95 via-pink-900/95 to-indigo-900/95 border-t-2 border-purple-400/60 backdrop-blur-3xl z-50 safe-area-inset-bottom shadow-[0_-8px_32px_rgba(168,85,247,0.5)]">
      {/* Glowing top border effect */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-purple-400 to-transparent"></div>
      <div className="max-w-5xl mx-auto px-2 py-3">
        <div className="flex justify-around items-center">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.matchPaths);

            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`flex flex-col items-center gap-1.5 px-4 py-2.5 rounded-xl transition-all duration-300 bottom-nav-item relative min-w-[72px] ${
                  active
                    ? 'bg-gradient-to-br from-purple-600 to-pink-600 text-white shadow-lg shadow-purple-500/50 scale-105'
                    : 'text-gray-300 hover:text-white hover:bg-white/10 hover:scale-105'
                }`}
              >
                <div className="relative">
                  <div className={`${active ? 'bg-white/20 p-2 rounded-lg backdrop-blur-xl' : ''}`}>
                    <Icon
                      size={24}
                      className={`${active ? 'animate-pulse' : ''}`}
                      strokeWidth={active ? 2.5 : 2}
                    />
                  </div>
                  {item.badge && item.badge > 0 && (
                    <Badge className="absolute -top-1 -right-1 bg-gradient-to-r from-red-500 to-pink-500 text-white text-xs h-5 min-w-[20px] flex items-center justify-center rounded-full px-1 shadow-lg shadow-red-500/50 animate-pulse border-2 border-white">
                      {item.badge > 9 ? '9+' : item.badge}
                    </Badge>
                  )}
                </div>
                <span className={`text-xs font-semibold ${active ? 'text-white drop-shadow-lg' : ''}`}>
                  {item.label}
                </span>
                {active && (
                  <>
                    <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-12 h-1 bg-gradient-to-r from-purple-400 via-pink-400 to-purple-400 rounded-full shadow-lg shadow-purple-500/50" />
                    <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-purple-600/20 to-pink-600/20 blur-xl" />
                  </>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
