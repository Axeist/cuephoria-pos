import React, { useEffect, useState } from 'react';
import type { Station } from '@/types/pos.types';
import {
  formatMaintenanceCountdown,
  formatMaintenanceElapsed,
  getMaintenanceRemainingMs,
} from '@/utils/stationMaintenance.utils';
import { Wrench, Timer } from 'lucide-react';

interface StationMaintenanceTimerProps {
  station: Station;
  prominent?: boolean;
}

const StationMaintenanceTimer: React.FC<StationMaintenanceTimerProps> = ({
  station,
  prominent = false,
}) => {
  const [, setTick] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => setTick((t) => t + 1), 1000);
    return () => window.clearInterval(id);
  }, []);

  const remainingMs = getMaintenanceRemainingMs(station);
  const elapsed = formatMaintenanceElapsed(station);
  const remaining = formatMaintenanceCountdown(remainingMs);
  const progress =
    station.maintenanceStartedAt && station.maintenancePlannedEndAt
      ? Math.min(
          100,
          Math.max(
            0,
            ((Date.now() - new Date(station.maintenanceStartedAt).getTime()) /
              (new Date(station.maintenancePlannedEndAt).getTime() -
                new Date(station.maintenanceStartedAt).getTime())) *
              100
          )
        )
      : 0;

  if (prominent) {
    return (
      <div className="flex flex-1 flex-col animate-station-content-in">
        <div className="relative flex flex-1 flex-col overflow-hidden rounded-xl border-2 border-amber-400/70 bg-black/85 p-4 shadow-[0_0_36px_rgba(245,158,11,0.28)] backdrop-blur-md">
          <div
            className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-amber-500 via-orange-400 to-amber-600 transition-all duration-1000"
            style={{ width: `${progress}%` }}
          />
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-amber-200">
              <Wrench className="h-4 w-4 shrink-0" />
              <span className="text-[10px] font-bold uppercase tracking-[0.14em]">Maintenance</span>
            </div>
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-400" />
            </span>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-lg border border-white/8 bg-black/30 px-3 py-2.5">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-amber-200/70">Elapsed</p>
              <p className="mt-1 font-mono text-2xl font-bold tabular-nums text-amber-50">{elapsed}</p>
            </div>
            <div className="rounded-lg border border-amber-400/25 bg-amber-500/10 px-3 py-2.5">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-amber-200/70">Remaining</p>
              <p className="mt-1 font-mono text-2xl font-bold tabular-nums text-orange-100">{remaining}</p>
            </div>
          </div>

          {station.maintenanceStartedBy ? (
            <p className="mt-3 truncate text-center text-xs text-amber-100/80">
              Started by <span className="font-semibold text-amber-50">{station.maintenanceStartedBy}</span>
            </p>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 rounded-md border border-amber-500/30 bg-amber-950/50 px-2.5 py-1.5">
      <Timer className="h-3.5 w-3.5 text-amber-400" />
      <span className="font-mono text-xs tabular-nums text-amber-100">{remaining}</span>
    </div>
  );
};

export default StationMaintenanceTimer;
