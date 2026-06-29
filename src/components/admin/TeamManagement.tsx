/** Settings → Team panel: roles matrix + member management. */
import RolesAndPermissionsPanel from './RolesAndPermissionsPanel';
import StaffManagement from './StaffManagement';
import EmployeePinProtectionCard from '@/components/staff/policies/EmployeePinProtectionCard';

export default function TeamManagement() {
  return (
    <div className="space-y-0">
      <EmployeePinProtectionCard />
      <RolesAndPermissionsPanel />
      <StaffManagement />
    </div>
  );
}
