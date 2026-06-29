/** Keys for employee PIN gates and activity log entries. */
export const CRITICAL_PIN_ACTIONS = {
  POS_CHECKOUT: 'pos.checkout',
  SESSION_END: 'session.end',
  STOCK_ADJUST: 'stock.adjust',
  STOCK_RESTOCK: 'stock.restock',
  BOOKING_MOVE_STATION: 'booking.move_station',
  MEMBER_REGISTER: 'member.register',
  MEMBER_RECHARGE: 'member.recharge',
  BOOKING_PAYMENT_MODE: 'booking.payment_mode',
  SESSION_MOVE: 'session.move',
  STATION_MAINTENANCE: 'station.maintenance',
  MEMBER_CARD_ASSIGN: 'member.card_assign',
  MEMBER_DETAILS_EDIT: 'member.details_edit',
} as const;

export type CriticalPinActionKey =
  (typeof CRITICAL_PIN_ACTIONS)[keyof typeof CRITICAL_PIN_ACTIONS];

export const CRITICAL_PIN_ACTION_LABELS: Record<CriticalPinActionKey, string> = {
  'pos.checkout': 'Accept payment',
  'session.end': 'Close session',
  'stock.adjust': 'Adjust stock',
  'stock.restock': 'Restock items',
  'booking.move_station': 'Move booking console',
  'member.register': 'Register member',
  'member.recharge': 'Recharge member card',
  'booking.payment_mode': 'Change booking payment method',
  'session.move': 'Move live console',
  'station.maintenance': 'Maintenance mode',
  'member.card_assign': 'Link member card',
  'member.details_edit': 'Edit member details',
};
