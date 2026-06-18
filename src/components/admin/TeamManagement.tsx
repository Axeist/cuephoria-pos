/** Settings → Team panel: roles matrix + member management. */
import RolesAndPermissionsPanel from './RolesAndPermissionsPanel';
import StaffManagement from './StaffManagement';

export default function TeamManagement() {
  return (
    <>
      <RolesAndPermissionsPanel />
      <StaffManagement />
    </>
  );
}
