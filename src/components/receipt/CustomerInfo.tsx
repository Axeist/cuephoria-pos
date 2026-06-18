import React from 'react';
import { Customer } from '@/context/POSContext';
import { CalendarCheck, Award, Clock, Calendar, AlertTriangle } from 'lucide-react';
import { isMembershipActive, getHoursLeftColor } from '@/utils/membership.utils';

interface CustomerInfoProps {
  customer: Customer;
}

const CustomerInfo: React.FC<CustomerInfoProps> = ({ customer }) => {
  const formatDate = (date: Date | undefined) => {
    if (!date) return '';
    
    // Handle both string and Date objects
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleDateString();
  };

  const getMembershipType = () => {
    if (!customer.isMember) return 'Non-Member';
    
    if (customer.membershipPlan) {
      return customer.membershipPlan;
    }
    
    const duration = customer.membershipDuration || '';
    return duration.charAt(0).toUpperCase() + duration.slice(1) + ' Member';
  };

  const getMembershipDuration = () => {
    if (!customer.membershipDuration) return '';
    return customer.membershipDuration === 'weekly' ? 'Weekly' : 'Monthly';
  };

  return (
    <div className="mb-4">
      <p className="font-medium text-sm">Customer: {customer.name}</p>
      <p className="text-xs text-gray-600">{customer.phone}</p>
      
      <div className="mt-2 border-t pt-2">
        <p className="text-xs flex items-center">
          <Award className="h-3 w-3 mr-1" />
          <span className="font-medium">Status:</span> 
          <span className={`ml-1 ${isMembershipActive(customer) ? 'text-green-600' : 'text-red-600'}`}>
            {isMembershipActive(customer) ? getMembershipType() : 'Inactive'}
          </span>
        </p>
        
        {customer.membershipDuration && (
          <p className="text-xs flex items-center mt-1">
            <span className="font-medium">Duration:</span>
            <span className="ml-1">{getMembershipDuration()}</span>
          </p>
        )}
        
        {customer.membershipStartDate && (
          <p className="text-xs flex items-center mt-1">
            <Calendar className="h-3 w-3 mr-1" />
            <span className="font-medium">Start:</span>
            <span className="ml-1">{formatDate(customer.membershipStartDate)}</span>
          </p>
        )}
        
        {customer.membershipExpiryDate && (
          <p className="text-xs flex items-center mt-1">
            <CalendarCheck className="h-3 w-3 mr-1" />
            <span className="font-medium">End:</span>
            <span className="ml-1">{formatDate(customer.membershipExpiryDate)}</span>
          </p>
        )}
        
        {customer.membershipHoursLeft !== undefined && (
          <p className={`text-xs flex items-center mt-1 ${getHoursLeftColor(customer.membershipHoursLeft)}`}>
            <Clock className="h-3 w-3 mr-1" />
            <span className="font-medium">Hours Left:</span>
            <span className="ml-1">{customer.membershipHoursLeft}</span>
            {customer.membershipHoursLeft === 0 && 
              <AlertTriangle className="h-3 w-3 ml-1 text-red-500" />
            }
          </p>
        )}
        
        {customer.isMember && customer.membershipPlan && (
          <div className="mt-2 text-xs text-gray-600">
            <p className="font-medium mb-1">Membership Conditions:</p>
            <ul className="list-disc pl-4 space-y-0.5">
              <li>Can Play {customer.membershipPlan.includes('Combo') || customer.membershipPlan.includes('Ultimate') ? '6hrs' : '4hrs'} in a week for free</li>
              <li>Can only use {customer.membershipPlan.includes('Combo') || customer.membershipPlan.includes('Ultimate') ? '2hrs' : '1hr'} max per day</li>
              <li>Can use offer any day but Sunday only 11AM to 5PM</li>
              <li>Priority bookings for members</li>
              <li>Prior Booking is Mandatory</li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

export default CustomerInfo;
