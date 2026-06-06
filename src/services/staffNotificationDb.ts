import { supabase } from '@/integrations/supabase/client';
import type { StaffNotification } from '@/types/staffNotification.types';
import type { SessionAlertType } from '@/utils/sessionStaffNotifications';
import { sanitizeStaffNotification } from '@/utils/staffNotificationSanitize';

export interface StaffNotificationRow {
  id: string;
  organization_id: string;
  location_id: string;
  kind: 'booking' | 'session';
  alert_type: string;
  dedupe_key: string;
  payload: Record<string, unknown>;
  is_read: boolean;
  created_at: string;
  expires_at: string;
}

const HISTORY_MS = 24 * 60 * 60 * 1000;

function isRecord(value: unknown): value is Record<string, unknown> {
  return value != null && typeof value === 'object' && !Array.isArray(value);
}

function normalizePayload(payload: unknown): Record<string, unknown> {
  if (typeof payload === 'string') {
    try {
      const parsed = JSON.parse(payload) as unknown;
      return isRecord(parsed) ? parsed : {};
    } catch {
      return {};
    }
  }
  return isRecord(payload) ? payload : {};
}

function payloadToStaffNotification(row: StaffNotificationRow): StaffNotification | null {
  const timestamp = new Date(row.created_at);
  if (Number.isNaN(timestamp.getTime())) return null;

  const payload = normalizePayload(row.payload);

  if (row.kind === 'booking') {
    const isPaid = Boolean(payload.isPaid);
    const booking = payload.booking;
    const raw = {
      kind: 'booking',
      id: row.id,
      booking,
      timestamp,
      isPaid,
      isRead: row.is_read,
    };
    const model = sanitizeStaffNotification(raw);
    if (!model) {
      console.warn('Failed to parse booking staff notification row', row.id, payload);
    }
    return model;
  }

  if (row.kind === 'session') {
    const alertType = payload.alertType as SessionAlertType | undefined;
    if (!alertType || typeof payload.message !== 'string') return null;

    return {
      kind: 'session',
      id: row.id,
      alertType,
      sessionId:
        typeof payload.sessionId === 'string' ? payload.sessionId : undefined,
      customerId:
        typeof payload.customerId === 'string' ? payload.customerId : undefined,
      stationId:
        typeof payload.stationId === 'string' ? payload.stationId : undefined,
      stationName:
        typeof payload.stationName === 'string' ? payload.stationName : 'Station',
      customerName:
        typeof payload.customerName === 'string' ? payload.customerName : 'Customer',
      message: payload.message,
      locationId: row.location_id,
      timestamp,
      isRead: row.is_read,
    };
  }

  return null;
}

export function staffNotificationRowToModel(row: StaffNotificationRow): StaffNotification | null {
  return payloadToStaffNotification(row);
}

export async function fetchStaffNotifications(
  locationId: string
): Promise<StaffNotification[]> {
  const since = new Date(Date.now() - HISTORY_MS).toISOString();

  const { data, error } = await supabase
    .from('staff_notifications')
    .select('*')
    .eq('location_id', locationId)
    .gte('created_at', since)
    .order('created_at', { ascending: false })
    .limit(200);

  if (error) {
    console.error('Failed to load staff notifications:', error);
    return [];
  }

  return (data as unknown as StaffNotificationRow[])
    .map(staffNotificationRowToModel)
    .filter((n): n is StaffNotification => n != null);
}

export async function markStaffNotificationRead(notificationId: string): Promise<void> {
  const { error } = await supabase
    .from('staff_notifications')
    .update({ is_read: true })
    .eq('id', notificationId);

  if (error) {
    console.error('Failed to mark notification read:', error);
  }
}

export async function markAllStaffNotificationsRead(locationId: string): Promise<void> {
  const { error } = await supabase
    .from('staff_notifications')
    .update({ is_read: true })
    .eq('location_id', locationId)
    .eq('is_read', false);

  if (error) {
    console.error('Failed to mark all notifications read:', error);
  }
}

export async function clearStaffNotificationsForLocation(locationId: string): Promise<void> {
  const { error } = await supabase
    .from('staff_notifications')
    .delete()
    .eq('location_id', locationId);

  if (error) {
    console.error('Failed to clear staff notifications:', error);
  }
}

export async function syncStaffSessionNotifications(locationId: string): Promise<void> {
  const { error } = await supabase.rpc('sync_staff_session_notifications', {
    p_location_id: locationId,
  });

  if (error) {
    console.error('Failed to sync session staff notifications:', error);
  }
}

export async function ensureStaffBookingNotification(bookingId: string): Promise<void> {
  const { error } = await supabase.rpc('ensure_staff_booking_notification', {
    p_booking_id: bookingId,
  });

  if (error) {
    console.error('Failed to ensure staff booking notification:', error);
  }
}

export function mergeStaffNotification(
  prev: StaffNotification[],
  incoming: StaffNotification
): StaffNotification[] {
  const idx = prev.findIndex((n) => n.id === incoming.id);
  if (idx >= 0) {
    const next = [...prev];
    next[idx] = incoming;
    return next;
  }
  return [incoming, ...prev];
}

export function sortStaffNotifications(items: StaffNotification[]): StaffNotification[] {
  return [...items].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
}
