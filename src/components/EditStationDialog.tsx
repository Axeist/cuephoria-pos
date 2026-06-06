import React from 'react';
import { Button } from './ui/button';
import { DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { ResponsiveDialog, ResponsiveDialogContent } from './ui/responsive-dialog';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Station } from '@/types/pos.types';
import { Edit } from 'lucide-react';
import { OccupancyRatesEditor } from '@/components/station/OccupancyRatesEditor';
import { StationTypePicker } from '@/components/station/StationTypePicker';
import { StationPricingModeField } from '@/components/station/StationPricingModeField';
import { DurationTiersEditor } from '@/components/station/DurationTiersEditor';
import type { OccupancyRates, PricingMode } from '@/utils/stationPricing';
import {
  getRateSuffix,
  resolvePricingMode,
  totalRateAtMaxOccupancy,
} from '@/utils/stationPricing';
import type { DurationTier } from '@/utils/timeBasedPricing.utils';
import { getDefaultDurationTiers, getTierPackagePrice } from '@/utils/timeBasedPricing.utils';
import type { StationType } from '@/types/stationType.types';
import { defaultSlotMinutesForSlug } from '@/utils/stationTypeUtils';
import { Switch } from '@/components/ui/switch';
import { AccentColorPicker } from '@/components/ui/AccentColorPicker';
import { getDefaultStationTypeHex } from '@/utils/colorTheme.utils';

export interface StationUpdatePayload {
  name: string;
  hourlyRate: number;
  maxPlayers: number;
  occupancyRates: OccupancyRates;
  eventEnabled: boolean;
  type: string;
  slotDuration: number | null;
  pricingMode: PricingMode;
  durationTiers: DurationTier[];
  accentColor?: string | null;
}

interface EditStationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  station: Station | null;
  onSave: (stationId: string, updates: StationUpdatePayload) => Promise<boolean>;
}

const EditStationDialog: React.FC<EditStationDialogProps> = ({
  open,
  onOpenChange,
  station,
  onSave,
}) => {
  const [name, setName] = React.useState('');
  const [typeSlug, setTypeSlug] = React.useState('ps5');
  const [maxPlayers, setMaxPlayers] = React.useState(1);
  const [occupancyRates, setOccupancyRates] = React.useState<OccupancyRates>({});
  const [pricingMode, setPricingMode] = React.useState<PricingMode>('static');
  const [durationTiers, setDurationTiers] = React.useState<DurationTier[]>(getDefaultDurationTiers());
  const [staticRate, setStaticRate] = React.useState(200);
  const [publicBooking, setPublicBooking] = React.useState(true);
  const [selectedType, setSelectedType] = React.useState<StationType | null>(null);
  const [accentColor, setAccentColor] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);

  React.useEffect(() => {
    if (station) {
      setName(station.name);
      setTypeSlug(station.type);
      setMaxPlayers(station.maxPlayers ?? 1);
      setOccupancyRates(station.occupancyRates ?? {});
      setPricingMode(resolvePricingMode(station));
      setDurationTiers(
        station.durationTiers?.length ? station.durationTiers : getDefaultDurationTiers()
      );
      setStaticRate(station.hourlyRate);
      setPublicBooking(station.eventEnabled !== false);
      setAccentColor(station.accentColor ?? null);
      setSelectedType(null);
    }
  }, [station]);

  const slotDuration =
    selectedType?.defaultSlotMinutes ??
    station?.slotDuration ??
    defaultSlotMinutesForSlug(typeSlug);
  const rateSuffix = getRateSuffix({ type: typeSlug, slotDuration, category: null });

  const handleTypeChange = (slug: string, type: StationType | null) => {
    setTypeSlug(slug);
    setSelectedType(type);
    if (type) {
      setMaxPlayers(type.defaultMaxPlayers);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!station) return;

    setIsLoading(true);
    try {
      const rates = pricingMode === 'per_player' ? occupancyRates : {};
      const tiers = pricingMode === 'time_based' ? durationTiers : [];
      const hourlyRate =
        pricingMode === 'static'
          ? staticRate
          : pricingMode === 'time_based'
            ? getTierPackagePrice(
                durationTiers[durationTiers.length - 1]?.minutes ?? 60,
                durationTiers
              )
            : totalRateAtMaxOccupancy(maxPlayers, occupancyRates, station.hourlyRate);

      const success = await onSave(station.id, {
        name,
        hourlyRate,
        maxPlayers,
        occupancyRates: rates,
        eventEnabled: publicBooking,
        type: typeSlug,
        slotDuration,
        pricingMode,
        durationTiers: tiers,
        accentColor,
      });
      if (success) onOpenChange(false);
    } finally {
      setIsLoading(false);
    }
  };

  if (!station) return null;

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange} mobileVariant="sheet-bottom">
      <ResponsiveDialogContent className="sm:max-w-[520px] max-h-[90vh] overflow-y-auto" mobileClassName="px-4 pt-3">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit size={16} />
            Edit Station
          </DialogTitle>
          <DialogDescription>Update name, type, pricing, and booking visibility</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="name">Station Name</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>

          <div className="space-y-2">
            <Label>Station Type</Label>
            <StationTypePicker value={typeSlug} onChange={handleTypeChange} />
          </div>

          <StationPricingModeField
            value={pricingMode}
            onChange={setPricingMode}
            stationType={typeSlug}
            slotDuration={slotDuration}
          />

          {pricingMode === 'static' ? (
            <div className="space-y-2">
              <Label>Rate{rateSuffix}</Label>
              <Input
                type="number"
                min={0}
                step={10}
                value={staticRate}
                onChange={(e) => setStaticRate(Number(e.target.value) || 0)}
              />
            </div>
          ) : pricingMode === 'time_based' ? (
            <DurationTiersEditor tiers={durationTiers} onChange={setDurationTiers} />
          ) : (
            <>
              <div className="space-y-2">
                <Label htmlFor="maxPlayers">Max Players</Label>
                <Input
                  id="maxPlayers"
                  type="number"
                  min={1}
                  max={30}
                  value={maxPlayers}
                  onChange={(e) => setMaxPlayers(Number(e.target.value) || 1)}
                />
              </div>

              <OccupancyRatesEditor
                maxPlayers={maxPlayers}
                rates={occupancyRates}
                onChange={setOccupancyRates}
                stationType={typeSlug}
                slotDuration={slotDuration}
              />
            </>
          )}

          <div className="space-y-2 rounded-lg border p-3">
            <Label>Card color tint</Label>
            <p className="text-xs text-muted-foreground mb-2">
              Optional override — defaults to the color for this station type.
            </p>
            <AccentColorPicker
              value={accentColor}
              defaultHex={getDefaultStationTypeHex(typeSlug)}
              onChange={setAccentColor}
            />
          </div>

          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <Label>Visible on public booking</Label>
              <p className="text-xs text-muted-foreground">Show on booking page</p>
            </div>
            <Switch checked={publicBooking} onCheckedChange={setPublicBooking} />
          </div>

          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" className="bg-cuephoria-purple hover:bg-cuephoria-purple/80" disabled={isLoading || !name}>
              {isLoading ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </form>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
};

export default EditStationDialog;
