
import React from "react";
import { Loader2 } from "lucide-react";

type StaffProfile = {
  id: string;
  full_name: string;
  username: string;
  email?: string;
  role?: string;
  photo_url?: string;
};
type AttendanceRow = {
  id: string;
  staff_id: string;
  date: string;
  clock_in: string | null;
  clock_out: string | null;
  duration_minutes: number | null;
  status: string;
  notes?: string;
  staff?: StaffProfile;
};
interface StaffAttendanceTableProps {
  attendance: AttendanceRow[];
  staffList: StaffProfile[];
  isLoading: boolean;
  selectedDate: string;
}
const StaffAttendanceTable: React.FC<StaffAttendanceTableProps> = ({
  attendance,
  staffList,
  isLoading,
  selectedDate,
}) => {
  return (
    <div className="overflow-auto rounded shadow">
      <table className="min-w-full bg-cuephoria-dark text-white">
        <thead>
          <tr>
            <th className="px-3 py-2">Staff</th>
            <th className="px-3 py-2">Clock In</th>
            <th className="px-3 py-2">Clock Out</th>
            <th className="px-3 py-2">Duration</th>
            <th className="px-3 py-2">Status</th>
            <th className="px-3 py-2">Notes</th>
          </tr>
        </thead>
        <tbody>
          {isLoading ? (
            <tr>
              <td colSpan={6} className="py-8 text-center">
                <Loader2 className="mx-auto animate-spin" />
                Loading...
              </td>
            </tr>
          ) : attendance.length === 0 ? (
            <tr>
              <td colSpan={6} className="py-8 text-center opacity-70">
                No attendance records for {selectedDate}.
              </td>
            </tr>
          ) : (
            attendance.map((row) => (
              <tr key={row.id} className="border-b border-cuephoria-lightpurple/10">
                <td className="px-3 py-2 flex items-center gap-2">
                  {row.staff?.photo_url && (
                    <img
                      src={row.staff.photo_url}
                      alt={row.staff.full_name}
                      className="h-9 w-9 rounded-full object-cover bg-cuephoria-lightpurple/20"
                    />
                  )}
                  <span className="font-semibold">{row.staff?.full_name || "-"}</span>
                  <span className="text-xs text-cuephoria-lightpurple ml-1">
                    {row.staff?.username}
                  </span>
                </td>
                <td className="px-3 py-2">
                  {row.clock_in ? new Date(row.clock_in).toLocaleTimeString() : "--"}
                </td>
                <td className="px-3 py-2">
                  {row.clock_out ? new Date(row.clock_out).toLocaleTimeString() : "--"}
                </td>
                <td className="px-3 py-2 text-center">
                  {row.duration_minutes != null
                    ? `${row.duration_minutes} min`
                    : "--"}
                </td>
                <td className="px-3 py-2 text-center">
                  <span
                    className={
                      row.status === "present"
                        ? "text-green-400"
                        : row.status === "on_leave"
                        ? "text-yellow-400"
                        : row.status === "late"
                        ? "text-orange-400"
                        : "text-red-400"
                    }
                  >
                    {row.status}
                  </span>
                </td>
                <td className="px-3 py-2">{row.notes || ""}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};

export default StaffAttendanceTable;
