
import React, { useState } from 'react';
import { usePOS } from '@/context/POSContext';
import StationCard from '@/components/StationCard';
import { Card, CardContent } from '@/components/ui/card';
import { Gamepad2, Plus, Table2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import AddStationDialog from '@/components/AddStationDialog';

const Stations = () => {
  const { stations } = usePOS();
  const [openAddDialog, setOpenAddDialog] = useState(false);
  
  // Separate stations by type
  const ps5Stations = stations.filter(station => station.type === 'ps5');
  const ballStations = stations.filter(station => station.type === '8ball');

  // Count active stations
  const activePs5 = ps5Stations.filter(s => s.isOccupied).length;
  const activeBall = ballStations.filter(s => s.isOccupied).length;

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between animate-slide-down">
        <h2 className="text-3xl font-bold tracking-tight gradient-text font-heading">Gaming Stations</h2>
        <div className="flex space-x-2">
          <Button 
            className="bg-cuephoria-purple hover:bg-cuephoria-purple/80"
            onClick={() => setOpenAddDialog(true)}
          >
            <Plus className="mr-2 h-4 w-4" /> Add Station
          </Button>
        </div>
      </div>

      {/* Add Station Dialog */}
      <AddStationDialog 
        open={openAddDialog} 
        onOpenChange={setOpenAddDialog} 
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-slide-up">
        <Card className="bg-gradient-to-r from-cuephoria-purple/20 to-cuephoria-lightpurple/20 border-cuephoria-purple/30 border animate-fade-in">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">PlayStation 5</p>
              <p className="text-2xl font-bold">{activePs5} / {ps5Stations.length} Active</p>
            </div>
            <div className="rounded-full bg-cuephoria-purple/20 p-3">
              <Gamepad2 className="h-6 w-6 text-cuephoria-lightpurple" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-r from-green-900/20 to-green-700/10 border-green-500/30 border animate-fade-in delay-100">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">8-Ball Tables</p>
              <p className="text-2xl font-bold">{activeBall} / {ballStations.length} Active</p>
            </div>
            <div className="rounded-full bg-green-900/30 p-3">
              <Table2 className="h-6 w-6 text-green-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-6">
        <div className="animate-slide-up delay-200">
          <div className="flex items-center mb-4">
            <Gamepad2 className="h-5 w-5 text-cuephoria-lightpurple mr-2" />
            <h3 className="text-xl font-semibold font-heading">PlayStation 5 Consoles</h3>
            <span className="ml-2 bg-cuephoria-purple/20 text-cuephoria-lightpurple text-xs px-2 py-1 rounded-full">
              {activePs5} active
            </span>
          </div>
          <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            {ps5Stations
              .sort((a, b) => {
                // Extract numbers from station names (e.g., "Console 1" -> 1)
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

        <div className="animate-slide-up delay-300">
          <div className="flex items-center mb-4">
            <Table2 className="h-5 w-5 text-green-500 mr-2" />
            <h3 className="text-xl font-semibold font-heading">8-Ball Tables</h3>
            <span className="ml-2 bg-green-800/30 text-green-400 text-xs px-2 py-1 rounded-full">
              {activeBall} active
            </span>
          </div>
          
          <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
            {ballStations
              .sort((a, b) => {
                // Extract numbers from station names (e.g., "Table 1" -> 1)
                const numA = parseInt(a.name.replace(/\D/g, '')) || 0;
                const numB = parseInt(b.name.replace(/\D/g, '')) || 0;
                return numA - numB;
              })
              .map((station, index) => (
                <div key={station.id} className="animate-scale-in" style={{animationDelay: `${index * 100 + 300}ms`}}>
                  <StationCard station={station} />
                </div>
              ))
            }
          </div>
        </div>
      </div>
    </div>
  );
};

export default Stations;
