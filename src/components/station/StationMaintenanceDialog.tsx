import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Wrench, Clock, User } from 'lucide-react';
import { MAINTENANCE_DURATION_OPTIONS } from '@/types/stationMaintenance.types';

interface StationMaintenanceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stationName: string;
  defaultStartedBy?: string;
  onConfirm: (durationMinutes: number, startedByName: string) => Promise<boolean>;
}

const StationMaintenanceDialog: React.FC<StationMaintenanceDialogProps> = ({
  open,
  onOpenChange,
  stationName,
  defaultStartedBy = '',
  onConfirm,
}) => {
  const [durationMinutes, setDurationMinutes] = useState<string>('15');
  const [startedByName, setStartedByName] = useState(defaultStartedBy);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setStartedByName(defaultStartedBy);
      setDurationMinutes('15');
    }
  }, [open, defaultStartedBy]);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const ok = await onConfirm(Number(durationMinutes), startedByName);
      if (ok) onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md border-amber-500/20 bg-gradient-to-b from-background to-amber-950/10">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-heading">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500/15 text-amber-400">
              <Wrench className="h-4 w-4" />
            </span>
            Start maintenance
          </DialogTitle>
          <DialogDescription>
            <span className="font-medium text-foreground">{stationName}</span> will be hidden from public
            booking and blocked from new sessions until maintenance ends.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="maintenance-duration" className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-amber-400" />
              Duration
            </Label>
            <Select value={durationMinutes} onValueChange={setDurationMinutes}>
              <SelectTrigger id="maintenance-duration">
                <SelectValue placeholder="Select duration" />
              </SelectTrigger>
              <SelectContent>
                {MAINTENANCE_DURATION_OPTIONS.map((mins) => (
                  <SelectItem key={mins} value={String(mins)}>
                    {mins} minutes
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="maintenance-started-by" className="flex items-center gap-1.5">
              <User className="h-3.5 w-3.5 text-amber-400" />
              Started by
            </Label>
            <Input
              id="maintenance-started-by"
              value={startedByName}
              onChange={(e) => setStartedByName(e.target.value)}
              placeholder="Staff name"
              autoComplete="name"
            />
          </div>

          <div className="rounded-lg border border-amber-500/25 bg-amber-500/10 px-3 py-2.5 text-xs text-amber-100/90">
            A countdown timer will appear on the station card. Maintenance auto-ends when the timer reaches zero.
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            onClick={() => void handleSubmit()}
            disabled={isSubmitting || !startedByName.trim()}
            className="bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white"
          >
            {isSubmitting ? 'Starting…' : 'Start maintenance'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default StationMaintenanceDialog;
