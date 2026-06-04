import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useStationTypes } from '@/hooks/useStationTypes';
import { useToast } from '@/hooks/use-toast';
import { Layers, Plus, RefreshCw, Trash2 } from 'lucide-react';
import { DEFAULT_STATION_TYPES } from '@/types/stationType.types';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const presetSlugs = new Set(DEFAULT_STATION_TYPES.map((t) => t.slug));

interface StationTypesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const StationTypesDialog: React.FC<StationTypesDialogProps> = ({ open, onOpenChange }) => {
  const { stationTypes, loading, refresh, addType, removeType } = useStationTypes();
  const { toast } = useToast();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newMaxPlayers, setNewMaxPlayers] = useState(4);
  const [newSlotMinutes, setNewSlotMinutes] = useState(60);
  const [saving, setSaving] = useState(false);

  const handleDelete = async () => {
    if (!deleteId) return;
    const target = stationTypes.find((t) => t.id === deleteId);
    if (target && presetSlugs.has(target.slug)) {
      toast({
        title: 'Cannot delete',
        description: 'Built-in types (PS5, 8 Ball, Snooker, Turf, VR) cannot be removed.',
        variant: 'destructive',
      });
      setDeleteId(null);
      return;
    }
    try {
      await removeType(deleteId);
      toast({ title: 'Type removed' });
    } catch {
      toast({
        title: 'Cannot delete',
        description: 'Remove stations using this type first.',
        variant: 'destructive',
      });
    }
    setDeleteId(null);
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
      toast({
        title: 'Type created',
        description: `"${created.name}" is ready to use when adding stations.`,
      });
      setNewName('');
      setShowAddForm(false);
    } catch {
      toast({ title: 'Error', description: 'Could not create station type.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-heading">
              <Layers className="h-5 w-5 text-cuephoria-lightpurple" />
              Station Types
            </DialogTitle>
            <DialogDescription>
              PS5, 8 Ball, Snooker, Turf, and VR are included by default. Add custom types for
              Arcade, Darts, etc.
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-center justify-between gap-2">
            <Button variant="ghost" size="sm" onClick={() => void refresh()} disabled={loading}>
              <RefreshCw className={`mr-1.5 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button size="sm" variant="outline" onClick={() => setShowAddForm((v) => !v)}>
              <Plus className="mr-1.5 h-4 w-4" />
              Add custom type
            </Button>
          </div>

          {showAddForm && (
            <div className="space-y-3 rounded-lg border border-cuephoria-purple/30 bg-cuephoria-purple/5 p-4">
              <div className="space-y-1">
                <Label>Type name</Label>
                <Input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Arcade, Darts, Sim Racing"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
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
              <DialogFooter className="gap-2 sm:justify-end px-0 pb-0">
                <Button variant="outline" size="sm" onClick={() => setShowAddForm(false)}>
                  Cancel
                </Button>
                <Button size="sm" onClick={handleAddType} disabled={saving || !newName.trim()}>
                  {saving ? 'Saving…' : 'Create type'}
                </Button>
              </DialogFooter>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            {stationTypes.map((type) => (
              <div
                key={type.id}
                className="flex items-center gap-1 rounded-full border border-cuephoria-purple/30 bg-cuephoria-purple/10 pl-3 pr-1 py-1.5"
              >
                <Badge variant="secondary" className="bg-transparent border-0 px-0 text-sm">
                  {type.name}
                </Badge>
                <span className="text-[10px] text-muted-foreground mr-1">
                  {type.defaultMaxPlayers}p · {type.defaultSlotMinutes}m
                </span>
                {!presetSlugs.has(type.slug) && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-muted-foreground hover:text-red-500"
                    onClick={() => setDeleteId(type.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                )}
              </div>
            ))}
            {stationTypes.length === 0 && !loading && (
              <p className="text-sm text-muted-foreground">
                No types yet — add a station to seed defaults.
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete station type?</AlertDialogTitle>
            <AlertDialogDescription>
              Existing stations keep this type slug but it will no longer appear in the picker.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default StationTypesDialog;
