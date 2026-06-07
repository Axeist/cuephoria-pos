import React from 'react';
import { Wrench } from 'lucide-react';

/** Diagonal caution-tape overlay for stations in maintenance. */
const StationMaintenanceTape: React.FC = () => {
  return (
    <div className="pointer-events-none absolute inset-0 z-[15] overflow-hidden rounded-xl" aria-hidden>
      {/* Darkened station — clearly "closed" vs live/open cards */}
      <div className="absolute inset-0 bg-black/55 backdrop-blur-[1px]" />

      {/* Diagonal caution stripes */}
      <div
        className="absolute -inset-[40%] opacity-90 mix-blend-screen animate-maintenance-tape-drift"
        style={{
          backgroundImage: `repeating-linear-gradient(
            -42deg,
            #facc15 0px,
            #facc15 14px,
            #111827 14px,
            #111827 28px
          )`,
        }}
      />
      <div
        className="absolute -inset-[40%] opacity-35 mix-blend-multiply"
        style={{
          backgroundImage: `repeating-linear-gradient(
            42deg,
            transparent 0px,
            transparent 18px,
            rgba(0,0,0,0.45) 18px,
            rgba(0,0,0,0.45) 36px
          )`,
        }}
      />

      {/* Center seal — reads instantly as "do not use" */}
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="flex max-w-[92%] flex-col items-center gap-2 rounded-xl border-2 border-amber-400/90 bg-black/80 px-4 py-3 shadow-[0_0_40px_rgba(245,158,11,0.35)] ring-4 ring-amber-500/25">
          <div className="flex items-center gap-2 text-amber-300">
            <Wrench className="h-5 w-5 shrink-0" />
            <span className="text-sm font-black uppercase tracking-[0.2em] text-amber-200">
              Do not use
            </span>
          </div>
          <p className="text-center text-[10px] font-bold uppercase tracking-[0.14em] text-amber-100/80">
            Station closed for maintenance
          </p>
        </div>
      </div>

      {/* Edge tape bands */}
      <div className="absolute left-[-10%] top-[18%] w-[120%] rotate-[-12deg] border-y-4 border-black/80 bg-amber-400 py-1.5 text-center text-[11px] font-black uppercase tracking-[0.35em] text-black shadow-lg">
        Maintenance — closed
      </div>
      <div className="absolute left-[-10%] bottom-[22%] w-[120%] rotate-[8deg] border-y-4 border-black/80 bg-amber-400 py-1.5 text-center text-[11px] font-black uppercase tracking-[0.35em] text-black shadow-lg">
        Do not start session
      </div>
    </div>
  );
};

export default StationMaintenanceTape;
