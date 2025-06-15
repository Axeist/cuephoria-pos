
import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import StaffAttendanceTable from "../components/staff/StaffAttendanceTable";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import StaffLeaveRequestsTable from "@/components/staff/StaffLeaveRequestsTable";

type StaffProfile = {
  id: string;
  username: string;
  full_name: string;
  phone?: string;
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

type LeaveRequest = {
  id: string;
  staff_id: string;
  start_date: string;
  end_date: string;
  reason: string | null;
  status: string;
  remarks?: string | null;
  staff?: { full_name: string; username: string };
};

const StaffAttendanceDashboard: React.FC = () => {
  const [attendance, setAttendance] = useState<AttendanceRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState(() => format(new Date(), "yyyy-MM-dd"));
  const [staffList, setStaffList] = useState<StaffProfile[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [leaveLoading, setLeaveLoading] = useState(false);

  const { toast } = useToast();

  // Fetch list of staff members (profiles)
  useEffect(() => {
    const fetchStaff = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("staff_profiles")
        .select("*")
        .order("full_name", { ascending: true });
      if (error) toast({ title: "Error fetching staff", description: error.message, variant: "destructive" });
      setStaffList(data || []);
      setLoading(false);
    };
    fetchStaff();
  }, []);

  // Fetch attendance for the selected date
  useEffect(() => {
    const fetchAttendance = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("staff_attendance")
        .select("*, staff:staff_profiles(*)")
        .eq("date", selectedDate)
        .order("clock_in", { ascending: true });
      if (error) toast({ title: "Error loading attendance", description: error.message, variant: "destructive" });
      setAttendance(data || []);
      setLoading(false);
    };
    fetchAttendance();
  }, [selectedDate, toast]);

  // Fetch leave requests for all staff
  useEffect(() => {
    const fetchLeaveRequests = async () => {
      setLeaveLoading(true);
      const { data, error } = await supabase
        .from("staff_leave_requests")
        .select("*, staff:staff_profiles(id, full_name, username)")
        .order("created_at", { ascending: false });
      if (error) {
        toast({ title: "Error loading leave requests", description: error.message, variant: "destructive" });
        setLeaveRequests([]);
      } else {
        setLeaveRequests(data || []);
      }
      setLeaveLoading(false);
    };
    fetchLeaveRequests();
  }, [toast]);

  // Handle Approve/Reject
  const handleLeaveAction = async (id: string, action: "approved" | "rejected") => {
    const status = action;
    const { error } = await supabase
      .from("staff_leave_requests")
      .update({ status })
      .eq("id", id);
    if (error) {
      toast({ title: `Could not ${action}`, description: error.message, variant: "destructive" });
    } else {
      toast({ title: `Leave ${action === "approved" ? "approved" : "rejected"}` });
      // Refetch leave requests after update
      setLeaveRequests(prev => prev.map(r => r.id === id ? { ...r, status } : r));
    }
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedDate(e.target.value);
  };

  return (
    <div className="max-w-5xl mx-auto p-8 space-y-8">
      <h2 className="text-3xl font-bold font-heading mb-4">Staff Attendance Dashboard</h2>
      <div className="flex flex-col md:flex-row items-center gap-4 mb-4">
        <label className="text-base font-semibold text-cuephoria-lightpurple">
          Select Date:
        </label>
        <input
          type="date"
          value={selectedDate}
          onChange={handleDateChange}
          className="bg-cuephoria-dark text-white px-3 py-2 rounded border border-cuephoria-lightpurple/50"
        />
        <Button
          onClick={() => setSelectedDate(format(new Date(), "yyyy-MM-dd"))}
          variant="outline"
        >
          Today
        </Button>
      </div>
      <StaffAttendanceTable
        attendance={attendance}
        staffList={staffList}
        isLoading={loading}
        selectedDate={selectedDate}
      />
      {/* Leave Requests Section */}
      <div>
        <h3 className="text-xl mt-8 mb-4 font-bold font-heading text-cuephoria-lightpurple">
          Leave Requests
        </h3>
        <StaffLeaveRequestsTable
          requests={leaveRequests}
          isLoading={leaveLoading}
          onAction={handleLeaveAction}
          actionable={true}
        />
      </div>
      {/* Next version: Monthly overview, analytics, and CSV export. */}
    </div>
  );
};

export default StaffAttendanceDashboard;
