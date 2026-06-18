import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import type { Station } from '@/types/pos.types';
import {
  buildDefaultOccupancyRates,
  getRateSuffix,
  totalRateAtMaxOccupancy,
  type OccupancyRates,
} from '@/utils/stationPricing';

interface OccupancyRatesEditorProps {
  maxPlayers: number;
  rates: OccupancyRates;
  onChange: (rates: OccupancyRates) => void;
  stationType: string;
  slotDuration?: number | null;
}

export const OccupancyRatesEditor: React.FC<OccupancyRatesEditorProps> = ({
  maxPlayers,
  rates,
  onChange,
  stationType,
  slotDuration,
}) => {
  const suffix = getRateSuffix({ type: stationType, slotDuration, category: null });
  const max = Math.max(1, Math.min(30, maxPlayers));

  const handleRateChange = (count: number, value: string) => {
    const num = Number(value);
    onChange({
      ...rates,
      [String(count)]: Number.isFinite(num) && num >= 0 ? num : 0,
    });
  };

  const handleAutoFill = () => {
    const solo = rates['1'] ?? 200;
    const group = rates[String(max)] ?? rates['2'] ?? 100;
    onChange(buildDefaultOccupancyRates(max, solo, group));
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <Label className="text-sm font-medium">Per-person pricing by occupancy</Label>
        <Button type="button" variant="outline" size="sm" onClick={handleAutoFill}>
          Auto-fill ramp
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        Set the rate per person{suffix.replace('/', ' / ')} for each player count. Total =
        rate × players.
      </p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {Array.from({ length: max }, (_, i) => i + 1).map((count) => (
          <div key={count} className="space-y-1">
            <Label className="text-xs text-muted-foreground">
              {count} player{count !== 1 ? 's' : ''}
            </Label>
            <Input
              type="number"
              min={0}
              step={10}
              value={rates[String(count)] ?? ''}
              onChange={(e) => handleRateChange(count, e.target.value)}
              placeholder="₹/person"
            />
          </div>
        ))}
      </div>
      {max > 0 && (
        <p className="text-xs text-cuephoria-lightpurple">
          Max occupancy total: ₹
          {totalRateAtMaxOccupancy(max, rates, 0) || '—'}
          {suffix}
        </p>
      )}
    </div>
  );
};

export function defaultMaxPlayersForType(type: string): number {
  if (type === 'ps5') return 4;
  if (type === 'turf') return 10;
  if (type === '8ball' || type === 'snooker') return 4;
  if (type === 'vr') return 1;
  return 4;
}

export function defaultSlotDuration(type: string, slotMinutes?: number): number {
  if (slotMinutes != null && slotMinutes > 0) return slotMinutes;
  return type === 'vr' ? 15 : 60;
}
