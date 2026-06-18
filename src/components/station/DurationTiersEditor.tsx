import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Plus, Trash2 } from 'lucide-react';
import type { DurationTier } from '@/utils/timeBasedPricing.utils';
import { getOvertimePerMinute, formatOvertimePerMinute } from '@/utils/timeBasedPricing.utils';

interface DurationTiersEditorProps {
  tiers: DurationTier[];
  onChange: (tiers: DurationTier[]) => void;
}

export const DurationTiersEditor: React.FC<DurationTiersEditorProps> = ({ tiers, onChange }) => {
  const sorted = [...tiers].sort((a, b) => a.minutes - b.minutes);

  const updateTier = (index: number, patch: Partial<DurationTier>) => {
    const next = sorted.map((t, i) => (i === index ? { ...t, ...patch } : t));
    onChange(next);
  };

  const addTier = () => {
    const last = sorted[sorted.length - 1];
    const nextMinutes = last ? last.minutes + 30 : 30;
    onChange([...sorted, { minutes: nextMinutes, price: last ? last.price + 150 : 250 }]);
  };

  const removeTier = (index: number) => {
    if (sorted.length <= 1) return;
    onChange(sorted.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <Label className="text-sm font-medium">Duration pricing tiers</Label>
        <Button type="button" variant="outline" size="sm" onClick={addTier}>
          <Plus className="mr-1 h-3.5 w-3.5" />
          Add tier
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        Set a flat price per duration. Overtime is billed at tier price ÷ minutes (e.g. ₹250 / 30
        min = ₹8.3/min). Extending upgrades to the matching tier total (60 min from 30 min uses
        the 60 min rate; 90 min can combine tiers).
      </p>
      <div className="space-y-2">
        {sorted.map((tier, index) => {
          const otPerMin = getOvertimePerMinute(tier.minutes, sorted);
          return (
            <div
              key={`${tier.minutes}-${index}`}
              className="grid grid-cols-[1fr_1fr_auto] items-end gap-2 rounded-md border p-2"
            >
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Duration (min)</Label>
                <Input
                  type="number"
                  min={15}
                  step={15}
                  value={tier.minutes}
                  onChange={(e) =>
                    updateTier(index, { minutes: Math.max(15, Number(e.target.value) || 30) })
                  }
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Price (₹)</Label>
                <Input
                  type="number"
                  min={0}
                  step={10}
                  value={tier.price}
                  onChange={(e) =>
                    updateTier(index, { price: Math.max(0, Number(e.target.value) || 0) })
                  }
                />
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="shrink-0 text-muted-foreground hover:text-destructive"
                onClick={() => removeTier(index)}
                disabled={sorted.length <= 1}
                aria-label="Remove tier"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
              <p className="col-span-3 text-[11px] text-muted-foreground">
                Overtime: ₹{formatOvertimePerMinute(otPerMin)}/min
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default DurationTiersEditor;
