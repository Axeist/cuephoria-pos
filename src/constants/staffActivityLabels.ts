import type { CriticalPinActionKey } from '@/constants/criticalEmployeePinActions';
import { CRITICAL_PIN_ACTION_LABELS } from '@/constants/criticalEmployeePinActions';

export type StaffActivityCategory =
  | 'payments'
  | 'sessions'
  | 'stock'
  | 'bookings'
  | 'members'
  | 'pin'
  | 'hr';

export type StaffActivityContext = Record<string, string | number | boolean | null | undefined>;

function name(ctx: StaffActivityContext): string {
  return String(ctx.staffName ?? ctx.actorName ?? 'Staff member');
}

function customer(ctx: StaffActivityContext): string {
  return String(ctx.customerName ?? 'a customer');
}

export function categoryForAction(actionKey: string): StaffActivityCategory {
  if (actionKey.startsWith('pin.')) return 'pin';
  if (actionKey.startsWith('pos.')) return 'payments';
  if (actionKey.startsWith('session.')) return 'sessions';
  if (actionKey.startsWith('stock.')) return 'stock';
  if (actionKey.startsWith('booking.')) return 'bookings';
  if (actionKey.startsWith('member.')) return 'members';
  if (actionKey.startsWith('station.')) return 'sessions';
  if (actionKey.startsWith('owner.')) return 'pin';
  return 'hr';
}

export function buildActivitySummary(
  actionKey: string,
  context: StaffActivityContext,
  outcome?: 'success' | 'failed' | 'bypass',
): string {
  const who = name(context);
  const actionLabel =
    CRITICAL_PIN_ACTION_LABELS[actionKey as CriticalPinActionKey] ?? actionKey.replace(/\./g, ' ');

  switch (actionKey) {
    case 'pin.failed':
      return `${who} entered the wrong PIN while trying to ${String(context.attemptAction ?? 'complete an action').toLowerCase()}.`;
    case 'pin.not_clocked_in':
      return `${who} tried to ${String(context.attemptAction ?? 'complete an action').toLowerCase()} but was not clocked in.`;
    case 'pin.verified':
      return `${who} verified their PIN for ${actionLabel.toLowerCase()}.`;
    case 'pos.checkout':
      return `${who} accepted a payment of ₹${context.amount ?? 0} for ${customer(context)}.`;
    case 'session.end':
      return `${who} closed a session for ${customer(context)}${context.amount != null ? ` (₹${context.amount})` : ''}.`;
    case 'stock.restock':
      return `${who} added ${context.quantity ?? 0} units of ${context.productName ?? 'stock'}.`;
    case 'stock.adjust':
      return `${who} changed ${context.productName ?? 'product'} stock from ${context.fromQty ?? '?'} to ${context.toQty ?? '?'}.`;
    case 'booking.move_station':
      return `${who} moved an online booking from ${context.fromStation ?? '?'} to ${context.toStation ?? '?'}.`;
    case 'member.register':
      return `${who} registered a new member: ${context.customerName ?? 'Unknown'}${context.phone ? ` (${context.phone})` : ''}.`;
    case 'member.recharge':
      return `${who} recharged ₹${context.amount ?? 0} on ${customer(context)}'s member card.`;
    case 'booking.payment_mode':
      return `${who} changed booking payment from "${context.fromMode ?? '?'}" to "${context.toMode ?? '?'}".`;
    case 'session.move':
      return `${who} moved a live session from ${context.fromStation ?? '?'} to ${context.toStation ?? '?'}.`;
    case 'station.maintenance':
      return `${who} ${context.enabled ? 'turned on' : 'turned off'} maintenance for ${context.stationName ?? 'a station'}.`;
    case 'member.card_assign':
      return `${who} linked a member card to ${customer(context)}.`;
    case 'member.details_edit':
      return `${who} updated member details for ${customer(context)}.`;
    case 'owner.bypass':
      return `Owner completed "${actionLabel}" without PIN (owner override).`;
    default:
      if (outcome === 'failed') {
        return `${who} could not complete ${actionLabel.toLowerCase()}.`;
      }
      return `${who} completed ${actionLabel.toLowerCase()}.`;
  }
}
