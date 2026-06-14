import React, { useState, useEffect } from 'react';
import { ResponsiveDialog, ResponsiveDialogContent } from '@/components/ui/responsive-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { stationTypeLabel } from '@/utils/stationTypeUtils';

interface StationOption {
  id: string;
  name: string;
  type: string;
  category?: string | null;
}

interface Booking {
  id: string;
  station_id: string;
  location_id?: string | null;
  booking_date: string;
  start_time: string;
  end_time: string;
  duration: number;
  status: 'confirmed' | 'in-progress' | 'completed' | 'cancelled' | 'no-show';
  notes?: string;
  final_price?: number;
  station: {
    name: string;
    type: string;
    category?: string | null;
  };
  customer: {
    name: string;
    phone: string;
    email?: string;
  };
}

interface BookingEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  booking: Booking | null;
  locationId?: string | null;
  onBookingUpdated: () => void;
}

function normalizeTimeForInput(time: string): string {
  const parts = time.split(':');
  if (parts.length >= 2) {
    return `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}`;
  }
  return time;
}

function stationsInSameCategory(
  stations: StationOption[],
  type: string,
  category: string | null | undefined,
): StationOption[] {
  const normalizedCategory = category ?? null;
  return stations.filter(
    (s) => s.type === type && (s.category ?? null) === normalizedCategory,
  );
}

