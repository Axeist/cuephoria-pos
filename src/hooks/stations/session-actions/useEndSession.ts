import { Session, Station, Customer, CartItem, SessionResult, SessionGroupResult } from '@/types/pos.types';
import { supabase } from "@/integrations/supabase/client";
import { useToast } from '@/hooks/use-toast';
import { SessionActionsProps } from '../session-actions/types';
import { resolveCustomerPlaytimeDiscountPct } from '@/utils/membership.utils';
import React from 'react';
import { useLocation } from '@/context/LocationContext';
import { CACHE_KEYS, cacheKeyWithLocation, invalidateCache } from '@/utils/dataCache';
import {
  calculateSessionCost,
  getBillableDurationMinutes,
  getBillableMs,
  resolveSessionForBilling,
} from '@/utils/sessionTimer.utils';
import {
  calculatePresetSessionCheckoutCost,
  usesPresetSessionBilling,
  getEarlyEndDetails,
} from '@/utils/sessionBilling.utils';
import { calculateTimeBasedLiveCost, isTimeBasedSession, getDefaultDurationTiers } from '@/utils/timeBasedPricing.utils';
import { isTimeBasedPricing } from '@/utils/stationPricing';
import {
  buildPrepaidOvertimeCartItem,
  calculatePrepaidOvertimeCost,
  getPrepaidOvertimeMs,
  markPrepaidBookingCompleted,
} from '@/utils/prepaidBooking.utils';

