import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useCafeAuth } from '@/context/CafeAuthContext';
import { useCafeKOT } from '@/hooks/cafe/useCafeKOT';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import type { CafeKOT, KOTStatus } from '@/types/cafe.types';
import { CookingPot, Clock, CheckCircle2, Wifi, WifiOff, ArrowRight, Printer, AlertTriangle, UtensilsCrossed, Search, Download, Calendar, X } from 'lucide-react';
import { toast } from 'sonner';
import { CafePageShell } from '@/components/cafe/CafePageShell';

const statusConfig: Record<string, { label: string; border: string; bg: string; accent: string; next?: KOTStatus; nextLabel?: string; nextIcon?: React.ElementType }> = {
  pending: { label: 'NEW', border: 'border-yellow-500', bg: 'bg-yellow-500/10', accent: 'yellow', next: 'acknowledged', nextLabel: 'Accept', nextIcon: ArrowRight },
  acknowledged: { label: 'ACCEPTED', border: 'border-blue-500', bg: 'bg-blue-500/10', accent: 'blue', next: 'preparing', nextLabel: 'Cooking', nextIcon: CookingPot },
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
        rounded-xl border-2 ${config.border} transition-all duration-300
        backdrop-blur-md bg-white/[0.03] shadow-lg flex flex-col
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
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-3 pb-2">
        <div className="flex items-center gap-2 flex-wrap min-w-0">
          <span className="text-base font-bold text-white font-heading shrink-0">{kot.kotNumber}</span>
          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-quicksand font-semibold uppercase tracking-wider shrink-0 ${
            config.border.replace('border-', 'bg-').replace('500', '500/20')
          } ${config.border.replace('border-', 'text-')}`}>
            {config.label}
          </span>
          {(kot as any).orderSource === 'customer' && (
            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-violet-500/20 text-violet-300 font-quicksand font-bold uppercase tracking-wider border border-violet-500/20 shrink-0">Self</span>
          )}
          {(kot as any).orderType === 'takeaway' && (
            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-quicksand font-bold uppercase tracking-wider border border-cyan-500/20 shrink-0">Takeaway</span>
          )}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <button onClick={() => onPrint(kot)} className="h-6 w-6 rounded-md bg-white/[0.05] flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/[0.1] transition-colors" title="Print KOT">
            <Printer className="h-3 w-3" />
          </button>
          <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded-full ${elapsedBg}`}>
            <Clock className={`h-3 w-3 ${elapsedColor}`} />
            <span className={`text-[11px] font-bold font-quicksand ${elapsedColor}`}>{elapsed}m</span>
          </div>
        </div>
      </div>

      {/* Customer + meta */}
      {((kot as any).customerName || totalItems > 0) && (
        <div className="flex items-center justify-between px-4 pb-2 gap-2">
          {(kot as any).customerName ? (
            <p className="text-xs text-zinc-400 font-quicksand truncate">
              <span className="text-zinc-600">👤</span> {(kot as any).customerName}
            </p>
          ) : <span />}
          <span className="text-[11px] text-zinc-500 font-quicksand shrink-0">
            {new Date(kot.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      )}

      {/* Delay warning */}
      {!isServed && elapsed > 15 && kot.status !== 'ready' && (
        <div className="flex items-center gap-1.5 mx-4 mb-2 px-2 py-1 rounded-md bg-red-500/10 border border-red-500/20">
          <AlertTriangle className="h-3 w-3 text-red-400 shrink-0" />
          <span className="text-xs text-red-400 font-quicksand font-medium">Delayed — {elapsed}m</span>
        </div>
      )}

      {/* Items */}
      <div className="flex-1 px-4 pb-3 space-y-1">
        {kot.items.map((item, i) => (
          <div key={i} className={`flex items-start gap-2 py-1 ${i > 0 ? 'border-t border-white/[0.04]' : ''}`}>
            <span className={`text-xs font-bold min-w-[22px] text-right tabular-nums mt-0.5 ${isServed ? 'text-emerald-500/50' : 'text-orange-400'}`}>{item.qty}×</span>
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-medium font-quicksand leading-tight ${isServed ? 'text-gray-400 line-through decoration-emerald-600/30' : 'text-white'}`}>{item.name}</p>
              {item.notes && (
                <p className="text-[11px] text-yellow-400/80 italic mt-0.5 truncate">↳ {item.notes}</p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Action */}
      {config.next && !isServed && (
        <div className="px-3 pb-3 mt-auto">
          <Button
            onClick={() => onUpdateStatus(kot.id, config.next!)}
            className="w-full h-10 text-sm font-quicksand font-semibold text-white border-0 transition-all hover:scale-[1.01] active:scale-[0.98]"
            style={{
              background: kot.status === 'preparing'
                ? 'linear-gradient(135deg, #10B981, #059669)'
                : kot.status === 'ready'
                  ? 'linear-gradient(135deg, #6366f1, #4f46e5)'
                  : 'linear-gradient(135deg, #f97316, #ea580c)',
              boxShadow: `0 4px 15px ${kot.status === 'preparing' ? 'rgba(16,185,129,0.3)' : kot.status === 'ready' ? 'rgba(99,102,241,0.3)' : 'rgba(249,115,22,0.3)'}`,
            }}
          >
            {config.nextIcon && <config.nextIcon className="mr-1.5 h-4 w-4" />}
            {config.nextLabel}
          </Button>
        </div>
      )}
    </div>
  );
});

KOTCard.displayName = 'KOTCard';

type TabKey = 'all' | 'pending' | 'cooking' | 'ready' | 'completed';

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

const CafeKitchen: React.FC = () => {
  const { user } = useCafeAuth();
  const {
    kots, pendingKots, preparingKots, readyKots, servedKots,
    completedKots, completedLoading, fetchCompletedKOTs,
    connected, updateKOTStatus, loading,
  } = useCafeKOT(user?.locationId);
  const [activeTab, setActiveTab] = useState<TabKey>('all');
  const [now, setNow] = useState(Date.now());

  const [cDateFilter, setCDateFilter] = useState<string>('today');
  const [cCustomerSearch, setCCustomerSearch] = useState('');
  const [cDateFrom, setCDateFrom] = useState(todayStr());
  const [cDateTo, setCDateTo] = useState(todayStr());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 10000);
    return () => clearInterval(t);
  }, []);

  const [currentTime, setCurrentTime] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (activeTab === 'completed') {
      const now = new Date();
      let from: string | undefined;
      let to: string | undefined;
      if (cDateFilter === 'today') {
        from = todayStr(); to = todayStr();
      } else if (cDateFilter === 'yesterday') {
        const y = new Date(now); y.setDate(y.getDate() - 1);
        from = y.toISOString().slice(0, 10); to = from;
      } else if (cDateFilter === '7d') {
        const d = new Date(now); d.setDate(d.getDate() - 7);
        from = d.toISOString().slice(0, 10); to = todayStr();
      } else if (cDateFilter === '30d') {
        const d = new Date(now); d.setDate(d.getDate() - 30);
        from = d.toISOString().slice(0, 10); to = todayStr();
      } else if (cDateFilter === 'custom') {
        from = cDateFrom; to = cDateTo;
      }
      fetchCompletedKOTs({ dateFrom: from, dateTo: to, customerSearch: cCustomerSearch || undefined });
    }
  }, [activeTab, cDateFilter, cDateFrom, cDateTo, cCustomerSearch, fetchCompletedKOTs]);

  const acknowledgedKots = useMemo(() => kots.filter(k => k.status === 'acknowledged'), [kots]);
  const activeKots = useMemo(() => kots.filter(k => k.status !== 'served'), [kots]);

  const displayKots = useMemo(() => {
    switch (activeTab) {
      case 'pending': return [...pendingKots, ...acknowledgedKots];
      case 'cooking': return preparingKots;
      case 'ready': return readyKots;
      case 'completed': return completedKots;
      default: return activeKots;
    }
  }, [activeTab, activeKots, pendingKots, acknowledgedKots, preparingKots, readyKots, completedKots]);

  const handleUpdateStatus = async (kotId: string, status: KOTStatus) => {
    const ok = await updateKOTStatus(kotId, status);
    if (ok && status === 'ready') toast.success('KOT marked ready!');
    if (ok && status === 'served') toast.success('KOT marked served — moved to Completed');
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

  const handleExportCSV = useCallback(() => {
    const data = completedKots;
    if (data.length === 0) { toast.error('No data to export'); return; }
    const rows = [['KOT #', 'Order Time', 'Customer', 'Items', 'Total Qty', 'Status'].join(',')];
    data.forEach(k => {
      const time = new Date(k.createdAt).toLocaleString('en-IN');
      const customer = ((k as any).customerName || '-').replace(/,/g, ' ');
      const itemList = k.items.map(i => `${i.qty}x ${i.name}`).join(' | ').replace(/,/g, ' ');
      const totalQty = k.items.reduce((s, i) => s + i.qty, 0);
      rows.push([k.kotNumber, time, customer, `"${itemList}"`, totalQty, k.status].join(','));
    });
    const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `completed-kots-${todayStr()}.csv`;
    a.click(); URL.revokeObjectURL(url);
    toast.success(`Exported ${data.length} KOTs`);
  }, [completedKots]);

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
    { key: 'completed', label: 'Completed', count: activeTab === 'completed' ? completedKots.length : servedKots.length },
  ];

  return (
    <CafePageShell variant="full" className="min-h-0 flex-1 !px-2 !py-3 sm:!px-4 sm:!py-4" contentClassName="flex min-h-0 flex-1 flex-col gap-0">
      <style>{`
        @keyframes kotSlideIn {
          from { opacity: 0; transform: translateY(12px) scale(0.97); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>

      {/* Header */}
      <div className="cafe-glass-card mb-3 flex shrink-0 flex-col gap-3 border-white/[0.08] p-3 sm:p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div
            className="h-10 w-10 rounded-xl flex items-center justify-center shadow-lg shrink-0"
            style={{ background: 'linear-gradient(135deg, #f97316, #9333ea)', boxShadow: '0 4px 15px rgba(249,115,22,0.25)' }}
          >
            <CookingPot className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-bold text-white font-heading tracking-tight">Kitchen Display</h1>
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

        <div className="flex flex-wrap items-center justify-end gap-2 w-full sm:w-auto">
          <div className="flex gap-0.5 bg-white/[0.05] backdrop-blur-md rounded-full p-0.5 border border-white/[0.08] shadow-inner overflow-x-auto">
            {tabs.map(tab => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`
                  px-2.5 py-1.5 rounded-full text-[11px] font-quicksand font-medium transition-all duration-200 relative whitespace-nowrap
                  ${activeTab === tab.key
                    ? tab.key === 'completed'
                      ? 'bg-emerald-500/25 text-emerald-300 shadow-sm ring-1 ring-emerald-500/30'
                      : 'bg-gradient-to-r from-orange-500/25 to-purple-500/20 text-orange-200 shadow-sm ring-1 ring-orange-500/25'
                    : 'text-gray-500 hover:text-gray-300 hover:bg-white/[0.06]'
                  }
                `}
              >
                {tab.label}
                <span className={`ml-0.5 text-[10px] tabular-nums ${activeTab === tab.key ? 'opacity-90' : 'opacity-45'}`}>
                  {tab.count}
                </span>
                {tab.highlight && activeTab !== tab.key && (
                  <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-red-500 animate-pulse ring-2 ring-[#0f1219]" />
                )}
              </button>
            ))}
          </div>

          <div className="text-right rounded-xl border border-white/[0.06] bg-black/25 px-3 py-1.5 min-w-[120px]">
            <div className="text-lg sm:text-xl font-heading text-white tabular-nums leading-none">
              {currentTime.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </div>
            <div className="text-[10px] text-gray-500 font-quicksand mt-0.5">
              {currentTime.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}
            </div>
          </div>
        </div>
      </div>

      {/* Completed filters */}
      {activeTab === 'completed' && (
        <div className="cafe-glass-card mb-3 flex shrink-0 flex-wrap items-center gap-2 border-white/[0.08] p-3">
          <Select value={cDateFilter} onValueChange={setCDateFilter}>
            <SelectTrigger className="h-9 w-[130px] bg-white/[0.04] border-white/10 text-white text-xs font-quicksand rounded-xl">
              <Calendar className="h-3 w-3 mr-1.5 text-zinc-500" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-zinc-900 border-white/10">
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="yesterday">Yesterday</SelectItem>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="custom">Custom</SelectItem>
            </SelectContent>
          </Select>

          {cDateFilter === 'custom' && (
            <>
              <Input type="date" value={cDateFrom} onChange={e => setCDateFrom(e.target.value)}
                className="h-9 w-[140px] bg-white/[0.04] border-white/10 text-white text-xs font-quicksand rounded-xl" />
              <span className="text-zinc-500 text-xs">to</span>
              <Input type="date" value={cDateTo} onChange={e => setCDateTo(e.target.value)}
                className="h-9 w-[140px] bg-white/[0.04] border-white/10 text-white text-xs font-quicksand rounded-xl" />
            </>
          )}

          <div className="relative flex-1 min-w-[160px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3 w-3 text-zinc-500" />
            <Input value={cCustomerSearch} onChange={e => setCCustomerSearch(e.target.value)}
              placeholder="Search customer name/phone"
              className="h-9 pl-8 bg-white/[0.04] border-white/10 text-white text-xs font-quicksand rounded-xl placeholder:text-zinc-600" />
            {cCustomerSearch && (
              <button onClick={() => setCCustomerSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2">
                <X className="h-3 w-3 text-zinc-500 hover:text-white" />
              </button>
            )}
          </div>

          <Button onClick={handleExportCSV} variant="outline" size="sm"
            className="h-9 text-xs font-quicksand border-white/10 text-zinc-300 hover:bg-white/[0.06] rounded-xl gap-1.5">
            <Download className="h-3 w-3" /> Export
          </Button>

          {completedLoading && (
            <span className="text-xs text-zinc-500 font-quicksand animate-pulse">Loading…</span>
          )}
        </div>
      )}

      <ScrollArea className="min-h-0 flex-1 px-1 sm:px-0">
        {displayKots.length === 0 ? (
          <div className="flex flex-col items-center justify-center min-h-[40vh] text-gray-500 rounded-2xl border border-dashed border-white/[0.08] bg-gradient-to-b from-white/[0.02] to-transparent px-6 py-12">
            <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-orange-500/15 to-purple-600/15 flex items-center justify-center mb-4 border border-white/[0.06]">
              <CookingPot className="h-10 w-10 text-gray-500/60" />
            </div>
            <p className="text-lg font-quicksand text-gray-300">
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
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-3">
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
    </CafePageShell>
  );
};

export default CafeKitchen;