export function BookingEditDialog({
  open,
  onOpenChange,
  booking,
  locationId,
  onBookingUpdated,
}: BookingEditDialogProps) {
  const [loading, setLoading] = useState(false);
  const [stationsLoading, setStationsLoading] = useState(false);
  const [stationOptions, setStationOptions] = useState<StationOption[]>([]);
  const [formData, setFormData] = useState({
    station_id: '',
    booking_date: '',
    start_time: '',
    end_time: '',
    status: 'confirmed' as 'confirmed' | 'in-progress' | 'completed' | 'cancelled' | 'no-show',
    notes: '',
    final_price: '',
  });

  useEffect(() => {
    if (!booking) return;

    setFormData({
      station_id: booking.station_id,
      booking_date: booking.booking_date,
      start_time: normalizeTimeForInput(booking.start_time),
      end_time: normalizeTimeForInput(booking.end_time),
      status: booking.status,
      notes: booking.notes || '',
      final_price:
        booking.final_price != null && Number.isFinite(booking.final_price)
          ? Number(booking.final_price).toFixed(2)
          : '',
    });
  }, [booking]);

  useEffect(() => {
    if (!open || !booking) {
      setStationOptions([]);
      return;
    }

    let cancelled = false;

    async function loadStations() {
      setStationsLoading(true);
      try {
        const resolvedLocationId = locationId ?? booking?.location_id ?? null;
        let query = supabase.from('stations').select('id, name, type, category');

        if (resolvedLocationId) {
          query = query.eq('location_id', resolvedLocationId);
        }

        const { data, error } = await query.order('name');

        if (error?.code === '42703') {
          let fallbackQuery = supabase.from('stations').select('id, name, type');
          if (resolvedLocationId) {
            fallbackQuery = fallbackQuery.eq('location_id', resolvedLocationId);
          }
          const fallback = await fallbackQuery.order('name');
          if (fallback.error) throw fallback.error;
          if (!cancelled) {
            setStationOptions(
              stationsInSameCategory(
                (fallback.data ?? []) as StationOption[],
                booking!.station.type,
                booking!.station.category,
              ),
            );
          }
          return;
        }

        if (error) throw error;

        if (!cancelled) {
          setStationOptions(
            stationsInSameCategory(
              (data ?? []) as StationOption[],
              booking!.station.type,
              booking!.station.category,
            ),
          );
        }
      } catch (error) {
        console.error('Error loading stations for booking edit:', error);
        if (!cancelled) {
          setStationOptions([]);
          toast.error('Failed to load stations for this booking');
        }
      } finally {
        if (!cancelled) setStationsLoading(false);
      }
    }

    loadStations();

    return () => {
      cancelled = true;
    };
  }, [open, booking, locationId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!booking) return;

    if (!formData.station_id) {
      toast.error('Please select a station');
      return;
    }

    setLoading(true);
    try {
      const startTimeNormalized = formData.start_time.length === 5
        ? `${formData.start_time}:00`
        : formData.start_time;
      const endTimeNormalized = formData.end_time.length === 5
        ? `${formData.end_time}:00`
        : formData.end_time;

      const updateData: Record<string, unknown> = {
        station_id: formData.station_id,
        booking_date: formData.booking_date,
        start_time: startTimeNormalized,
        end_time: endTimeNormalized,
        status: formData.status,
        notes: formData.notes || null,
        status_updated_at: new Date().toISOString(),
        status_updated_by: 'admin',
      };

      if (formData.final_price) {
        updateData.final_price = parseFloat(formData.final_price);
      }

      const startTime = new Date(`2000-01-01T${formData.start_time}`);
      const endTime = new Date(`2000-01-01T${formData.end_time}`);
      updateData.duration = Math.round((endTime.getTime() - startTime.getTime()) / (1000 * 60));

      const { error } = await supabase
        .from('bookings')
        .update(updateData)
        .eq('id', booking.id);

      if (error) throw error;

      toast.success('Booking updated successfully');
      onBookingUpdated();
      onOpenChange(false);
    } catch (error) {
      console.error('Error updating booking:', error);
      toast.error('Failed to update booking');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  if (!booking) return null;

  const stationTypeName = stationTypeLabel(booking.station.type);
  const categoryLabel = booking.station.category ? ` · ${booking.station.category}` : '';

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange} mobileVariant="sheet-bottom">
      <ResponsiveDialogContent className="max-w-md" mobileClassName="px-4 pt-3">
        <DialogHeader>
          <DialogTitle>Edit Booking</DialogTitle>
          <DialogDescription>
            Update booking details for {booking.customer.name}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="station_id">Station</Label>
            <Select
              value={formData.station_id}
              onValueChange={(value) => handleChange('station_id', value)}
              disabled={stationsLoading || stationOptions.length === 0}
            >
              <SelectTrigger id="station_id">
                <SelectValue
                  placeholder={
                    stationsLoading
                      ? 'Loading stations...'
                      : stationOptions.length === 0
                        ? 'No stations available'
                        : 'Select station'
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {stationOptions.map((station) => (
                  <SelectItem key={station.id} value={station.id}>
                    {station.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="mt-1 text-xs text-muted-foreground">
              Same category only — {stationTypeName}
              {categoryLabel}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="booking_date">Date</Label>
              <Input
                id="booking_date"
                type="date"
                value={formData.booking_date}
                onChange={(e) => handleChange('booking_date', e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="status">Status</Label>
              <Select value={formData.status} onValueChange={(value) => handleChange('status', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="confirmed">Confirmed</SelectItem>
                  <SelectItem value="rescheduled">Rescheduled</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="no-show">No Show</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="start_time">Start Time</Label>
              <Input
                id="start_time"
                type="time"
                value={formData.start_time}
                onChange={(e) => handleChange('start_time', e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="end_time">End Time</Label>
              <Input
                id="end_time"
                type="time"
                value={formData.end_time}
                onChange={(e) => handleChange('end_time', e.target.value)}
                required
              />
            </div>
          </div>

          <div>
            <Label htmlFor="final_price">Final Price (₹)</Label>
            <Input
              id="final_price"
              type="number"
              step="0.01"
              min="0"
              value={formData.final_price}
              onChange={(e) => handleChange('final_price', e.target.value)}
              placeholder="Optional"
            />
          </div>

          <div>
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => handleChange('notes', e.target.value)}
              placeholder="Additional notes..."
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || stationsLoading || !formData.station_id}>
              {loading ? 'Updating...' : 'Update Booking'}
            </Button>
          </DialogFooter>
        </form>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
