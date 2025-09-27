import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { usePOS } from '@/context/POSContext';

const AddStationDialog = ({ open, onOpenChange }) => {
  const { fetchStations } = usePOS();
  const [stationName, setStationName] = useState('');
  const [stationType, setStationType] = useState('');
  const [hourlyRate, setHourlyRate] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!stationName.trim()) {
      toast.error('Station name is required');
      return;
    }
    
    if (!stationType) {
      toast.error('Station type is required');
      return;
    }
    
    if (!hourlyRate || isNaN(hourlyRate) || Number(hourlyRate) <= 0) {
      toast.error('Valid hourly rate is required');
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await supabase
        .from('stations')
        .insert([
          {
            name: stationName.trim(),
            type: stationType,
            hourly_rate: Number(hourlyRate),
            is_occupied: false,
            current_session_id: null
          }
        ]);

      if (error) throw error;

      toast.success(`${stationName} added successfully!`);
      
      // Reset form
      setStationName('');
      setStationType('');
      setHourlyRate('');
      
      // Refresh stations list
      await fetchStations();
      
      // Close dialog
      onOpenChange(false);
      
    } catch (error) {
      console.error('Error adding station:', error);
      toast.error('Failed to add station. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const getDefaultRateByType = (type) => {
    switch (type) {
      case 'ps5':
        return '200';
      case '8ball':
        return '150';
      case 'vr':
        return '300'; // VR typically has higher hourly rates
      default:
        return '';
    }
  };

  const handleTypeChange = (value) => {
    setStationType(value);
    setHourlyRate(getDefaultRateByType(value));
  };

  const handleClose = () => {
    // Reset form when closing
    setStationName('');
    setStationType('');
    setHourlyRate('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px] bg-gray-900 border-gray-800">
        <DialogHeader>
          <DialogTitle className="text-white">Add New Station</DialogTitle>
          <DialogDescription className="text-gray-400">
            Create a new gaming station for your venue.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="stationName" className="text-white">Station Name</Label>
            <Input
              id="stationName"
              value={stationName}
              onChange={(e) => setStationName(e.target.value)}
              placeholder="Enter station name"
              className="bg-gray-800 border-gray-700 text-white placeholder-gray-400"
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="stationType" className="text-white">Station Type</Label>
            <Select value={stationType} onValueChange={handleTypeChange} disabled={isLoading}>
              <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                <SelectValue placeholder="Select station type" />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-gray-700">
                <SelectItem value="ps5" className="text-white hover:bg-gray-700">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                    PlayStation 5
                  </div>
                </SelectItem>
                <SelectItem value="8ball" className="text-white hover:bg-gray-700">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    8-Ball Table
                  </div>
                </SelectItem>
                <SelectItem value="vr" className="text-white hover:bg-gray-700">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    VR Gaming
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="hourlyRate" className="text-white">
              Hourly Rate (₹)
              {stationType === 'vr' && (
                <span className="text-sm text-gray-400 ml-2">
                  (Billed per 15-minute session)
                </span>
              )}
            </Label>
            <Input
              id="hourlyRate"
              type="number"
              value={hourlyRate}
              onChange={(e) => setHourlyRate(e.target.value)}
              placeholder="Enter hourly rate"
              min="0"
              step="1"
              className="bg-gray-800 border-gray-700 text-white placeholder-gray-400"
              disabled={isLoading}
            />
            {stationType === 'vr' && hourlyRate && (
              <p className="text-xs text-gray-500">
                Per 15-min session: ₹{Math.round(Number(hourlyRate) / 4)}
              </p>
            )}
            {stationType && hourlyRate && (
              <p className="text-xs text-blue-400">
                {stationType === 'ps5' && 'Recommended: ₹150-300/hour for PS5 consoles'}
                {stationType === '8ball' && 'Recommended: ₹100-200/hour for pool tables'}
                {stationType === 'vr' && 'Recommended: ₹200-400/hour for VR headsets'}
              </p>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              className="bg-transparent border-gray-600 text-gray-300 hover:bg-gray-800"
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-cuephoria-purple hover:bg-cuephoria-purple/80"
              disabled={isLoading}
            >
              {isLoading ? 'Adding...' : 'Add Station'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddStationDialog;
