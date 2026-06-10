import { supabase } from '@/integrations/supabase/client';

export async function generateMonthlyPayroll(
  staffId: string,
  month: number,
  year: number,
  adminUsername: string,
): Promise<string> {
  const { data, error } = await supabase.rpc('generate_monthly_payroll', {
    p_staff_id: staffId,
    p_month: month,
    p_year: year,
    p_admin_username: adminUsername,
  });
  if (error) throw error;
  return String(data);
}

export async function processLeaveApproval(
  requestId: string,
  action: 'approve' | 'reject',
  remarks?: string,
): Promise<void> {
  const { error } = await supabase.rpc('process_leave_approval', {
    p_request_id: requestId,
    p_action: action,
    p_remarks: remarks ?? null,
  });
  if (error) throw error;
}

export async function processRegularization(
  requestId: string,
  action: 'approve' | 'reject',
  remarks?: string,
): Promise<void> {
  const { error } = await supabase.rpc('process_regularization', {
    p_request_id: requestId,
    p_action: action,
    p_remarks: remarks ?? null,
  });
  if (error) throw error;
}

export async function processOtRequest(
  requestId: string,
  action: 'approve' | 'reject',
  remarks?: string,
): Promise<void> {
  const { error } = await supabase.rpc('process_ot_request', {
    p_request_id: requestId,
    p_action: action,
    p_remarks: remarks ?? null,
  });
  if (error) throw error;
}

export async function processDoubleShiftRequest(
  requestId: string,
  action: 'approve' | 'reject',
  remarks?: string,
): Promise<void> {
  const { error } = await supabase.rpc('process_double_shift_request', {
    p_request_id: requestId,
    p_action: action,
    p_remarks: remarks ?? null,
  });
  if (error) throw error;
}

export async function unlockPayroll(
  staffId: string,
  month: number,
  year: number,
  unlockedBy: string,
): Promise<void> {
  const { error } = await supabase
    .from('staff_payroll')
    .update({
      is_locked: false,
      locked_at: null,
      locked_by: null,
      payment_status: 'pending',
      notes: `Unlocked by ${unlockedBy}`,
    })
    .eq('staff_id', staffId)
    .eq('month', month)
    .eq('year', year);
  if (error) throw error;
}

export async function lockPayroll(
  staffId: string,
  month: number,
  year: number,
  lockedBy: string,
): Promise<void> {
  const { error } = await supabase
    .from('staff_payroll')
    .update({
      is_locked: true,
      locked_at: new Date().toISOString(),
      locked_by: lockedBy,
      payment_status: 'approved',
    })
    .eq('staff_id', staffId)
    .eq('month', month)
    .eq('year', year);
  if (error) throw error;
}

export async function logHrAudit(entry: {
  organizationId: string;
  locationId?: string | null;
  actorAdminUserId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  payload?: Record<string, unknown>;
}): Promise<void> {
  const { error } = await supabase.from('staff_hr_audit_log').insert({
    organization_id: entry.organizationId,
    location_id: entry.locationId ?? null,
    actor_admin_user_id: entry.actorAdminUserId ?? null,
    action: entry.action,
    entity_type: entry.entityType,
    entity_id: entry.entityId ?? null,
    payload: entry.payload ?? {},
  });
  if (error && error.code !== '42P01') {
    console.warn('staff_hr_audit_log insert failed:', error.message);
  }
}
