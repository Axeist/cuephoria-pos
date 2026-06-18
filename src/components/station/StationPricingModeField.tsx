import React from 'react';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import type { PricingMode } from '@/utils/stationPricing';
import { getRateSuffix } from '@/utils/stationPricing';

interface StationPricingModeFieldProps {
  value: PricingMode;
  onChange: (mode: PricingMode) => void;
  stationType: string;
  slotDuration?: number | null;
}

export const StationPricingModeField: React.FC<StationPricingModeFieldProps> = ({
  value,
  onChange,
  stationType,
  slotDuration,
}) => {
  const suffix = getRateSuffix({ type: stationType, slotDuration, category: null });

  return (
    <div className="space-y-2 rounded-lg border p-3">
      <Label className="text-sm font-medium">Pricing</Label>
      <RadioGroup
        value={value}
        onValueChange={(v) => onChange(v as PricingMode)}
        className="grid gap-2"
      >
        <label
          htmlFor="pricing-static"
          className="flex cursor-pointer items-start gap-3 rounded-md border border-transparent p-2 hover:bg-muted/30 has-[[data-state=checked]]:border-cuephoria-purple/40 has-[[data-state=checked]]:bg-cuephoria-purple/5"
        >
          <RadioGroupItem value="static" id="pricing-static" className="mt-0.5" />
          <div>
            <p className="text-sm font-medium">Static price</p>
            <p className="text-xs text-muted-foreground">
              One flat rate{suffix.replace('/', ' / ')} — table, turf, VR slot fee
            </p>
          </div>
        </label>
        <label
          htmlFor="pricing-per-player"
          className="flex cursor-pointer items-start gap-3 rounded-md border border-transparent p-2 hover:bg-muted/30 has-[[data-state=checked]]:border-cuephoria-purple/40 has-[[data-state=checked]]:bg-cuephoria-purple/5"
        >
          <RadioGroupItem value="per_player" id="pricing-per-player" className="mt-0.5" />
          <div>
            <p className="text-sm font-medium">Player-based pricing</p>
            <p className="text-xs text-muted-foreground">
              Rate per person changes with how many players — PS5 couch, group tiers
            </p>
          </div>
        </label>
        <label
          htmlFor="pricing-time-based"
          className="flex cursor-pointer items-start gap-3 rounded-md border border-transparent p-2 hover:bg-muted/30 has-[[data-state=checked]]:border-cuephoria-purple/40 has-[[data-state=checked]]:bg-cuephoria-purple/5"
        >
          <RadioGroupItem value="time_based" id="pricing-time-based" className="mt-0.5" />
          <div>
            <p className="text-sm font-medium">Time-based pricing</p>
            <p className="text-xs text-muted-foreground">
              Flat price per duration tier (30 min, 1 hr, etc.) — overtime billed at tier per-minute
              rate
            </p>
          </div>
        </label>
      </RadioGroup>
    </div>
  );
};

export default StationPricingModeField;
