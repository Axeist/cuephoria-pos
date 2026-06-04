import React from 'react';
import { Button } from './ui/button';
import { DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { ResponsiveDialog, ResponsiveDialogContent } from './ui/responsive-dialog';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Station } from '@/types/pos.types';
import { Edit } from 'lucide-react';
import { OccupancyRatesEditor } from '@/components/station/OccupancyRatesEditor';
import type { OccupancyRates } from '@/utils/stationPricing';
import { Switch } from '@/components/ui/switch';

export interface StationUpdatePayload {
  name: string;
  hourlyRate: number;
  maxPlayers: number;
  occupancyRates: OccupancyRates;
  eventEnabled: boolean;
  category: string | null;
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
  const [maxPlayers, setMaxPlayers] = React.useState(1);
  const [occupancyRates, setOccupancyRates] = React.useState<OccupancyRates>({});
  const [publicBooking, setPublicBooking] = React.useState(true);
  const [isLoading, setIsLoading] = React.useState(false);

  React.useEffect(() => {
    if (station) {
      setName(station.name);
      setMaxPlayers(station.maxPlayers ?? 1);
      setOccupancyRates(station.occupancyRates ?? {});
      setPublicBooking(station.eventEnabled !== false);
    }
  }, [station]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!station) return;

    setIsLoading(true);
    try {
      const success = await onSave(station.id, {
        name,
        hourlyRate: station.hourlyRate,
        maxPlayers,
        occupancyRates,
        eventEnabled: publicBooking,
        category: station.category ?? null,
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
          <DialogDescription>Update name, max players, and occupancy pricing</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="name">Station Name</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="maxPlayers">Max Players</Label>
            <Input
              id="maxPlayers"
              type="number"
              min={1}
              max={8}
              value={maxPlayers}
              onChange={(e) => setMaxPlayers(Number(e.target.value) || 1)}
            />
          </div>

          <OccupancyRatesEditor
            maxPlayers={maxPlayers}
            rates={occupancyRates}
            onChange={setOccupancyRates}
            stationType={station.type}
            slotDuration={station.slotDuration}
          />

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
