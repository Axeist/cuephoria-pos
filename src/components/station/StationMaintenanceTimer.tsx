import React, { useEffect, useState } from 'react';
import type { Station } from '@/types/pos.types';
import {
  formatMaintenanceCountdown,
  formatMaintenanceElapsed,
  getMaintenanceRemainingMs,
} from '@/utils/stationMaintenance.utils';
import { Timer, Wrench } from 'lucide-react';

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
              100,
          ),
        )
      : 0;

  if (prominent) {
    return (
      <div className="flex flex-1 flex-col justify-center rounded-lg border border-dashed border-amber-500/30 bg-amber-500/[0.06] px-4 py-5 min-h-[130px]">
        <div className="flex items-center gap-2 text-amber-200/90">
          <Wrench className="h-4 w-4 shrink-0" />
          <span className="text-sm font-medium">Under maintenance</span>
        </div>

        <div className="mt-4 flex items-end justify-between gap-4">
          <div>
            <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              Remaining
            </p>
            <p className="mt-0.5 font-mono text-2xl font-semibold tabular-nums text-foreground">
              {remaining}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              Elapsed
            </p>
            <p className="mt-0.5 font-mono text-sm tabular-nums text-muted-foreground">{elapsed}</p>
          </div>
        </div>

        <div className="mt-4 h-1 overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-amber-500/70 transition-all duration-1000"
            style={{ width: `${progress}%` }}
          />
        </div>

        {station.maintenanceStartedBy ? (
          <p className="mt-3 truncate text-center text-xs text-muted-foreground">
            Started by <span className="text-foreground/80">{station.maintenanceStartedBy}</span>
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 rounded-md border border-amber-500/25 bg-amber-500/10 px-2.5 py-1.5">
      <Timer className="h-3.5 w-3.5 text-amber-400" />
      <span className="font-mono text-xs tabular-nums text-amber-100">{remaining}</span>
    </div>
  );
};

export default StationMaintenanceTimer;
