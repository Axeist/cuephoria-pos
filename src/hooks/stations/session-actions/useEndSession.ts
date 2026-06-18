import { Session, Station, Customer, CartItem, SessionResult } from '@/types/pos.types';
import { supabase } from "@/integrations/supabase/client";
import { useToast } from '@/hooks/use-toast';
import { SessionActionsProps } from '../session-actions/types';
import { generateId } from '@/utils/pos.utils';
import React from 'react';

/**
 * Hook to provide session end functionality
 */
export const useEndSession = ({
  stations,
  setStations,
  sessions,
  setSessions,
  updateCustomer
}: SessionActionsProps & { updateCustomer: (customer: Customer) => void }) => {
  const { toast } = useToast();
  
  /**
   * End an active session for a station
   */
  const endSession = async (stationId: string, customersList?: Customer[]): Promise<SessionResult | undefined> => {
    try {
      console.log("Ending session for station:", stationId);
      
      // Find the station
      const station = stations.find(s => s.id === stationId);
      if (!station || !station.isOccupied || !station.currentSession) {
        console.error("No active session found for this station");
        toast({
          title: "Session Error",
          description: "No active session found for this station",
          variant: "destructive"
        });
        throw new Error("No active session found");
      }
      
      const session = station.currentSession;
      const endTime = new Date();
      
      // Calculate duration in minutes
      const startTime = new Date(session.startTime);
      const durationMs = endTime.getTime() - startTime.getTime();
      const durationMinutes = Math.ceil(durationMs / (1000 * 60));
      
      // Create updated session object
      const updatedSession: Session = {
        ...session,
        endTime,
        duration: durationMinutes
      };
      
      console.log("Updated session with end time and duration:", updatedSession);
      
      // Update database FIRST to ensure consistency, then update local state
      // This prevents Realtime subscription from overriding with stale data
      try {
        const { error: sessionError } = await supabase
          .from('sessions')
          .update({
            end_time: endTime.toISOString(),
            duration: durationMinutes
          })
          .eq('id', session.id);
          
        if (sessionError) {
          console.error('Error updating session in Supabase:', sessionError);
          throw sessionError;
        }
        console.log('✅ Session updated in database successfully');
      } catch (supabaseError) {
        console.error('Error updating session in Supabase:', supabaseError);
        toast({
          title: 'Database Error',
          description: 'Failed to update session in database. Please try again.',
          variant: 'destructive'
        });
        throw supabaseError;
      }
      
      // Try to update station in Supabase
      try {
        // Check if stationId is a proper UUID format
        const dbStationId = stationId.includes('-') ? stationId : null;
        
        if (dbStationId) {
          const { error: stationError } = await supabase
            .from('stations')
            .update({ is_occupied: false })
            .eq('id', dbStationId);
          
          if (stationError) {
            console.error('Error updating station in Supabase:', stationError);
            // Non-critical, continue
          } else {
            console.log('✅ Station updated in database successfully');
          }
        } else {
          console.log("Skipping station update in Supabase due to non-UUID station ID");
        }
      } catch (supabaseError) {
        console.error('Error updating station in Supabase:', supabaseError);
        // Non-critical, continue
      }
      
      // Update local state AFTER database update to ensure consistency
      // Use functional updates to ensure we're working with the latest state
      setSessions(prev => {
        const updated = prev.map(s => 
          s.id === session.id ? updatedSession : s
        );
        console.log('✅ Updated sessions in local state');
        return updated;
      });
      
      setStations(prev => prev.map(s => 
        s.id === stationId 
          ? { ...s, isOccupied: false, currentSession: null } 
          : s
      ));
      console.log('✅ Updated stations in local state');
      
      // Find customer
      const customer = customersList?.find(c => c.id === session.customerId);
      
      if (!customer) {
        console.warn("Customer not found for session", session.customerId);
      } else {
        console.log("Found customer for session:", customer.name);
      }
      
      // Generate cart item for the session
      const cartItemId = generateId();
      console.log("Generated cart item ID:", cartItemId);
      
      // ✅ UPDATED: Use session's hourly rate (which may be discounted from coupon)
      const stationRate = session.hourlyRate || station.hourlyRate;
      
      // Calculate cost based on station type and slot duration
      let sessionCost: number;
      if (station.category === 'nit_event' && station.slotDuration) {
        // Event stations: Bill per slot (rounded up)
        // e.g., 30 min slot = ₹100, so 30 mins = ₹100, 31-60 mins = ₹200
        const slotsPlayed = Math.ceil(durationMinutes / station.slotDuration);
        sessionCost = slotsPlayed * stationRate;
      } else if (station.type === 'vr') {
        // Regular VR: 15-minute slots
        const slotsPlayed = Math.ceil(durationMinutes / 15);
        sessionCost = slotsPlayed * stationRate;
      } else {
        // Regular stations: Bill per hour
        const hoursPlayed = durationMs / (1000 * 60 * 60);
        sessionCost = Math.ceil(hoursPlayed * stationRate);
      }
      
      // Apply 50% discount for members - IMPORTANT: This is the key part for member discounts
      const isMember = customer?.isMember || false;
      const discountApplied = isMember;
      
      if (discountApplied) {
        const originalCost = sessionCost;
        sessionCost = Math.ceil(sessionCost * 0.5); // 50% discount
        console.log(`Applied 50% member discount: ${originalCost} → ${sessionCost}`);
      }
      
      console.log("Session cost calculation:", { 
        stationRate, 
        durationMinutes,
        stationCategory: station.category,
        slotDuration: station.slotDuration,
        stationType: station.type,
        isMember,
        discountApplied,
        sessionCost 
      });
      
      // ✅ UPDATED: Show coupon info if it was applied
      const couponInfo = session.couponCode ? ` - ${session.couponCode}` : '';
      const memberInfo = discountApplied ? ' - Member 50% OFF' : '';
      
      // Create cart item for the session with discount info in the name if applicable
      const sessionCartItem: CartItem = {
        id: cartItemId,
        name: `${station.name} (${customer?.name || 'Unknown Customer'})${couponInfo}${memberInfo}`,
        price: sessionCost,
        quantity: 1,
        total: sessionCost,
        type: 'session',
      };
      
      console.log("Created cart item for ended session:", sessionCartItem);
      
      // Update customer's total play time
      if (customer) {
        const updatedCustomer = {
          ...customer,
          totalPlayTime: (customer.totalPlayTime || 0) + durationMinutes
        };
        updateCustomer(updatedCustomer);
      }
      
      toast({
        title: 'Success',
        description: 'Session ended successfully',
      });
      
      return { 
        updatedSession, 
        sessionCartItem, 
        customer 
      };
    } catch (error) {
      console.error('Error in endSession:', error);
      toast({
        title: 'Error',
        description: 'Failed to end session: ' + (error instanceof Error ? error.message : 'Unknown error'),
        variant: 'destructive'
      });
      return undefined;
    }
  };
  
  return { endSession };
};
