import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { ResponsiveDialog, ResponsiveDialogContent } from '@/components/ui/responsive-dialog';
import { DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { usePOS } from '@/context/POSContext';
import { useLocation } from '@/context/LocationContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { OccupancyRatesEditor } from '@/components/station/OccupancyRatesEditor';
import { StationTypePicker } from '@/components/station/StationTypePicker';
import { StationPricingModeField } from '@/components/station/StationPricingModeField';
import {
  buildDefaultOccupancyRates,
  getRateSuffix,
  totalRateAtMaxOccupancy,
  type OccupancyRates,
  type PricingMode,
} from '@/utils/stationPricing';
import {
  defaultMaxPlayersForSlug,
  defaultPricingModeForSlug,
  defaultSlotMinutesForSlug,
} from '@/utils/stationTypeUtils';
import type { Station } from '@/types/pos.types';
import type { StationType } from '@/types/stationType.types';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

const stationSchema = z.object({
  name: z.string().min(2, { message: 'Station name must be at least 2 characters.' }),
  type: z.string().min(1, { message: 'Select a station type.' }),
  maxPlayers: z.coerce.number().min(1).max(30),
  publicBooking: z.boolean(),
});

type StationFormValues = z.infer<typeof stationSchema>;

interface AddStationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const AddStationDialog: React.FC<AddStationDialogProps> = ({ open, onOpenChange }) => {
  const { toast } = useToast();
  const { stations, setStations } = usePOS();
  const { activeLocationId } = useLocation();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pricingMode, setPricingMode] = useState<PricingMode>('static');
  const [staticRate, setStaticRate] = useState(200);
  const [occupancyRates, setOccupancyRates] = useState<OccupancyRates>({});
  const [selectedType, setSelectedType] = useState<StationType | null>(null);

  const form = useForm<StationFormValues>({
    resolver: zodResolver(stationSchema),
    defaultValues: {
      name: '',
      type: 'ps5',
      maxPlayers: 4,
      publicBooking: true,
    },
  });

  const selectedSlug = form.watch('type');
  const maxPlayers = form.watch('maxPlayers');
  const slotDuration =
    selectedType?.defaultSlotMinutes ?? defaultSlotMinutesForSlug(selectedSlug);
  const rateSuffix = getRateSuffix({ type: selectedSlug, slotDuration, category: null });

  useEffect(() => {
    if (!open) return;
    form.reset({ name: '', type: 'ps5', maxPlayers: 4, publicBooking: true });
    setSelectedType(null);
    setPricingMode('per_player');
    setStaticRate(200);
    setOccupancyRates(buildDefaultOccupancyRates(4, 200, 100));
  }, [open, form]);

  useEffect(() => {
    if (pricingMode !== 'per_player') return;
    setOccupancyRates((prev) => {
      const next = { ...prev };
      for (let i = 1; i <= maxPlayers; i++) {
        if (next[String(i)] == null) {
          next[String(i)] = i === 1 ? 200 : 100;
        }
      }
      Object.keys(next).forEach((k) => {
        if (Number(k) > maxPlayers) delete next[k];
      });
      return next;
    });
  }, [maxPlayers, pricingMode]);

  const handleTypeChange = (slug: string, type: StationType | null) => {
    form.setValue('type', slug, { shouldValidate: true });
    setSelectedType(type);
    const mp = type?.defaultMaxPlayers ?? defaultMaxPlayersForSlug(slug);
    form.setValue('maxPlayers', mp);
    const mode = defaultPricingModeForSlug(slug);
    setPricingMode(mode);
    setOccupancyRates(buildDefaultOccupancyRates(mp, 200, 100));
    if (mode === 'static') {
      setStaticRate(slug === 'vr' ? 150 : 200);
    }
  };

  const onSubmit = async (values: StationFormValues) => {
    setIsSubmitting(true);
    try {
      if (!activeLocationId) {
        toast({
          title: 'Error',
          description: 'Select a branch before adding a station.',
          variant: 'destructive',
        });
        return;
      }

      const stationId = crypto.randomUUID();
      const rates = pricingMode === 'per_player' ? occupancyRates : {};
      const hourlyRate =
        pricingMode === 'static'
          ? staticRate
          : totalRateAtMaxOccupancy(values.maxPlayers, occupancyRates, 100 * values.maxPlayers);

      const newStation: Station = {
        id: stationId,
        name: values.name,
        type: values.type,
        hourlyRate,
        isOccupied: false,
        currentSession: null,
        category: null,
        eventEnabled: values.publicBooking,
        slotDuration,
        maxPlayers: values.maxPlayers,
        occupancyRates: rates,
        pricingMode,
      };

      const { error } = await supabase.from('stations').insert({
        id: stationId,
        name: values.name,
        type: values.type,
        hourly_rate: hourlyRate,
        is_occupied: false,
        category: null,
        event_enabled: values.publicBooking,
        slot_duration: slotDuration,
        max_players: values.maxPlayers,
        occupancy_rates: rates,
        pricing_mode: pricingMode,
        location_id: activeLocationId,
      });

      if (error) {
        console.error('Error adding station:', error);
        toast({
          title: 'Error',
          description: 'Could not add the station to the database',
          variant: 'destructive',
        });
        return;
      }

      setStations([...stations, newStation]);
      toast({ title: 'Station Added', description: `${values.name} has been added.` });
      onOpenChange(false);
    } catch (error) {
      console.error('Error in adding station:', error);
      toast({
        title: 'Error',
        description: 'Something went wrong while adding the station',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange} mobileVariant="sheet-bottom">
      <ResponsiveDialogContent className="sm:max-w-[520px] max-h-[90vh] overflow-y-auto" mobileClassName="px-4 pt-3">
        <DialogHeader>
          <DialogTitle className="text-xl font-heading gradient-text">Add New Station</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Station Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. PS5 Console 1" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="type"
              render={() => (
                <FormItem>
                  <FormLabel>Station Type</FormLabel>
                  <FormControl>
                    <StationTypePicker value={selectedSlug} onChange={handleTypeChange} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <StationPricingModeField
              value={pricingMode}
              onChange={setPricingMode}
              stationType={selectedSlug}
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
                  placeholder="Flat rate"
                />
                <p className="text-xs text-muted-foreground">
                  Same price regardless of player count — classic table / turf / VR slot pricing.
                </p>
              </div>
            ) : (
              <>
                <FormField
                  control={form.control}
                  name="maxPlayers"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Max Players</FormLabel>
                      <FormControl>
                        <Input type="number" min={1} max={30} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <OccupancyRatesEditor
                  maxPlayers={maxPlayers}
                  rates={occupancyRates}
                  onChange={setOccupancyRates}
                  stationType={selectedSlug}
                  slotDuration={slotDuration}
                />
              </>
            )}

            <FormField
              control={form.control}
              name="publicBooking"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <FormLabel>Visible on public booking</FormLabel>
                    <p className="text-xs text-muted-foreground">Show this station on the booking page</p>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />

            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-gradient-to-r from-cuephoria-purple to-cuephoria-lightpurple hover:opacity-90"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Adding...' : 'Add Station'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
};

export default AddStationDialog;
