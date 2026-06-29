import type { CriticalPinActionKey } from '@/constants/criticalEmployeePinActions';
import type { StaffActivityContext } from '@/constants/staffActivityLabels';

export function gateAsyncAction<T>(
  requestEmployeePin: (
    actionKey: CriticalPinActionKey | string,
    action: () => void,
    logContext?: StaffActivityContext,
  ) => void,
  actionKey: CriticalPinActionKey | string,
  action: () => Promise<T> | T,
  logContext: StaffActivityContext = {},
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    requestEmployeePin(
      actionKey,
      () => {
        Promise.resolve(action()).then(resolve).catch(reject);
      },
      logContext,
    );
  });
}
