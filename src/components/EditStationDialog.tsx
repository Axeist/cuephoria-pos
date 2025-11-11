
import React from 'react';
import { Button } from './ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Station } from '@/types/pos.types';
import { Edit } from 'lucide-react';

interface EditStationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  station: Station | null;
  onSave: (stationId: string, name: string, type: string, hourlyRate: number) => Promise<boolean>;
}

const EditStationDialog: React.FC<EditStationDialogProps> = ({
  open,
  onOpenChange,
  station,
  onSave,
}) => {
  const [name, setName] = React.useState('');
  const [type, setType] = React.useState('');
  const [hourlyRate, setHourlyRate] = React.useState(0);
  const [isLoading, setIsLoading] = React.useState(false);
  
  // Name and type can be edited independently
  const handleNameChange = (value: string) => {
    setName(value);
  };
  
  const handleTypeChange = (value: string) => {
    setType(value);
  };

  // Update form when station changes
  React.useEffect(() => {
    if (station) {
      setName(station.name);
      setType(station.type);
      setHourlyRate(station.hourlyRate);
    }
  }, [station]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!station) return;
    
    setIsLoading(true);
    try {
      const success = await onSave(station.id, name, type, hourlyRate);
      if (success) {
        onOpenChange(false);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] bg-background border-cuephoria-purple">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit size={16} />
            Edit Station
          </DialogTitle>
          <DialogDescription>
            Update station name and hourly rate
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Station Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="Enter station name"
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="type">Station Type</Label>
            <Input
              id="type"
              value={type}
              onChange={(e) => handleTypeChange(e.target.value)}
              placeholder="e.g., ps5, 8ball, vr, etc."
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="hourlyRate">Hourly Rate</Label>
            <Input
              id="hourlyRate"
              type="number"
              value={hourlyRate}
              onChange={(e) => setHourlyRate(parseFloat(e.target.value))}
              placeholder="Enter hourly rate"
              min={0}
              step={0.01}
              required
            />
          </div>
          
          <DialogFooter className="pt-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              className="bg-cuephoria-purple hover:bg-cuephoria-purple/80" 
              disabled={isLoading || !name || !type || hourlyRate <= 0}
            >
              {isLoading ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EditStationDialog;
