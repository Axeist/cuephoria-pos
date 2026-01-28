import React, { useState } from 'react';
import { usePOS } from '@/context/POSContext';
import StationCard from '@/components/StationCard';
import { Card, CardContent } from '@/components/ui/card';
import { Gamepad2, Plus, Table2, Headset, Calendar, ToggleLeft, ToggleRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import AddStationDialog from '@/components/AddStationDialog';
import PinVerificationDialog from '@/components/PinVerificationDialog';
import { useIsMobile } from '@/hooks/use-mobile';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const Stations = () => {
  const { stations, setStations } = usePOS();
  const { toast } = useToast();
  const [openAddDialog, setOpenAddDialog] = useState(false);
  const [openPinDialog, setOpenPinDialog] = useState(false);
  const isMobile = useIsMobile();
  
  // Separate stations by category and type
  const regularStations = stations.filter(station => !station.category || station.category !== 'nit_event');
  const eventStations = stations.filter(station => station.category === 'nit_event');
  
  // Regular stations by type
  const ps5Stations = regularStations.filter(station => station.type === 'ps5');
  const ballStations = regularStations.filter(station => station.type === '8ball');
  const vrStations = regularStations.filter(station => station.type === 'vr');

  // Event stations by type
  const eventPs5Stations = eventStations.filter(station => station.type === 'ps5');
  const eventBallStations = eventStations.filter(station => station.type === '8ball');
  const eventVrStations = eventStations.filter(station => station.type === 'vr');

  // Count active stations
  const activePs5 = ps5Stations.filter(s => s.isOccupied).length;
  const activeBall = ballStations.filter(s => s.isOccupied).length;
  const activeVr = vrStations.filter(s => s.isOccupied).length;
  
  const activeEventPs5 = eventPs5Stations.filter(s => s.isOccupied).length;
  const activeEventBall = eventBallStations.filter(s => s.isOccupied).length;
  const activeEventVr = eventVrStations.filter(s => s.isOccupied).length;
  
  // Count enabled event stations
  const enabledEventStations = eventStations.filter(s => s.eventEnabled).length;

  const handleAddStationClick = () => {
    setOpenPinDialog(true);
  };

  const handlePinSuccess = () => {
    setOpenAddDialog(true);
  };
  
  const handleToggleEventEnabled = async (stationId: string, currentValue: boolean) => {
    try {
      const { error } = await supabase
        .from('stations')
        .update({ event_enabled: !currentValue })
        .eq('id', stationId);
      
      if (error) throw error;
      
      // Update local state
      setStations(stations.map(s => 
        s.id === stationId 
          ? { ...s, eventEnabled: !currentValue }
          : s
      ));
      
      toast({
        title: !currentValue ? "Event Enabled" : "Event Disabled",
        description: `Station ${!currentValue ? 'will now appear' : 'will no longer appear'} on public booking page.`,
      });
    } catch (error) {
      console.error('Error toggling event enabled:', error);
      toast({
        title: "Error",
        description: "Failed to update event status",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="flex-1 space-y-3 sm:space-y-4 p-3 sm:p-6 md:p-8 pt-3 sm:pt-6">
      {/* Mobile-optimized header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 animate-slide-down">
        <h2 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight gradient-text font-heading">Gaming Stations</h2>
        <div className="flex space-x-2 w-full sm:w-auto">
          <Button 
            size={isMobile ? "sm" : "default"}
            className="bg-cuephoria-purple hover:bg-cuephoria-purple/80 text-xs sm:text-sm h-10 sm:h-11 rounded-lg flex-1 sm:flex-none"
            onClick={handleAddStationClick}
          >
            <Plus className="mr-1.5 sm:mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4" /> Add Station
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
        onOpenChange={setOpenAddDialog} 
      />

      {/* Mobile-optimized stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-3 md:gap-4 animate-slide-up">
        <Card className="bg-gradient-to-r from-cuephoria-purple/20 to-cuephoria-lightpurple/20 border-cuephoria-purple/30 border animate-fade-in hover:shadow-lg hover:shadow-cuephoria-purple/20 transition-all rounded-xl">
          <CardContent className="p-3 sm:p-4 flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm text-muted-foreground">PlayStation 5</p>
              <p className="text-xl sm:text-2xl font-bold">{activePs5} / {ps5Stations.length} Active</p>
            </div>
            <div className="rounded-full bg-cuephoria-purple/20 p-2 sm:p-3">
              <Gamepad2 className="h-5 w-5 sm:h-6 sm:w-6 text-cuephoria-lightpurple" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-r from-green-900/20 to-green-700/10 border-green-500/30 border animate-fade-in delay-100 hover:shadow-lg hover:shadow-green-500/20 transition-all rounded-xl">
          <CardContent className="p-3 sm:p-4 flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm text-muted-foreground">8-Ball Tables</p>
              <p className="text-xl sm:text-2xl font-bold">{activeBall} / {ballStations.length} Active</p>
            </div>
            <div className="rounded-full bg-green-900/30 p-2 sm:p-3">
              <Table2 className="h-5 w-5 sm:h-6 sm:w-6 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-blue-900/20 to-blue-700/10 border-blue-500/30 border animate-fade-in delay-200 hover:shadow-lg hover:shadow-blue-500/20 transition-all rounded-xl">
          <CardContent className="p-3 sm:p-4 flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm text-muted-foreground">VR Gaming</p>
              <p className="text-xl sm:text-2xl font-bold">{activeVr} / {vrStations.length} Active</p>
            </div>
            <div className="rounded-full bg-blue-900/30 p-2 sm:p-3">
              <Headset className="h-5 w-5 sm:h-6 sm:w-6 text-blue-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Mobile-optimized station sections */}
      <div className="space-y-5 sm:space-y-6">
        <div className="animate-slide-up delay-200">
          <div className="flex items-center mb-3 sm:mb-4">
            <Gamepad2 className="h-4 w-4 sm:h-5 sm:w-5 text-cuephoria-lightpurple mr-2" />
            <h3 className="text-base sm:text-xl font-semibold font-heading">PlayStation 5 Consoles</h3>
            <span className="ml-2 bg-cuephoria-purple/20 text-cuephoria-lightpurple text-[10px] sm:text-xs px-2 py-1 rounded-full">
              {activePs5} active
            </span>
          </div>
          <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {ps5Stations
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

        <div className="animate-slide-up delay-300">
          <div className="flex items-center mb-3 sm:mb-4">
            <Table2 className="h-4 w-4 sm:h-5 sm:w-5 text-green-500 mr-2" />
            <h3 className="text-base sm:text-xl font-semibold font-heading">8-Ball Tables</h3>
            <span className="ml-2 bg-green-800/30 text-green-400 text-[10px] sm:text-xs px-2 py-1 rounded-full">
              {activeBall} active
            </span>
          </div>
          
          <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3">
            {ballStations
              .sort((a, b) => {
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

        <div className="animate-slide-up delay-400">
          <div className="flex items-center mb-3 sm:mb-4">
            <Headset className="h-4 w-4 sm:h-5 sm:w-5 text-blue-400 mr-2" />
            <h3 className="text-base sm:text-xl font-semibold font-heading">VR Gaming Stations</h3>
            <span className="ml-2 bg-blue-800/30 text-blue-400 text-[10px] sm:text-xs px-2 py-1 rounded-full">
              {activeVr} active
            </span>
          </div>
          
          <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {vrStations
              .sort((a, b) => {
                const numA = parseInt(a.name.replace(/\D/g, '')) || 0;
                const numB = parseInt(b.name.replace(/\D/g, '')) || 0;
                return numA - numB;
              })
              .map((station, index) => (
                <div key={station.id} className="animate-scale-in" style={{animationDelay: `${index * 100 + 600}ms`}}>
                  <StationCard station={station} />
                </div>
              ))
            }
          </div>
        </div>

        {/* NIT EVENT Stations Section */}
        {eventStations.length > 0 && (
          <div className="animate-slide-up delay-500 border-t border-yellow-500/30 pt-6 mt-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <Calendar className="h-5 w-5 sm:h-6 sm:w-6 text-yellow-400 mr-2" />
                <h3 className="text-base sm:text-xl font-semibold font-heading text-yellow-400">
                  NIT EVENT Stations
                </h3>
                <span className="ml-2 bg-yellow-800/30 text-yellow-400 text-[10px] sm:text-xs px-2 py-1 rounded-full">
                  {enabledEventStations} enabled
                </span>
              </div>
            </div>
            
            {/* Event PS5 Stations */}
            {eventPs5Stations.length > 0 && (
              <div className="mb-6">
                <div className="flex items-center mb-3">
                  <Gamepad2 className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-400 mr-2" />
                  <h4 className="text-sm sm:text-lg font-semibold">Event PS5</h4>
                  <span className="ml-2 bg-yellow-800/30 text-yellow-400 text-[10px] sm:text-xs px-2 py-1 rounded-full">
                    {activeEventPs5} active
                  </span>
                </div>
                <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                  {eventPs5Stations
                    .sort((a, b) => {
                      const numA = parseInt(a.name.replace(/\D/g, '')) || 0;
                      const numB = parseInt(b.name.replace(/\D/g, '')) || 0;
                      return numA - numB;
                    })
                    .map((station, index) => (
                      <div key={station.id} className="relative">
                        <div className="animate-scale-in" style={{animationDelay: `${index * 100}ms`}}>
                          <StationCard station={station} />
                        </div>
                        <div className="absolute top-2 right-2 z-10 flex items-center gap-2 bg-black/70 rounded-lg p-2">
                          <Label htmlFor={`event-toggle-${station.id}`} className="text-xs text-yellow-400">
                            {station.eventEnabled ? 'Enabled' : 'Disabled'}
                          </Label>
                          <Switch
                            id={`event-toggle-${station.id}`}
                            checked={station.eventEnabled || false}
                            onCheckedChange={() => handleToggleEventEnabled(station.id, station.eventEnabled || false)}
                          />
                        </div>
                      </div>
                    ))
                  }
                </div>
              </div>
            )}
            
            {/* Event 8-Ball Stations */}
            {eventBallStations.length > 0 && (
              <div className="mb-6">
                <div className="flex items-center mb-3">
                  <Table2 className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-400 mr-2" />
                  <h4 className="text-sm sm:text-lg font-semibold">Event 8-Ball</h4>
                  <span className="ml-2 bg-yellow-800/30 text-yellow-400 text-[10px] sm:text-xs px-2 py-1 rounded-full">
                    {activeEventBall} active
                  </span>
                </div>
                <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3">
                  {eventBallStations
                    .sort((a, b) => {
                      const numA = parseInt(a.name.replace(/\D/g, '')) || 0;
                      const numB = parseInt(b.name.replace(/\D/g, '')) || 0;
                      return numA - numB;
                    })
                    .map((station, index) => (
                      <div key={station.id} className="relative">
                        <div className="animate-scale-in" style={{animationDelay: `${index * 100 + 300}ms`}}>
                          <StationCard station={station} />
                        </div>
                        <div className="absolute top-2 right-2 z-10 flex items-center gap-2 bg-black/70 rounded-lg p-2">
                          <Label htmlFor={`event-toggle-${station.id}`} className="text-xs text-yellow-400">
                            {station.eventEnabled ? 'Enabled' : 'Disabled'}
                          </Label>
                          <Switch
                            id={`event-toggle-${station.id}`}
                            checked={station.eventEnabled || false}
                            onCheckedChange={() => handleToggleEventEnabled(station.id, station.eventEnabled || false)}
                          />
                        </div>
                      </div>
                    ))
                  }
                </div>
              </div>
            )}
            
            {/* Event VR Stations */}
            {eventVrStations.length > 0 && (
              <div className="mb-6">
                <div className="flex items-center mb-3">
                  <Headset className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-400 mr-2" />
                  <h4 className="text-sm sm:text-lg font-semibold">Event VR</h4>
                  <span className="ml-2 bg-yellow-800/30 text-yellow-400 text-[10px] sm:text-xs px-2 py-1 rounded-full">
                    {activeEventVr} active
                  </span>
                </div>
                <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                  {eventVrStations
                    .sort((a, b) => {
                      const numA = parseInt(a.name.replace(/\D/g, '')) || 0;
                      const numB = parseInt(b.name.replace(/\D/g, '')) || 0;
                      return numA - numB;
                    })
                    .map((station, index) => (
                      <div key={station.id} className="relative">
                        <div className="animate-scale-in" style={{animationDelay: `${index * 100 + 600}ms`}}>
                          <StationCard station={station} />
                        </div>
                        <div className="absolute top-2 right-2 z-10 flex items-center gap-2 bg-black/70 rounded-lg p-2">
                          <Label htmlFor={`event-toggle-${station.id}`} className="text-xs text-yellow-400">
                            {station.eventEnabled ? 'Enabled' : 'Disabled'}
                          </Label>
                          <Switch
                            id={`event-toggle-${station.id}`}
                            checked={station.eventEnabled || false}
                            onCheckedChange={() => handleToggleEventEnabled(station.id, station.eventEnabled || false)}
                          />
                        </div>
                      </div>
                    ))
                  }
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Stations;
