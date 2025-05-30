
import React from 'react';
import { Gamepad2, Clock, User, CheckCircle, XCircle } from 'lucide-react';
import MobileContainer from '@/components/ui/mobile-container';
import MobileCard from '@/components/ui/mobile-card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useIsMobile } from '@/hooks/use-mobile';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const MobileStationsView: React.FC = () => {
  const isMobile = useIsMobile();

  if (!isMobile) return null;

  const stations = [
    {
      id: '1',
      name: 'PS5 Controller1',
      type: 'PlayStation 5',
      status: 'available',
      hourlyRate: 150,
      active: '4 / 6 Active'
    },
    {
      id: '2', 
      name: 'PS5 Controller2',
      type: 'PlayStation 5',
      status: 'occupied',
      hourlyRate: 150,
      customer: 'Adhi',
      membershipStatus: 'Non-Member'
    }
  ];

  const poolTables = [
    {
      id: '1',
      name: '8-Ball Tables',
      active: '0 / 3 Active',
      status: 'available'
    }
  ];

  return (
    <MobileContainer>
      <div className="space-y-4">
        {/* PlayStation Section */}
        <MobileCard title="PlayStation 5" compact>
          <div className="flex items-center justify-between mb-3">
            <Badge variant="secondary" className="bg-cuephoria-purple/20 text-cuephoria-lightpurple">
              4 active
            </Badge>
            <span className="text-sm text-gray-400">4 / 6 Active</span>
          </div>
          
          <div className="space-y-3">
            {stations.map((station) => (
              <div key={station.id} className="bg-gray-800/30 rounded-lg p-3 border border-gray-700">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Gamepad2 className="h-4 w-4 text-cuephoria-lightpurple" />
                    <span className="font-medium text-white text-sm">{station.name}</span>
                  </div>
                  <Badge 
                    variant={station.status === 'available' ? 'secondary' : 'destructive'}
                    className={`text-xs ${
                      station.status === 'available' 
                        ? 'bg-cuephoria-lightpurple/20 text-cuephoria-lightpurple' 
                        : 'bg-cuephoria-orange/20 text-cuephoria-orange'
                    }`}
                  >
                    {station.status === 'available' ? 'Available' : 'Occupied'}
                  </Badge>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Hourly Rate:</span>
                    <span className="text-white font-medium">₹{station.hourlyRate}</span>
                  </div>
                  
                  {station.status === 'occupied' ? (
                    <>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Customer:</span>
                        <span className="text-white">{station.customer}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Status:</span>
                        <Badge variant="outline" className="text-xs">
                          <User className="h-3 w-3 mr-1" />
                          {station.membershipStatus}
                        </Badge>
                      </div>
                      <div className="flex gap-2 mt-3">
                        <Button size="sm" variant="outline" className="flex-1 text-xs">
                          End Session
                        </Button>
                        <Button size="sm" variant="outline" className="flex-1 text-xs">
                          Extend
                        </Button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="mt-3">
                        <Select>
                          <SelectTrigger className="w-full bg-gray-800 border-gray-600 text-sm">
                            <SelectValue placeholder="Select customer..." />
                          </SelectTrigger>
                          <SelectContent className="bg-gray-800 border-gray-600">
                            <SelectItem value="customer1">John Doe</SelectItem>
                            <SelectItem value="customer2">Jane Smith</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <Button className="w-full mt-3 bg-cuephoria-lightpurple hover:bg-cuephoria-purple text-white">
                        Start Session
                      </Button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </MobileCard>

        {/* Pool Tables Section */}
        <MobileCard title="8-Ball Tables" compact>
          <div className="flex items-center justify-between mb-3">
            <Badge variant="outline" className="bg-green-500/20 text-green-400 border-green-500/30">
              Available
            </Badge>
            <span className="text-sm text-gray-400">0 / 3 Active</span>
          </div>
          
          <div className="bg-gray-800/30 rounded-lg p-3 border border-gray-700">
            <div className="text-center py-4">
              <CheckCircle className="h-8 w-8 text-green-400 mx-auto mb-2" />
              <p className="text-sm text-gray-400 mb-3">All tables available</p>
              <Button variant="outline" size="sm" className="text-xs">
                Start New Game
              </Button>
            </div>
          </div>
        </MobileCard>
      </div>
    </MobileContainer>
  );
};

export default MobileStationsView;
