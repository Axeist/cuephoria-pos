import React, { useMemo, useState } from 'react';
import {
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ResponsiveDialog, ResponsiveDialogContent } from '@/components/ui/responsive-dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { usePOS } from '@/context/POSContext';
import { migrateStationData } from '@/services/stationMigrationService';
import { isLegacyControllerStation } from '@/utils/stationPricing';
import type { Station } from '@/types/pos.types';
import { ArrowRightLeft, AlertTriangle } from 'lucide-react';

interface ReplaceLegacyStationsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: () => void;
}

const ReplaceLegacyStationsDialog: React.FC<ReplaceLegacyStationsDialogProps> = ({
  open,
  onOpenChange,
  onComplete,
}) => {
  const { toast } = useToast();
  const { stations, refreshStations } = usePOS();
  const [targetStationId, setTargetStationId] = useState('');
  const [selectedLegacyIds, setSelectedLegacyIds] = useState<string[]>([]);
  const [isMigrating, setIsMigrating] = useState(false);

  const legacyStations = useMemo(
    () =>
      stations.filter(
        (s) =>
          isLegacyControllerStation(s) ||
          Boolean(s.teamName) ||
          /controller/i.test(s.name)
      ),
    [stations]
  );

  const targetCandidates = useMemo(
    () =>
      stations.filter(
        (s) =>
          !legacyStations.some((l) => l.id === s.id) &&
          (s.maxPlayers > 1 || Object.keys(s.occupancyRates ?? {}).length > 0)
      ),
    [stations, legacyStations]
  );

  const toggleLegacy = (id: string) => {
    setSelectedLegacyIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleMigrate = async () => {
    if (!targetStationId || selectedLegacyIds.length === 0) {
      toast({
        title: 'Selection required',
        description: 'Pick a new station and at least one legacy controller to migrate.',
        variant: 'destructive',
      });
      return;
    }

    const occupied = legacyStations.filter(
      (s) => selectedLegacyIds.includes(s.id) && s.isOccupied
    );
    if (occupied.length > 0) {
      toast({
        title: 'Active sessions',
        description: `End sessions on ${occupied.map((s) => s.name).join(', ')} before migrating.`,
        variant: 'destructive',
      });
      return;
    }

    setIsMigrating(true);
    try {
      const result = await migrateStationData(selectedLegacyIds, targetStationId);
      toast({
        title: 'Migration complete',
        description: `Moved ${result.sessions_updated} session(s) and ${result.bookings_updated} booking(s). Removed ${result.migrated_stations} legacy station(s).`,
      });
      setSelectedLegacyIds([]);
      setTargetStationId('');
      onOpenChange(false);
      await refreshStations?.();
      onComplete();
    } catch (error) {
      toast({
        title: 'Migration failed',
        description: error instanceof Error ? error.message : 'Could not migrate stations',
        variant: 'destructive',
      });
    } finally {
      setIsMigrating(false);
    }
  };

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange} mobileVariant="sheet-bottom">
      <ResponsiveDialogContent className="sm:max-w-[520px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowRightLeft className="h-5 w-5" />
            Replace Legacy Controllers
          </DialogTitle>
          <DialogDescription>
            Move session and booking history from old controller rows to a new multi-player
            station, then delete the legacy rows.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="rounded-md border border-amber-500/30 bg-amber-500/10 p-3 flex gap-2 text-sm">
            <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500 mt-0.5" />
            <p>Create your new PS5 console station first, then select legacy controllers to merge into it.</p>
          </div>

          <div className="space-y-2">
            <Label>New station (target)</Label>
            <Select value={targetStationId} onValueChange={setTargetStationId}>
              <SelectTrigger>
                <SelectValue placeholder="Select consolidated station" />
              </SelectTrigger>
              <SelectContent>
                {targetCandidates.map((s: Station) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name} (up to {s.maxPlayers} players)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {targetCandidates.length === 0 && (
              <p className="text-xs text-muted-foreground">Add a new station with max players &gt; 1 first.</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Legacy controllers to retire</Label>
            {legacyStations.length === 0 ? (
              <p className="text-sm text-muted-foreground">No legacy controller stations found.</p>
            ) : (
              <div className="max-h-48 overflow-y-auto space-y-2 border rounded-md p-2">
                {legacyStations.map((s) => (
                  <label
                    key={s.id}
                    className="flex items-center gap-2 text-sm cursor-pointer rounded px-2 py-1 hover:bg-muted/50"
                  >
                    <Checkbox
                      checked={selectedLegacyIds.includes(s.id)}
                      onCheckedChange={() => toggleLegacy(s.id)}
                    />
                    <span className="flex-1">{s.name}</span>
                    {s.teamName && (
                      <span className="text-xs text-muted-foreground">{s.teamName}</span>
                    )}
                    {s.isOccupied && (
                      <span className="text-xs text-red-500">In use</span>
                    )}
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isMigrating}>
            Cancel
          </Button>
          <Button onClick={handleMigrate} disabled={isMigrating || !targetStationId || selectedLegacyIds.length === 0}>
            {isMigrating ? 'Migrating...' : 'Migrate & delete legacy'}
          </Button>
        </DialogFooter>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
};

export default ReplaceLegacyStationsDialog;
