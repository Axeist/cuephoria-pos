import React, { useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useCafeAuth } from '@/context/CafeAuthContext';
import { LayoutGrid, ShoppingCart, CookingPot, UtensilsCrossed, ClipboardList, Users } from 'lucide-react';
import CafePOS from '@/pages/cafe/CafePOS';
import CafeKitchen from '@/pages/cafe/CafeKitchen';
import CafeMenu from '@/pages/cafe/CafeMenu';
import CafeOrders from '@/pages/cafe/CafeOrders';
import CafeCustomers from '@/pages/cafe/CafeCustomers';

type TabId = 'pos' | 'kitchen' | 'menu' | 'orders' | 'customers';

const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: 'pos', label: 'POS', icon: ShoppingCart },
  { id: 'kitchen', label: 'Kitchen', icon: CookingPot },
  { id: 'menu', label: 'Menu & Tables', icon: UtensilsCrossed },
  { id: 'orders', label: 'Orders', icon: ClipboardList },
  { id: 'customers', label: 'Customers', icon: Users },
];

/**
 * Single staff hub: POS, KDS, menu/tables (with item add), orders, customers.
 */
const CafeStaffWorkspace: React.FC = () => {
  const { user } = useCafeAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabFromUrl = searchParams.get('tab') as TabId | null;
  const [tab, setTab] = useState<TabId>(() =>
    tabFromUrl && TABS.some(t => t.id === tabFromUrl) ? tabFromUrl : 'pos'
  );

  const setTabAndUrl = (id: TabId) => {
    setTab(id);
    setSearchParams({ tab: id }, { replace: true });
  };

  React.useEffect(() => {
    if (tabFromUrl && TABS.some(t => t.id === tabFromUrl) && tabFromUrl !== tab) {
      setTab(tabFromUrl);
    }
  }, [tabFromUrl, tab]);

  const roleLabel = useMemo(() => {
    if (!user) return '';
    if (user.role === 'cafe_admin') return 'Admin';
    if (user.role === 'staff') return 'Staff';
    return 'Staff';
  }, [user]);

  return (
    <div className="flex flex-col flex-1 min-h-0 h-full bg-cuephoria-darker">
      <div
        className="shrink-0 border-b border-white/[0.06] px-3 sm:px-4 py-3"
        style={{ background: 'linear-gradient(135deg, #0f1219 0%, #1a1f2c 55%, #161b26 100%)' }}
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 max-w-[1800px] mx-auto">
          <div className="flex items-center gap-3">
            <div
              className="h-10 w-10 rounded-xl flex items-center justify-center shadow-lg"
              style={{ background: 'linear-gradient(135deg, #f97316, #9333ea)', boxShadow: '0 4px 15px rgba(249,115,22,0.25)' }}
            >
              <LayoutGrid className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-bold text-white font-heading tracking-tight">Staff workspace</h1>
              <p className="text-xs text-gray-500 font-quicksand">
                {user?.displayName} · {roleLabel} — POS, kitchen, menu, orders & customers in one place
              </p>
            </div>
          </div>
          <nav className="flex flex-wrap gap-1.5 bg-white/[0.04] backdrop-blur-sm rounded-full p-1 border border-white/[0.06]">
            {TABS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => setTabAndUrl(id)}
                className={`
                  flex items-center gap-1.5 px-3 py-2 rounded-full text-xs sm:text-sm font-quicksand font-medium transition-all
                  ${tab === id
                    ? 'bg-orange-500/25 text-orange-300 shadow-sm ring-1 ring-orange-500/30'
                    : 'text-gray-500 hover:text-gray-200 hover:bg-white/[0.06]'
                  }
                `}
              >
                <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
                {label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-auto">
        <div className={tab === 'pos' ? 'block h-full min-h-0' : 'hidden'}>
          <CafePOS />
        </div>
        <div className={tab === 'kitchen' ? 'block h-full min-h-[calc(100vh-8rem)]' : 'hidden'}>
          <CafeKitchen />
        </div>
        <div className={tab === 'menu' ? 'block' : 'hidden'}>
          <CafeMenu />
        </div>
        <div className={tab === 'orders' ? 'block' : 'hidden'}>
          <CafeOrders />
        </div>
        <div className={tab === 'customers' ? 'block' : 'hidden'}>
          <CafeCustomers />
        </div>
      </div>
    </div>
  );
};

export default CafeStaffWorkspace;
