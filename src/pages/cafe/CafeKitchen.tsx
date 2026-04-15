import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useCafeAuth } from '@/context/CafeAuthContext';
import { useCafeKOT } from '@/hooks/cafe/useCafeKOT';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { CafeKOT, KOTStatus } from '@/types/cafe.types';
import { ChefHat, Clock, CheckCircle2, Wifi, WifiOff, ArrowRight, Printer, Bell, AlertTriangle, UtensilsCrossed } from 'lucide-react';
import { toast } from 'sonner';

const statusConfig: Record<string, { label: string; border: string; bg: string; accent: string; next?: KOTStatus; nextLabel?: string; nextIcon?: React.ElementType }> = {
  pending: { label: 'NEW', border: 'border-yellow-500', bg: 'bg-yellow-500/10', accent: 'yellow', next: 'acknowledged', nextLabel: 'Start', nextIcon: ArrowRight },
  acknowledged: { label: 'ACCEPTED', border: 'border-blue-500', bg: 'bg-blue-500/10', accent: 'blue', next: 'preparing', nextLabel: 'Cooking', nextIcon: ChefHat },
  preparing: { label: 'COOKING', border: 'border-orange-500', bg: 'bg-orange-500/10', accent: 'orange', next: 'ready', nextLabel: 'Ready', nextIcon: CheckCircle2 },
  ready: { label: 'READY', border: 'border-green-500', bg: 'bg-green-500/10', accent: 'green', next: 'served', nextLabel: 'Served', nextIcon: CheckCircle2 },
  served: { label: 'SERVED', border: 'border-emerald-600/40', bg: 'bg-emerald-900/10', accent: 'emerald' },
};

function getElapsedColor(minutes: number): string {
  if (minutes <= 5) return 'text-green-400';
  if (minutes <= 10) return 'text-yellow-400';
  if (minutes <= 15) return 'text-orange-400';
  return 'text-red-400 animate-pulse';
}

function getElapsedBgColor(minutes: number): string {
  if (minutes <= 5) return 'bg-green-400/10';
  if (minutes <= 10) return 'bg-yellow-400/10';
  if (minutes <= 15) return 'bg-orange-400/10';
  return 'bg-red-400/10';
}

