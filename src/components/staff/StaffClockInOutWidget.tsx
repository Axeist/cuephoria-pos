
import React, { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

type StaffProfile = {
  id: string;
  full_name: string;
  username: string;
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
};

interface StaffClockInOutWidgetProps {
  staff: StaffProfile;
  attendance: AttendanceRow | null;
  setAttendance: (a: AttendanceRow | null) => void;
}

const StaffClockInOutWidget: React.FC<StaffClockInOutWidgetProps> = ({
  staff,
  attendance,
  setAttendance,
}) => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const today = new Date().toISOString().split("T")[0];

  const handleClockIn = async () => {
    setLoading(true);
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from("staff_attendance")
      .insert({
        staff_id: staff.id,
        date: today,
        clock_in: now,
        status: "present",
      })
      .select()
      .maybeSingle();
    if (error) {
      toast({ title: "Clock In Failed", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Clocked In!", description: `Welcome, ${staff.full_name}` });
      setAttendance(data);
    }
    setLoading(false);
  };

  const handleClockOut = async () => {
    if (!attendance) return;
    setLoading(true);

    const now = new Date();
    const clockInTime = attendance.clock_in ? new Date(attendance.clock_in) : now;
    const mins =
      Math.ceil((now.getTime() - clockInTime.getTime()) / (1000 * 60));
    const { data, error } = await supabase
      .from("staff_attendance")
      .update({
        clock_out: now.toISOString(),
        duration_minutes: mins,
      })
      .eq("id", attendance.id)
      .select()
      .maybeSingle();
    if (error) {
      toast({ title: "Clock Out Failed", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Clocked Out!", description: `Goodbye, ${staff.full_name}` });
      setAttendance(data);
    }
    setLoading(false);
  };

  return (
    <div className="p-5 shadow rounded bg-cuephoria-dark/90">
      <div className="flex items-center gap-4 mb-4">
        {staff.photo_url ? (
          <img className="w-14 h-14 rounded-full" src={staff.photo_url} alt={staff.full_name} />
        ) : (
          <div className="w-14 h-14 rounded-full bg-cuephoria-lightpurple flex items-center justify-center text-xl font-bold text-white">
            {staff.full_name.charAt(0)}
          </div>
        )}
        <div>
          <div className="text-lg font-bold text-white">{staff.full_name}</div>
          <div className="text-xs text-cuephoria-lightpurple mt-1">
            {attendance
              ? `Attendance for today: ${attendance.status || "present"}`
              : "No clock-in yet"}
          </div>
        </div>
      </div>
      <div className="space-x-4 space-y-2">
        {!attendance?.clock_in ? (
          <button
            className="bg-green-500 hover:bg-green-600 text-white px-5 py-2 rounded font-semibold"
            onClick={handleClockIn}
            disabled={loading}
          >
            {loading ? <Loader2 className="inline animate-spin" /> : "Clock In"}
          </button>
        ) : !attendance.clock_out ? (
          <button
            className="bg-orange-500 hover:bg-orange-600 text-white px-5 py-2 rounded font-semibold"
            onClick={handleClockOut}
            disabled={loading}
          >
            {loading ? <Loader2 className="inline animate-spin" /> : "Clock Out"}
          </button>
        ) : (
          <div className="text-green-400 font-semibold">
            Session Complete — Duration: {attendance.duration_minutes || 0} min
          </div>
        )}
      </div>
      {attendance?.clock_in && (
        <div className="text-sm mt-4 text-gray-400">
          <div>Clock In: {attendance.clock_in ? new Date(attendance.clock_in).toLocaleTimeString() : "--"}</div>
          <div>Clock Out: {attendance.clock_out ? new Date(attendance.clock_out).toLocaleTimeString() : "--"}</div>
        </div>
      )}
    </div>
  );
};

export default StaffClockInOutWidget;