export type EarlyEndBillingMode = 'actual' | 'fullBlock';

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
  const { activeLocationId } = useLocation();
  
  /**
   * End an active session for a station
   */
  const endSession = async (
    stationId: string,
    customersList?: Customer[],
    options?: { silent?: boolean; billingMode?: EarlyEndBillingMode }
  ): Promise<SessionResult | undefined> => {
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
      const billingSession = resolveSessionForBilling(session, endTime);
      
      // Calculate billable duration in minutes (excludes paused time)
      const billableMs = getBillableMs(billingSession, endTime);
      const durationMinutes = getBillableDurationMinutes(billingSession, endTime);
      
      // Create updated session object
      const updatedSession: Session = {
        ...billingSession,
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
            duration: durationMinutes,
            is_paused: false,
            paused_at: null,
            total_paused_time: billingSession.totalPausedMs ?? 0,
            status: 'ended',
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
            .update({ is_occupied: false, currentsession: null })
            .eq('id', dbStationId);
          
          if (stationError) {
            console.error('Error updating station in Supabase:', stationError);
            // Non-critical, continue
          } else {
            console.log('✅ Station updated in database successfully');
            if (activeLocationId) {
              invalidateCache(cacheKeyWithLocation(CACHE_KEYS.STATIONS, activeLocationId));
              invalidateCache(cacheKeyWithLocation(CACHE_KEYS.SESSIONS, activeLocationId));
            }
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
      
      // Generate cart item for the session (skip full session charge when pre-paid online)
      const cartItemId = generateId();
      console.log("Generated cart item ID:", cartItemId);
      
      const stationRate = session.hourlyRate || station.hourlyRate;
      const playtimeDiscountPct = resolveCustomerPlaytimeDiscountPct(customer);
      const prepaid = session.prepaidBooking;

      let sessionCartItem: CartItem | undefined;
      let sessionCost = 0;
      let billedMinutes = durationMinutes;

      if (prepaid) {
        await markPrepaidBookingCompleted(prepaid.bookingId);
        const overtimeMs = getPrepaidOvertimeMs(session, billableMs, station);
        if (overtimeMs > 0) {
          const overtime = calculatePrepaidOvertimeCost(stationRate, overtimeMs, playtimeDiscountPct);
          sessionCost = overtime.cost;
          billedMinutes = overtime.overtimeMinutes;
          if (overtime.cost > 0) {
            sessionCartItem = buildPrepaidOvertimeCartItem(
              station,
              customer?.name || 'Unknown Customer',
              overtime.overtimeMinutes,
              overtime.cost,
              prepaid
            );
            sessionCartItem.id = cartItemId;
          }
        }
        console.log('Pre-paid session end:', { overtimeMs, sessionCost, billedMinutes });
      } else if (isTimeBasedSession(session)) {
        sessionCost = calculateTimeBasedLiveCost(session, billableMs, playtimeDiscountPct);
        billedMinutes = Math.ceil(billableMs / (1000 * 60));
      } else {
        const usesPresetBilling =
          usesPresetSessionBilling(session.plannedDurationMinutes) &&
          station.category !== 'nit_event' &&
          station.type !== 'vr';

        if (usesPresetBilling) {
          const checkout = calculatePresetSessionCheckoutCost(stationRate, billableMs, playtimeDiscountPct);
          sessionCost = checkout.cost;
          billedMinutes = checkout.billedMinutes;

          // ── Early-end full-block override ──────────────────────────────────
          if (options?.billingMode === 'fullBlock') {
            const tiers = isTimeBasedPricing(station)
              ? (station.durationTiers?.length ? station.durationTiers : getDefaultDurationTiers())
              : undefined;
            const earlyEndDetails = getEarlyEndDetails(
              session,
              stationRate,
              playtimeDiscountPct,
              billableMs,
              tiers,
            );
            if (earlyEndDetails) {
              sessionCost = earlyEndDetails.fullBlockCost;
              billedMinutes = earlyEndDetails.plannedMinutes;
            }
          }
          // ──────────────────────────────────────────────────────────────────
        } else {
          sessionCost = calculateSessionCost(station, stationRate, billableMs, playtimeDiscountPct);
        }
      }

      if (!prepaid && !isTimeBasedSession(session)) {
        const couponInfo = session.couponCode ? ` - ${session.couponCode}` : '';
        const memberInfo =
          playtimeDiscountPct > 0 ? ` - Member ${playtimeDiscountPct}% OFF` : '';
        const usesPresetBilling =
          usesPresetSessionBilling(session.plannedDurationMinutes) &&
          station.category !== 'nit_event' &&
          station.type !== 'vr';
        const isFullBlock = options?.billingMode === 'fullBlock';
        const durationInfo =
          isFullBlock
            ? ` · ${billedMinutes} min block`
            : usesPresetBilling && billedMinutes !== durationMinutes
              ? ` · ${billedMinutes} min billed`
              : usesPresetBilling
                ? ` · ${billedMinutes} min`
                : '';

        sessionCartItem = {
          id: cartItemId,
          name: `${station.name} (${customer?.name || 'Unknown Customer'})${durationInfo}${couponInfo}${memberInfo}`,
          price: sessionCost,
          quantity: 1,
          total: sessionCost,
          type: 'session',
        };
      } else if (!prepaid && isTimeBasedSession(session)) {
        const planned = session.plannedDurationMinutes ?? 0;
        const played = Math.ceil(billableMs / (1000 * 60));
        const overtimeMin = Math.max(0, played - planned);
        const couponInfo = session.couponCode ? ` - ${session.couponCode}` : '';
        const memberInfo =
          playtimeDiscountPct > 0 ? ` - Member ${playtimeDiscountPct}% OFF` : '';
        const durationInfo =
          overtimeMin > 0
            ? ` · ${planned}m + ${overtimeMin}m OT`
            : planned > 0
              ? ` · ${planned}m`
              : '';

        sessionCartItem = {
          id: cartItemId,
          name: `${station.name} (${customer?.name || 'Unknown Customer'})${durationInfo}${couponInfo}${memberInfo}`,
          price: sessionCost,
          quantity: 1,
          total: sessionCost,
          type: 'session',
        };
      }

      console.log("Session cost calculation:", { 
        stationRate, 
        durationMinutes,
        billedMinutes,
        billableMs,
        plannedDurationMinutes: session.plannedDurationMinutes,
        prepaidBookingId: prepaid?.bookingId,
        stationCategory: station.category,
        slotDuration: station.slotDuration,
        stationType: station.type,
        isMember: playtimeDiscountPct > 0,
        sessionCost 
      });
      
      if (sessionCartItem) {
        console.log("Created cart item for ended session:", sessionCartItem);
      }
      
      // Update customer's total play time
      if (customer) {
        const updatedCustomer = {
          ...customer,
          totalPlayTime: (customer.totalPlayTime || 0) + durationMinutes
        };
        updateCustomer(updatedCustomer);
      }
      
      if (!options?.silent) {
        toast({
          title: 'Success',
          description: prepaid && !sessionCartItem
            ? 'Pre-paid session ended — no extra charges'
            : 'Session ended successfully',
        });
      }
      
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
  
  const endSessionGroup = async (
    stationId: string,
    customersList?: Customer[]
  ): Promise<SessionGroupResult | undefined> => {
    try {
      const anchor = stations.find((s) => s.id === stationId);
      const groupId = anchor?.currentSession?.sessionGroupId;

      if (!anchor?.currentSession || !groupId) {
        toast({
          title: 'Not a group session',
          description: 'This session was not started as part of a group.',
          variant: 'destructive',
        });
        throw new Error('Not a group session');
      }

      const groupStationIds = stations
        .filter((s) => s.isOccupied && s.currentSession?.sessionGroupId === groupId)
        .map((s) => s.id);

      if (groupStationIds.length === 0) {
        throw new Error('No active group sessions');
      }

      const sessionCartItems: CartItem[] = [];
      let customer: Customer | undefined;
      let anyPrepaidNoCharge = false;

      for (const sid of groupStationIds) {
        const result = await endSession(sid, customersList, { silent: true });
        if (result?.sessionCartItem) {
          sessionCartItems.push(result.sessionCartItem);
        } else if (result?.updatedSession?.prepaidBooking) {
          anyPrepaidNoCharge = true;
        }
        if (result?.customer) {
          customer = result.customer;
        }
      }

      const description =
        sessionCartItems.length > 0
          ? `${sessionCartItems.length} station${sessionCartItems.length === 1 ? '' : 's'} collated — opening POS checkout`
          : anyPrepaidNoCharge
            ? 'Pre-paid group sessions ended — no POS checkout needed'
            : 'Group sessions ended';

      toast({
        title: 'Group ended',
        description,
      });

      return { sessionCartItems, customer };
    } catch (error) {
      console.error('Error in endSessionGroup:', error);
      if (error instanceof Error && error.message === 'Not a group session') {
        throw error;
      }
      toast({
        title: 'Error',
        description: 'Failed to end group sessions',
        variant: 'destructive',
      });
      throw error;
    }
  };

  return { endSession, endSessionGroup };
};