const KOTCard: React.FC<{
  kot: CafeKOT;
  onUpdateStatus: (id: string, status: KOTStatus) => void;
  now: number;
  onPrint: (kot: CafeKOT) => void;
  isServed?: boolean;
}> = React.memo(({ kot, onUpdateStatus, now, onPrint, isServed }) => {
  const config = statusConfig[kot.status] || statusConfig.pending;
  const elapsed = Math.floor((now - new Date(kot.createdAt).getTime()) / 60000);
  const elapsedColor = isServed ? 'text-emerald-600' : getElapsedColor(elapsed);
  const elapsedBg = isServed ? 'bg-emerald-900/10' : getElapsedBgColor(elapsed);
  const totalItems = kot.items.reduce((s, i) => s + i.qty, 0);

  return (
    <div
      className={`
        rounded-xl border-2 ${config.border} p-4 transition-all duration-300
        backdrop-blur-md bg-white/[0.03] shadow-lg
        ${isServed ? 'opacity-60 border-emerald-700/30' : ''}
        ${kot.status === 'pending' ? 'ring-2 ring-yellow-500/30' : ''}
      `}
      style={{
        animation: 'kotSlideIn 0.35s cubic-bezier(0.16, 1, 0.3, 1) both',
        boxShadow: isServed
          ? '0 2px 12px rgba(16, 185, 129, 0.06)'
          : '0 4px 24px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255,255,255,0.04)',
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold text-white font-heading">{kot.kotNumber}</span>
          <span className={`text-xs px-2 py-0.5 rounded-full font-quicksand font-semibold uppercase tracking-wider ${
            config.border.replace('border-', 'bg-').replace('500', '500/20')
          } ${config.border.replace('border-', 'text-')}`}>
            {config.label}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => onPrint(kot)} className="h-6 w-6 rounded-md bg-gray-700/50 flex items-center justify-center text-gray-400 hover:text-white hover:bg-gray-600/50 transition-colors" title="Print KOT">
            <Printer className="h-3 w-3" />
          </button>
          <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full ${elapsedBg}`}>
            <Clock className={`h-3 w-3 ${elapsedColor}`} />
            <span className={`text-xs font-bold font-quicksand ${elapsedColor}`}>{elapsed}m</span>
          </div>
        </div>
      </div>

      {/* Prominent item count */}
      <div className={`flex items-center gap-2 mb-3 px-2.5 py-1.5 rounded-lg ${isServed ? 'bg-emerald-900/15' : 'bg-white/[0.04]'} border ${isServed ? 'border-emerald-800/20' : 'border-white/[0.06]'}`}>
        <UtensilsCrossed className={`h-3.5 w-3.5 ${isServed ? 'text-emerald-500/60' : 'text-orange-400'}`} />
        <span className={`text-sm font-quicksand font-bold ${isServed ? 'text-emerald-400/60' : 'text-white'}`}>
          {totalItems} {totalItems === 1 ? 'item' : 'items'}
        </span>
        <span className="text-xs text-gray-500 font-quicksand ml-auto">
          {new Date(kot.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>

      {!isServed && elapsed > 15 && kot.status !== 'ready' && (
        <div className="flex items-center gap-1.5 mb-2 px-2 py-1 rounded-md bg-red-500/10 border border-red-500/20">
          <AlertTriangle className="h-3 w-3 text-red-400" />
          <span className="text-xs text-red-400 font-quicksand font-medium">Delayed - {elapsed} minutes</span>
        </div>
      )}

      <div className="space-y-2 mb-4">
        {kot.items.map((item, i) => (
          <div key={i} className="flex items-start gap-2">
            <span className={`text-sm font-bold min-w-[24px] ${isServed ? 'text-emerald-500/50' : 'text-orange-400'}`}>{item.qty}x</span>
            <div className="flex-1">
              <p className={`text-sm sm:text-base font-medium font-quicksand ${isServed ? 'text-gray-400 line-through decoration-emerald-600/30' : 'text-white'}`}>{item.name}</p>
              {item.notes && (
                <p className="text-xs text-yellow-400 italic mt-0.5">"{item.notes}"</p>
              )}
            </div>
          </div>
        ))}
      </div>

      {config.next && !isServed && (
        <Button
          onClick={() => onUpdateStatus(kot.id, config.next!)}
          className="w-full h-12 text-sm sm:text-base font-quicksand font-semibold text-white border-0 transition-all hover:scale-[1.01] active:scale-[0.98]"
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

type TabKey = 'all' | 'pending' | 'cooking' | 'ready' | 'completed';

const CafeKitchen: React.FC = () => {
  const { user } = useCafeAuth();
  const { kots, pendingKots, preparingKots, readyKots, connected, updateKOTStatus, loading } = useCafeKOT(user?.locationId);
  const [activeTab, setActiveTab] = useState<TabKey>('all');
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 10000);
    return () => clearInterval(t);
  }, []);

  const [currentTime, setCurrentTime] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const acknowledgedKots = useMemo(() => kots.filter(k => k.status === 'acknowledged'), [kots]);
  const servedKots = useMemo(() => kots.filter(k => k.status === 'served'), [kots]);

  const activeKots = useMemo(() => kots.filter(k => k.status !== 'served'), [kots]);

  const displayKots = useMemo(() => {
    switch (activeTab) {
      case 'pending': return [...pendingKots, ...acknowledgedKots];
      case 'cooking': return preparingKots;
      case 'ready': return readyKots;
      case 'completed': return servedKots;
      default: return activeKots;
    }
  }, [activeTab, activeKots, pendingKots, acknowledgedKots, preparingKots, readyKots, servedKots]);

  const handleUpdateStatus = async (kotId: string, status: KOTStatus) => {
    const ok = await updateKOTStatus(kotId, status);
    if (ok && status === 'ready') toast.success('KOT marked ready!');
  };

  const handlePrintKOT = useCallback((kot: CafeKOT) => {
    const printWindow = window.open('', '_blank', 'width=300,height=400');
    if (!printWindow) { toast.error('Allow popups to print'); return; }
    printWindow.document.write(`<html><head><title>KOT</title>
      <style>body{font-family:monospace;font-size:13px;padding:8px;max-width:280px;margin:0 auto}
      .center{text-align:center}.bold{font-weight:bold}.line{border-top:1px dashed #000;margin:6px 0}
      .item{margin:4px 0;font-size:14px}</style></head><body>
      <div class="center bold" style="font-size:18px">KITCHEN ORDER</div>
      <div class="center bold" style="font-size:24px">${kot.kotNumber}</div>
      <div class="center">${new Date(kot.createdAt).toLocaleTimeString('en-IN')}</div>
      <div class="line"></div>
      ${kot.items.map(i => `<div class="item"><span class="bold">${i.qty}x</span> ${i.name}${i.notes ? `<br><em style="font-size:11px">&nbsp;&nbsp;↳ ${i.notes}</em>` : ''}</div>`).join('')}
      <div class="line"></div>
      <div class="center bold">Total Items: ${kot.items.reduce((s, i) => s + i.qty, 0)}</div>
      <script>setTimeout(()=>{window.print();window.close()},300)</script></body></html>`);
    printWindow.document.close();
  }, []);

  const avgWaitTime = useMemo(() => {
    const active = kots.filter(k => ['pending', 'acknowledged', 'preparing'].includes(k.status));
    if (active.length === 0) return 0;
    return Math.round(active.reduce((s, k) => s + (now - new Date(k.createdAt).getTime()) / 60000, 0) / active.length);
  }, [kots, now]);

  const tabs: { key: TabKey; label: string; count: number; highlight?: boolean }[] = [
    { key: 'all', label: 'Active', count: activeKots.length },
    { key: 'pending', label: 'New', count: pendingKots.length + acknowledgedKots.length, highlight: pendingKots.length > 0 },
    { key: 'cooking', label: 'Cooking', count: preparingKots.length },
    { key: 'ready', label: 'Ready', count: readyKots.length, highlight: readyKots.length > 0 },
    { key: 'completed', label: 'Completed', count: servedKots.length },
  ];

  return (
    <div className="flex-1 flex flex-col h-screen bg-cuephoria-darker">
      <style>{`
        @keyframes kotSlideIn {
          from { opacity: 0; transform: translateY(12px) scale(0.97); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>

      {/* Header with dark gradient */}
      <div
        className="flex items-center justify-between p-4 border-b border-white/[0.06]"
        style={{ background: 'linear-gradient(135deg, #0f1219 0%, #1a1f2c 50%, #161b26 100%)' }}
      >
        <div className="flex items-center gap-3">
          <div
            className="h-10 w-10 rounded-xl flex items-center justify-center shadow-lg"
            style={{ background: 'linear-gradient(135deg, #f97316, #9333ea)', boxShadow: '0 4px 15px rgba(249,115,22,0.25)' }}
          >
            <ChefHat className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white font-heading tracking-tight">Kitchen Display</h1>
            <div className="flex items-center gap-2 mt-0.5">
              <div className={`flex items-center gap-1 text-xs font-quicksand ${connected ? 'text-green-400' : 'text-red-400 animate-pulse'}`}>
                {connected ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
                {connected ? 'Live' : 'Reconnecting...'}
              </div>
              {avgWaitTime > 0 && (
                <span className={`text-xs font-quicksand px-2 py-0.5 rounded-full ${avgWaitTime > 10 ? 'bg-red-500/20 text-red-400' : 'bg-gray-700/30 text-gray-400'}`}>
                  Avg wait: {avgWaitTime}m
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Pill-shaped tabs */}
          <div className="flex gap-1 bg-white/[0.04] backdrop-blur-sm rounded-full p-1 border border-white/[0.06]">
            {tabs.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`
                  px-3 py-1.5 rounded-full text-xs font-quicksand font-medium transition-all duration-200 relative whitespace-nowrap
                  ${activeTab === tab.key
                    ? tab.key === 'completed'
                      ? 'bg-emerald-500/20 text-emerald-400 shadow-sm'
                      : 'bg-orange-500/20 text-orange-400 shadow-sm'
                    : 'text-gray-500 hover:text-gray-300 hover:bg-white/[0.04]'
                  }
                `}
              >
                {tab.label}
                <span className={`ml-1 text-[10px] ${activeTab === tab.key ? 'opacity-80' : 'opacity-50'}`}>
                  {tab.count}
                </span>
                {tab.highlight && activeTab !== tab.key && (
                  <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-red-500 animate-pulse ring-2 ring-[#0f1219]" />
                )}
              </button>
            ))}
          </div>

          <div className="text-right">
            <div className="text-2xl font-heading text-white tabular-nums">
              {currentTime.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </div>
            <div className="text-xs text-gray-500 font-quicksand">
              {currentTime.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}
            </div>
          </div>
        </div>
      </div>

      {/* Summary bar */}
      <div className="flex items-center gap-3 px-4 py-2 bg-white/[0.02] border-b border-white/[0.04]">
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-yellow-500/10 border border-yellow-500/10">
          <Bell className="h-3 w-3 text-yellow-400" />
          <span className="text-xs sm:text-sm font-quicksand text-yellow-400 font-medium">{pendingKots.length} pending</span>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-500/10 border border-orange-500/10">
          <ChefHat className="h-3 w-3 text-orange-400" />
          <span className="text-xs sm:text-sm font-quicksand text-orange-400 font-medium">{preparingKots.length} cooking</span>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-500/10 border border-green-500/10">
          <CheckCircle2 className="h-3 w-3 text-green-400" />
          <span className="text-xs sm:text-sm font-quicksand text-green-400 font-medium">{readyKots.length} ready</span>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/10">
          <UtensilsCrossed className="h-3 w-3 text-emerald-400" />
          <span className="text-xs sm:text-sm font-quicksand text-emerald-400 font-medium">{servedKots.length} served</span>
        </div>
      </div>

      <ScrollArea className="flex-1 p-4">
        {displayKots.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            <ChefHat className="h-16 w-16 mb-4 opacity-20" />
            <p className="text-lg font-quicksand">
              {loading
                ? 'Loading...'
                : activeTab === 'completed'
                  ? 'No completed orders yet'
                  : activeTab === 'all'
                    ? 'No active orders'
                    : `No ${activeTab} orders`
              }
            </p>
            <p className="text-sm text-gray-600 font-quicksand mt-1">
              {activeTab === 'completed' ? 'Served orders will appear here' : 'Orders will appear here in real-time'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
            {displayKots.map(kot => (
              <KOTCard
                key={kot.id}
                kot={kot}
                onUpdateStatus={handleUpdateStatus}
                now={now}
                onPrint={handlePrintKOT}
                isServed={kot.status === 'served'}
              />
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
};

export default CafeKitchen;
