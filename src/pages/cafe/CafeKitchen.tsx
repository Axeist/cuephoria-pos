import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useCafeAuth } from '@/context/CafeAuthContext';
import { useCafeKOT } from '@/hooks/cafe/useCafeKOT';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { CafeKOT, KOTStatus } from '@/types/cafe.types';
import { ChefHat, Clock, CheckCircle2, Wifi, WifiOff, ArrowRight, Printer, Bell, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

const statusConfig: Record<string, { label: string; border: string; bg: string; next?: KOTStatus; nextLabel?: string; nextIcon?: React.ElementType }> = {
  pending: { label: 'NEW', border: 'border-yellow-500', bg: 'bg-yellow-500/10', next: 'acknowledged', nextLabel: 'Start', nextIcon: ArrowRight },
  acknowledged: { label: 'ACCEPTED', border: 'border-blue-500', bg: 'bg-blue-500/10', next: 'preparing', nextLabel: 'Cooking', nextIcon: ChefHat },
  preparing: { label: 'COOKING', border: 'border-orange-500', bg: 'bg-orange-500/10', next: 'ready', nextLabel: 'Ready', nextIcon: CheckCircle2 },
  ready: { label: 'READY', border: 'border-green-500', bg: 'bg-green-500/10', next: 'served', nextLabel: 'Served', nextIcon: CheckCircle2 },
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

const KOTCard: React.FC<{ kot: CafeKOT; onUpdateStatus: (id: string, status: KOTStatus) => void; now: number; onPrint: (kot: CafeKOT) => void }> = React.memo(({ kot, onUpdateStatus, now, onPrint }) => {
  const config = statusConfig[kot.status] || statusConfig.pending;
  const elapsed = Math.floor((now - new Date(kot.createdAt).getTime()) / 60000);
  const elapsedColor = getElapsedColor(elapsed);
  const elapsedBg = getElapsedBgColor(elapsed);

  return (
    <div className={`rounded-xl border-2 ${config.border} ${config.bg} p-4 animate-scale-in transition-all duration-300 ${kot.status === 'pending' ? 'ring-2 ring-yellow-500/30' : ''}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold text-white font-heading">{kot.kotNumber}</span>
          <span className={`text-[10px] px-2 py-0.5 rounded-full font-quicksand font-semibold uppercase tracking-wider ${
            config.border.replace('border-', 'bg-').replace('500', '500/20')
          } ${config.border.replace('border-', 'text-')}`}>
            {config.label}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => onPrint(kot)} className="h-6 w-6 rounded-md bg-gray-700/50 flex items-center justify-center text-gray-400 hover:text-white transition-colors" title="Print KOT">
            <Printer className="h-3 w-3" />
          </button>
          <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full ${elapsedBg}`}>
            <Clock className={`h-3 w-3 ${elapsedColor}`} />
            <span className={`text-xs font-bold font-quicksand ${elapsedColor}`}>{elapsed}m</span>
          </div>
        </div>
      </div>

      {elapsed > 15 && kot.status !== 'ready' && (
        <div className="flex items-center gap-1.5 mb-2 px-2 py-1 rounded-md bg-red-500/10 border border-red-500/20">
          <AlertTriangle className="h-3 w-3 text-red-400" />
          <span className="text-[10px] text-red-400 font-quicksand font-medium">Delayed - {elapsed} minutes</span>
        </div>
      )}

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

      <div className="text-[10px] text-gray-500 font-quicksand mb-2">
        {new Date(kot.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
        {kot.items.length > 0 && ` · ${kot.items.reduce((s, i) => s + i.qty, 0)} items`}
      </div>

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

  const displayKots = useMemo(() => {
    switch (activeTab) {
      case 'pending': return [...pendingKots, ...acknowledgedKots];
      case 'cooking': return preparingKots;
      case 'ready': return readyKots;
      default: return kots;
    }
  }, [activeTab, kots, pendingKots, acknowledgedKots, preparingKots, readyKots]);

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

  return (
    <div className="flex-1 flex flex-col h-screen bg-cuephoria-darker">
      <div className="flex items-center justify-between p-4 border-b border-gray-700/30 bg-[#1A1F2C]">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-orange-500 to-cuephoria-purple flex items-center justify-center">
            <ChefHat className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white font-heading">Kitchen Display</h1>
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
          <div className="flex gap-1 bg-gray-800/50 rounded-lg p-1">
            {([
              { key: 'all' as const, label: `All (${kots.length})` },
              { key: 'pending' as const, label: `New (${pendingKots.length + acknowledgedKots.length})`, highlight: pendingKots.length > 0 },
              { key: 'cooking' as const, label: `Cooking (${preparingKots.length})` },
              { key: 'ready' as const, label: `Ready (${readyKots.length})`, highlight: readyKots.length > 0 },
            ]).map(tab => (
              <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                className={`px-3 py-1.5 rounded-md text-xs font-quicksand transition-all relative ${
                  activeTab === tab.key ? 'bg-orange-500/20 text-orange-400' : 'text-gray-500 hover:text-white'
                }`}>
                {tab.label}
                {tab.highlight && activeTab !== tab.key && (
                  <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                )}
              </button>
            ))}
          </div>

          <div className="text-right">
            <div className="text-2xl font-heading text-white tabular-nums">
              {currentTime.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </div>
            <div className="text-[10px] text-gray-500 font-quicksand">
              {currentTime.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}
            </div>
          </div>
        </div>
      </div>

      {/* Summary bar */}
      <div className="flex items-center gap-3 px-4 py-2 bg-gray-800/20 border-b border-gray-700/20">
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-yellow-500/10">
          <Bell className="h-3 w-3 text-yellow-400" />
          <span className="text-xs font-quicksand text-yellow-400 font-medium">{pendingKots.length} pending</span>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-500/10">
          <ChefHat className="h-3 w-3 text-orange-400" />
          <span className="text-xs font-quicksand text-orange-400 font-medium">{preparingKots.length} cooking</span>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-500/10">
          <CheckCircle2 className="h-3 w-3 text-green-400" />
          <span className="text-xs font-quicksand text-green-400 font-medium">{readyKots.length} ready</span>
        </div>
      </div>

      <ScrollArea className="flex-1 p-4">
        {displayKots.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            <ChefHat className="h-16 w-16 mb-4 opacity-20" />
            <p className="text-lg font-quicksand">
              {loading ? 'Loading...' : activeTab === 'all' ? 'No active orders' : `No ${activeTab} orders`}
            </p>
            <p className="text-sm text-gray-600 font-quicksand mt-1">Orders will appear here in real-time</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
            {displayKots.map(kot => (
              <KOTCard key={kot.id} kot={kot} onUpdateStatus={handleUpdateStatus} now={now} onPrint={handlePrintKOT} />
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
};

export default CafeKitchen;
