import React, { useState } from 'react';
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
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Plus } from 'lucide-react';
import type { StationType } from '@/types/stationType.types';
import { useStationTypes } from '@/hooks/useStationTypes';
import { useToast } from '@/hooks/use-toast';

interface StationTypePickerProps {
  value: string;
  onChange: (slug: string, type: StationType | null) => void;
}

export const StationTypePicker: React.FC<StationTypePickerProps> = ({ value, onChange }) => {
  const { stationTypes, loading, addType } = useStationTypes();
  const { toast } = useToast();
  const [addOpen, setAddOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newMaxPlayers, setNewMaxPlayers] = useState(4);
  const [newSlotMinutes, setNewSlotMinutes] = useState(60);
  const [saving, setSaving] = useState(false);

  const selected = stationTypes.find((t) => t.slug === value) ?? null;

  const handleSelect = (slug: string) => {
    const type = stationTypes.find((t) => t.slug === slug) ?? null;
    onChange(slug, type);
  };

  const handleAddType = async () => {
    if (!newName.trim()) return;
    setSaving(true);
    try {
      const created = await addType({
        name: newName.trim(),
        defaultMaxPlayers: newMaxPlayers,
        defaultSlotMinutes: newSlotMinutes,
      });
      onChange(created.slug, created);
      setAddOpen(false);
      setNewName('');
      toast({ title: 'Type created', description: `"${created.name}" is ready to use.` });
    } catch {
      toast({ title: 'Error', description: 'Could not create station type.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Select value={value || undefined} onValueChange={handleSelect} disabled={loading}>
          <SelectTrigger className="flex-1">
            <SelectValue placeholder={loading ? 'Loading types…' : 'Select station type'} />
          </SelectTrigger>
          <SelectContent>
            {stationTypes.map((type) => (
              <SelectItem key={type.id} value={type.slug}>
                {type.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button type="button" variant="outline" size="icon" onClick={() => setAddOpen(true)} title="Add type">
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {selected && (
        <p className="text-xs text-muted-foreground">
          Default {selected.defaultMaxPlayers} players · {selected.defaultSlotMinutes} min slots
        </p>
      )}

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>New station type</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label>Name</Label>
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. VR, Arcade, Darts"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label>Default max players</Label>
                <Input
                  type="number"
                  min={1}
                  max={30}
                  value={newMaxPlayers}
                  onChange={(e) => setNewMaxPlayers(Number(e.target.value) || 1)}
                />
              </div>
              <div className="space-y-1">
                <Label>Slot (minutes)</Label>
                <Input
                  type="number"
                  min={15}
                  step={15}
                  value={newSlotMinutes}
                  onChange={(e) => setNewSlotMinutes(Number(e.target.value) || 60)}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddType} disabled={saving || !newName.trim()}>
              {saving ? 'Saving…' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default StationTypePicker;
