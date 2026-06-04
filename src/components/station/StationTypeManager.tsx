import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useStationTypes } from '@/hooks/useStationTypes';
import { useToast } from '@/hooks/use-toast';
import { Layers, RefreshCw, Trash2 } from 'lucide-react';
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

const StationTypeManager: React.FC = () => {
  const { stationTypes, loading, refresh, removeType } = useStationTypes();
  const { toast } = useToast();
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const handleDelete = async () => {
    if (!deleteId) return;
    const target = stationTypes.find((t) => t.id === deleteId);
    if (target && presetSlugs.has(target.slug)) {
      toast({
        title: 'Cannot delete',
        description: 'Built-in types (PS5, 8 Ball, Snooker, Turf) cannot be removed.',
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

  return (
    <>
      <Card className="border-cuephoria-purple/20">
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-base font-heading flex items-center gap-2">
            <Layers className="h-4 w-4 text-cuephoria-lightpurple" />
            Station Types
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={() => void refresh()} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground mb-3">
            PS5, 8 Ball, Snooker, and Turf are included by default. Add custom types from the Add Station dialog.
          </p>
          <div className="flex flex-wrap gap-2">
            {stationTypes.map((type) => (
              <div
                key={type.id}
                className="flex items-center gap-1 rounded-full border border-cuephoria-purple/30 bg-cuephoria-purple/10 pl-3 pr-1 py-1"
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
              <p className="text-sm text-muted-foreground">No types yet — add a station to seed defaults.</p>
            )}
          </div>
        </CardContent>
      </Card>

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

export default StationTypeManager;
