import React, { useState, useMemo } from 'react';
import { useCafeAuth } from '@/context/CafeAuthContext';
import { useCafeKOT } from '@/hooks/cafe/useCafeKOT';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { CafeKOT, KOTStatus } from '@/types/cafe.types';
import { ChefHat, Clock, CheckCircle2, Wifi, WifiOff, Bell, ArrowRight } from 'lucide-react';

const statusConfig: Record<string, { label: string; border: string; bg: string; next?: KOTStatus; nextLabel?: string; nextIcon?: React.ElementType }> = {
  pending: { label: 'NEW', border: 'border-yellow-500', bg: 'bg-yellow-500/10', next: 'acknowledged', nextLabel: 'Start', nextIcon: ArrowRight },
  acknowledged: { label: 'ACCEPTED', border: 'border-blue-500', bg: 'bg-blue-500/10', next: 'preparing', nextLabel: 'Cooking', nextIcon: ChefHat },
  preparing: { label: 'COOKING', border: 'border-orange-500', bg: 'bg-orange-500/10', next: 'ready', nextLabel: 'Ready', nextIcon: CheckCircle2 },
  ready: { label: 'READY', border: 'border-green-500', bg: 'bg-green-500/10', next: 'served', nextLabel: 'Served', nextIcon: CheckCircle2 },
};

const KOTCard: React.FC<{ kot: CafeKOT; onUpdateStatus: (id: string, status: KOTStatus) => void }> = React.memo(({ kot, onUpdateStatus }) => {
  const config = statusConfig[kot.status] || statusConfig.pending;
  const elapsed = Math.floor((Date.now() - new Date(kot.createdAt).getTime()) / 60000);

  return (
    <div className={`rounded-xl border-2 ${config.border} ${config.bg} p-4 animate-scale-in transition-all duration-300 ${kot.status === 'pending' ? 'animate-pulse-soft' : ''}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <span className="text-lg font-bold text-white font-heading">{kot.kotNumber}</span>
          <span className={`ml-2 text-[10px] px-2 py-0.5 rounded-full font-quicksand font-semibold uppercase tracking-wider ${
            config.border.replace('border-', 'bg-').replace('500', '500/20')
          } ${config.border.replace('border-', 'text-')}`}>
            {config.label}
          </span>
        </div>
        <div className="flex items-center gap-1 text-xs text-gray-400 font-quicksand">
          <Clock className="h-3 w-3" />
          {elapsed}m
        </div>
      </div>

      {/* Items */}
      <div className="space-y-2 mb-4">
        {kot.items.map((item, i) => (
          <div key={i} className="flex items-start gap-2">
            <span className="text-sm font-bold text-orange-400 min-w-[24px]">{item.qty}x</span>
            <div className="flex-1">
              <p className="text-sm font-medium text-white font-quicksand">{item.name}</p>
              {item.notes && (
                <p className="text-xs text-yellow-400 italic mt-0.5">"{item.notes}"</p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Action */}
      {config.next && (
        <Button
          onClick={() => onUpdateStatus(kot.id, config.next!)}
          className="w-full h-12 text-base font-quicksand font-semibold text-white border-0 transition-all hover:scale-[1.01] active:scale-[0.98]"
          style={{
            background: kot.status === 'preparing'
              ? 'linear-gradient(135deg, #10B981, #059669)'
              : kot.status === 'ready'
                ? 'linear-gradient(135deg, #6366f1, #4f46e5)'
                : 'linear-gradient(135deg, #f97316, #ea580c)',
            boxShadow: `0 4px 15px ${kot.status === 'preparing' ? 'rgba(16,185,129,0.3)' : kot.status === 'ready' ? 'rgba(99,102,241,0.3)' : 'rgba(249,115,22,0.3)'}`,
          }}
        >
          {config.nextIcon && <config.nextIcon className="mr-2 h-5 w-5" />}
          {config.nextLabel}
        </Button>
      )}
    </div>
  );
});

KOTCard.displayName = 'KOTCard';

const CafeKitchen: React.FC = () => {
  const { user } = useCafeAuth();
  const { kots, pendingKots, preparingKots, readyKots, connected, updateKOTStatus, loading } = useCafeKOT(user?.locationId);
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'cooking' | 'ready'>('all');

  const displayKots = useMemo(() => {
    switch (activeTab) {
      case 'pending': return pendingKots;
      case 'cooking': return preparingKots;
      case 'ready': return readyKots;
      default: return kots;
    }
  }, [activeTab, kots, pendingKots, preparingKots, readyKots]);

  const handleUpdateStatus = async (kotId: string, status: KOTStatus) => {
    await updateKOTStatus(kotId, status);
  };

  return (
    <div className="flex-1 flex flex-col h-screen bg-cuephoria-darker">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-700/30 bg-[#1A1F2C]">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-orange-500 to-cuephoria-purple flex items-center justify-center">
            <ChefHat className="h-6 w-6 text-white" />
          </div>
          <h1 className="text-xl font-bold text-white font-heading">Kitchen Display</h1>
          <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-quicksand ${connected ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400 animate-pulse'}`}>
            {connected ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
            {connected ? 'Live' : 'Reconnecting...'}
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Tab filters */}
          <div className="flex gap-1 bg-gray-800/50 rounded-lg p-1">
            {([
              { key: 'all' as const, label: `All (${kots.length})` },
              { key: 'pending' as const, label: `New (${pendingKots.length})` },
              { key: 'cooking' as const, label: `Cooking (${preparingKots.length})` },
              { key: 'ready' as const, label: `Ready (${readyKots.length})` },
            ]).map(tab => (
              <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                className={`px-3 py-1.5 rounded-md text-xs font-quicksand transition-all ${
                  activeTab === tab.key ? 'bg-orange-500/20 text-orange-400' : 'text-gray-500 hover:text-white'
                }`}>
                {tab.label}
              </button>
            ))}
          </div>

          {/* Clock */}
          <div className="text-lg font-heading text-gray-300">
            {new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>
      </div>

      {/* KOT Grid */}
      <ScrollArea className="flex-1 p-4">
        {displayKots.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            <ChefHat className="h-16 w-16 mb-4 opacity-20" />
            <p className="text-lg font-quicksand">
              {loading ? 'Loading...' : activeTab === 'all' ? 'No active orders' : `No ${activeTab} orders`}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
            {displayKots.map(kot => (
              <KOTCard key={kot.id} kot={kot} onUpdateStatus={handleUpdateStatus} />
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
};

export default CafeKitchen;
