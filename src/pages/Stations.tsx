import React, { useMemo, useState } from 'react';
import { usePOS } from '@/context/POSContext';
import StationCard from '@/components/StationCard';
import { Card, CardContent } from '@/components/ui/card';
import { Gamepad2, Plus, Table2, Headset, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import AddStationDialog from '@/components/AddStationDialog';
import PinVerificationDialog from '@/components/PinVerificationDialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const Stations = () => {
  const { stations, setStations } = usePOS();
  const [openAddDialog, setOpenAddDialog] = useState(false);
  const [selectedTypeToAdd, setSelectedTypeToAdd] = useState<string | undefined>(undefined);
  const [openPinDialog, setOpenPinDialog] = useState(false);
  const { toast } = useToast();
  
  const stationsByType = useMemo(() => {
    const map = new Map<string, typeof stations>();
    for (const s of stations) {
      const key = s.type || 'unknown';
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(s);
    }
    return map;
  }, [stations]);
  
  // Separate stations by type
  const ps5Stations = stations.filter(station => station.type === 'ps5');
  const ballStations = stations.filter(station => station.type === '8ball');
  const vrStations = stations.filter(station => station.type === 'vr');

  // Count active stations
  const activePs5 = ps5Stations.filter(s => s.isOccupied).length;
  const activeBall = ballStations.filter(s => s.isOccupied).length;
  const activeVr = vrStations.filter(s => s.isOccupied).length;

  const handleAddStationClick = (type?: 'ps5' | '8ball' | 'vr') => {
    setSelectedTypeToAdd(type);
    setOpenPinDialog(true);
  };

  const handlePinSuccess = () => {
    setOpenAddDialog(true);
  };

  return (
    <div className="flex-1 space-y-4 p-4 sm:p-6 md:p-8 pt-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-slide-down">
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight gradient-text font-heading">Gaming Stations</h2>
        <div className="flex space-x-2 w-full sm:w-auto">
          <Button 
            className="bg-cuephoria-purple hover:bg-cuephoria-purple/80 text-sm sm:text-base"
            onClick={() => handleAddStationClick(undefined)}
          >
            <Plus className="mr-2 h-4 w-4" /> Add Station
          </Button>
        </div>
      </div>

      {/* PIN Verification Dialog */}
      <PinVerificationDialog 
        open={openPinDialog} 
        onOpenChange={setOpenPinDialog}
        onSuccess={handlePinSuccess}
        title="Admin Access Required"
        description="Enter the admin PIN to add a new game station"
      />

      {/* Add Station Dialog */}
      <AddStationDialog 
        open={openAddDialog} 
        onOpenChange={(o) => {
          if (!o) setSelectedTypeToAdd(undefined);
          setOpenAddDialog(o);
        }} 
        initialType={selectedTypeToAdd}
      />

      {/* Summary cards removed in favor of dynamic sections */}

      <div className="space-y-6">
        {[...stationsByType.keys()].map((type, sectionIndex) => {
          const group = stationsByType.get(type) || [];
          const activeCount = group.filter(s => s.isOccupied).length;
          
          const handleRename = async () => {
            const newName = window.prompt('Enter new section name:', type);
            const trimmed = (newName || '').trim();
            if (!trimmed || trimmed === type) return;
            
            const { error } = await supabase
              .from('stations')
              .update({ type: trimmed })
              .eq('type', type);
            if (error) {
              console.error('Error renaming section:', error);
              toast({
                title: 'Error',
                description: 'Failed to rename section',
                variant: 'destructive'
              });
              return;
            }
            setStations(prev => prev.map(s => s.type === type ? { ...s, type: trimmed } : s));
            toast({
              title: 'Section Renamed',
              description: `Renamed "${type}" to "${trimmed}"`,
            });
          };
          
          return (
            <div key={type} className={`animate-slide-up ${sectionIndex === 0 ? 'delay-200' : sectionIndex === 1 ? 'delay-300' : 'delay-400'}`}>
              <div className="flex items-center mb-4">
                {type.toLowerCase() === 'ps5' && <Gamepad2 className="h-5 w-5 text-cuephoria-lightpurple mr-2" />}
                {type.toLowerCase() === '8ball' && <Table2 className="h-5 w-5 text-green-500 mr-2" />}
                {type.toLowerCase() === 'vr' && <Headset className="h-5 w-5 text-blue-400 mr-2" />}
                <h3 className="text-xl font-semibold font-heading">{type}</h3>
                <span className="ml-2 bg-cuephoria-purple/20 text-cuephoria-lightpurple text-xs px-2 py-1 rounded-full">
                  {activeCount} active
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="ml-auto"
                  onClick={handleRename}
                >
                  <Pencil className="h-3 w-3 mr-1" />
                  Edit Section Name
                </Button>
              </div>
              
              <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                {group
                  .sort((a, b) => {
                    const numA = parseInt(a.name.replace(/\D/g, '')) || 0;
                    const numB = parseInt(b.name.replace(/\D/g, '')) || 0;
                    return numA - numB;
                  })
                  .map((station, index) => (
                    <div key={station.id} className="animate-scale-in" style={{animationDelay: `${index * 100}ms`}}>
                      <StationCard station={station} />
                    </div>
                  ))
                }
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Stations;
