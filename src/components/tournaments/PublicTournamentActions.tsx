
import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ExternalLink, Calendar, Activity } from 'lucide-react';

const PublicTournamentActions: React.FC = () => {
  const handleOfficialWebsite = () => {
    // Replace with actual website URL
    window.open('https://cuephoria.com', '_blank');
  };

  const handleBookSlot = () => {
    // Replace with actual booking URL or navigate to booking page
    window.open('/book-slot', '_blank');
  };

  const handleLiveOccupancy = () => {
    // Navigate to the public stations page
    window.open('/public/stations', '_blank');
  };

  return (
    <Card className="w-full bg-gradient-to-br from-gray-900/50 to-gray-800/50 border-gray-700/50 backdrop-blur-sm">
      <CardContent className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Button
            onClick={handleOfficialWebsite}
            className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300 h-12"
          >
            <ExternalLink className="h-5 w-5 mr-2" />
            Official Website
          </Button>
          
          <Button
            onClick={handleBookSlot}
            className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300 h-12"
          >
            <Calendar className="h-5 w-5 mr-2" />
            Book A Slot
          </Button>
          
          <Button
            onClick={handleLiveOccupancy}
            className="w-full bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300 h-12"
          >
            <Activity className="h-5 w-5 mr-2" />
            Live Station Occupancy
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default PublicTournamentActions;
