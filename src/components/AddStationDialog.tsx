import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ResponsiveDialog, ResponsiveDialogContent } from '@/components/ui/responsive-dialog';
import { DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { usePOS } from '@/context/POSContext';
import { useLocation } from '@/context/LocationContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import {
  OccupancyRatesEditor,
  defaultMaxPlayersForType,
  defaultSlotDuration,
} from '@/components/station/OccupancyRatesEditor';
import {
  buildDefaultOccupancyRates,
  totalRateAtMaxOccupancy,
  type OccupancyRates,
} from '@/utils/stationPricing';
import type { Station } from '@/types/pos.types';
import { Switch } from '@/components/ui/switch';

const stationSchema = z.object({
  name: z.string().min(2, { message: 'Station name must be at least 2 characters.' }),
  type: z.enum(['ps5', '8ball', 'vr'], { required_error: 'Please select a station type.' }),
  category: z.string().optional(),
  maxPlayers: z.coerce.number().min(1).max(8),
  publicBooking: z.boolean(),
});

type StationFormValues = z.infer<typeof stationSchema>;

interface AddStationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const AddStationDialog: React.FC<AddStationDialogProps> = ({ open, onOpenChange }) => {
  const { toast } = useToast();
  const { stations, setStations, categories } = usePOS();
  const { activeLocationId } = useLocation();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [occupancyRates, setOccupancyRates] = useState<OccupancyRates>({});

  const form = useForm<StationFormValues>({
    resolver: zodResolver(stationSchema),
    defaultValues: {
      name: '',
      type: 'ps5',
      category: '',
      maxPlayers: 4,
      publicBooking: true,
    },
  });

  const selectedType = form.watch('type');
  const maxPlayers = form.watch('maxPlayers');

  useEffect(() => {
    if (open) {
      const mp = defaultMaxPlayersForType(selectedType);
      form.setValue('maxPlayers', mp);
      setOccupancyRates(buildDefaultOccupancyRates(mp, 200, 100));
    }
  }, [selectedType, open]);

  useEffect(() => {
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
  }, [maxPlayers]);

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
      const slotDuration = defaultSlotDuration(values.type);
      const category = values.category?.trim() || null;
      const hourlyRate = totalRateAtMaxOccupancy(
        values.maxPlayers,
        occupancyRates,
        100 * values.maxPlayers
      );

      const newStation: Station = {
        id: stationId,
        name: values.name,
        type: values.type,
        hourlyRate,
        isOccupied: false,
        currentSession: null,
        category,
        eventEnabled: values.publicBooking,
        slotDuration,
        maxPlayers: values.maxPlayers,
        occupancyRates,
      };

      const { error } = await supabase.from('stations').insert({
        id: stationId,
        name: values.name,
        type: values.type,
        hourly_rate: hourlyRate,
        is_occupied: false,
        category,
        event_enabled: values.publicBooking,
        slot_duration: slotDuration,
        max_players: values.maxPlayers,
        occupancy_rates: occupancyRates,
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
      form.reset();
      setOccupancyRates(buildDefaultOccupancyRates(4, 200, 100));
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
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Station Type</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="ps5">PlayStation 5</SelectItem>
                      <SelectItem value="8ball">8-Ball Table</SelectItem>
                      <SelectItem value="vr">VR Gaming</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category (optional)</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || 'none'}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {categories
                        .filter((c) => c !== 'uncategorized')
                        .map((cat) => (
                          <SelectItem key={cat} value={cat}>
                            {cat}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="maxPlayers"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Max Players</FormLabel>
                  <FormControl>
                    <Input type="number" min={1} max={8} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <OccupancyRatesEditor
              maxPlayers={maxPlayers}
              rates={occupancyRates}
              onChange={setOccupancyRates}
              stationType={selectedType}
              slotDuration={defaultSlotDuration(selectedType)}
            />

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
