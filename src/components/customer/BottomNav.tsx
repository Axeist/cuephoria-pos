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
    <div
      className="fixed bottom-0 left-0 right-0 bg-gradient-to-r from-gray-900/98 to-purple-900/98 border-t border-purple-500/30 backdrop-blur-xl z-50 shadow-lg shadow-purple-500/10"
      style={{
        // Safe-area-aware bottom padding so the nav doesn't sit under iOS
        // home indicator on phones with rounded corners.
        paddingBottom: 'max(0px, env(safe-area-inset-bottom))',
      }}
    >
      <div className="max-w-5xl mx-auto px-1 sm:px-2 py-1.5 sm:py-2">
        <div className="flex justify-around items-center">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.matchPaths);

            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                aria-label={item.label}
                className={`flex flex-col items-center gap-0.5 sm:gap-1 px-2 sm:px-4 py-1.5 sm:py-2 rounded-lg transition-all duration-200 bottom-nav-item relative min-w-[56px] sm:min-w-[64px] ${
                  active
                    ? 'text-purple-400'
                    : 'text-gray-400 hover:text-white hover:bg-purple-600/20'
                }`}
              >
                <div className="relative">
                  <Icon
                    size={22}
                    className={active ? 'scale-110' : ''}
                    strokeWidth={active ? 2.5 : 2}
                  />
                  {item.badge && item.badge > 0 && (
                    <Badge className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] sm:text-xs h-4 sm:h-5 min-w-[16px] sm:min-w-[20px] flex items-center justify-center rounded-full px-1 animate-pulse">
                      {item.badge > 9 ? '9+' : item.badge}
                    </Badge>
                  )}
                </div>
                {/* Hide label on extra-narrow viewports (<360px) — icon +
                    a11y label remain. */}
                <span className={`hidden min-[360px]:inline text-[10px] sm:text-xs font-medium leading-none ${active ? 'font-semibold' : ''}`}>
                  {item.label}
                </span>
                {active && (
                  <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-8 h-1 bg-gradient-to-r from-purple-400 to-pink-400 rounded-t-full" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
