
import React from 'react';
import { Station } from '@/context/POSContext';
import { Badge } from '@/components/ui/badge';
import { Gamepad2, CircleOff, UserCheck, User } from 'lucide-react';
import { CurrencyDisplay } from '@/components/ui/currency';
import { Customer } from '@/types/pos.types';
import { isMembershipActive, getMembershipBadgeText } from '@/utils/membership.utils';

// Helper function to get rate label based on station type and category
const getRateLabel = (station: Station): string => {
  // For NIT EVENT stations, show duration based on slot_duration
  if (station.category === 'nit_event') {
    if (station.slotDuration === 15) {
      return '15 Min Rate:';
    } else if (station.slotDuration === 30) {
      return '30 Min Rate:';
    }
  }
  // For regular stations, show hourly rate
  // VR stations show 15 min rate even if not event
  if (station.type === 'vr') {
    return '15 Min Rate:';
  }
  return 'Hourly Rate:';
};

// Helper function to get rate suffix for display
const getRateSuffix = (station: Station): string => {
  if (station.category === 'nit_event') {
    if (station.slotDuration === 15) {
      return '/15mins';
    } else if (station.slotDuration === 30) {
      return '/30mins';
    }
  }
  if (station.type === 'vr') {
    return '/15mins';
  }
  return '/hr';
};

interface StationInfoProps {
  station: Station;
  customerName: string;
  customerData?: Customer | null;
}

const StationInfo: React.FC<StationInfoProps> = ({ station, customerName, customerData }) => {
  // Different styling based on station type
  const isPoolTable = station.type === '8ball';
  
  // Check if customer is a member and membership is active
  const isMember = customerData ? isMembershipActive(customerData) : false;
  const membershipText = customerData && customerData.isMember ? getMembershipBadgeText(customerData) : 'Non-Member';
  
  return (
    <>
      <div className="flex justify-between items-center">
        <div className="flex items-center text-lg font-heading">
          {isPoolTable ? (
            <div className="relative w-10 h-10 flex items-center justify-center">
              <div className="absolute inset-0 bg-gradient-to-br from-green-800 to-green-900 rounded-md"></div>
              <CircleOff className="h-6 w-6 text-green-300 z-10" />
              <div className="absolute inset-0 border-2 border-green-700 rounded-md"></div>
            </div>
          ) : (
            <div className="relative w-10 h-10 flex items-center justify-center">
              <div className="absolute inset-0 bg-gradient-to-br from-slate-800 to-black rounded-md"></div>
              <Gamepad2 className="h-6 w-6 text-cuephoria-lightpurple z-10" />
              <div className="absolute bottom-0 h-1 w-8 mx-auto bg-cuephoria-purple rounded-t-lg"></div>
            </div>
          )}
          <span className={`ml-2 font-bold ${isPoolTable ? 'text-green-500' : 'text-cuephoria-lightpurple'}`}>
            {station.name}
          </span>
        </div>
        <Badge 
          className={`
            ${station.isOccupied 
              ? 'bg-cuephoria-orange text-white' 
              : isPoolTable 
                ? 'bg-green-500 text-white' 
                : 'bg-cuephoria-lightpurple text-white'
            } 
            ${station.isOccupied ? 'animate-pulse' : ''}
          `}
        >
          {station.isOccupied ? 'Occupied' : 'Available'}
        </Badge>
      </div>
      
      <div className="flex flex-col space-y-2 mt-2">
        <div className="flex justify-between text-sm">
          <span>{getRateLabel(station)}</span>
          <CurrencyDisplay amount={station.hourlyRate} />
        </div>
        
        {station.isOccupied && station.currentSession && (
          <>
            <div className="flex justify-between text-sm">
              <span>Customer:</span>
              <span className="font-semibold">{customerName}</span>
            </div>
            
            {/* Membership indicator */}
            <div className="flex justify-between items-center text-sm">
              <span>Status:</span>
              <Badge 
                className={`
                  ${isMember
                    ? 'bg-green-600 text-white border-green-700'
                    : 'bg-gray-600 text-white border-gray-700'
                  }
                  flex items-center gap-1
                `}
              >
                {isMember ? <UserCheck className="h-3 w-3" /> : <User className="h-3 w-3" />}
                {membershipText}
              </Badge>
            </div>
            {isMember && (
              <div className="text-xs text-right mt-0 text-green-500">
                50% discount applied
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
};

export default StationInfo;
