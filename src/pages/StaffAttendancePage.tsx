
import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import StaffClockInOutWidget from "../components/staff/StaffClockInOutWidget";
import { useToast } from "@/hooks/use-toast";
import LeaveRequestDialog from "@/components/staff/LeaveRequestDialog";
import { Button } from "@/components/ui/button";
import StaffLeaveRequestsTable from "@/components/staff/StaffLeaveRequestsTable";

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

type LeaveRequest = {
  id: string;
  staff_id: string;
  start_date: string;
  end_date: string;
  reason: string | null;
  status: string;
  remarks?: string | null;
};

const StaffAttendancePage: React.FC = () => {
  // For demo: emulate staff user by picking from profiles (replace with login later)
  const [selectedStaff, setSelectedStaff] = useState<StaffProfile | null>(null);
  const [profiles, setProfiles] = useState<StaffProfile[]>([]);
  const [attendanceToday, setAttendanceToday] = useState<AttendanceRow | null>(null);
  const [loading, setLoading] = useState(false);

  const [leaveDialogOpen, setLeaveDialogOpen] = useState(false);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [leaveLoading, setLeaveLoading] = useState(false);
  
  const { toast } = useToast();

  useEffect(() => {
    const loadProfiles = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("staff_profiles")
        .select("id, full_name, username, photo_url")
        .order("full_name");
      if (error) toast({ title: "Error loading staff", description: error.message, variant: "destructive" });
      setProfiles(data || []);
      setLoading(false);
    };
    loadProfiles();
  }, [toast]);

  // Demo: Select staff from dropdown (replace with auth in next steps)
  const handleStaffSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const staff = profiles.find((p) => p.id === e.target.value) || null;
    setSelectedStaff(staff);
    setAttendanceToday(null);
    setLeaveRequests([]);
  };

  // Fetch today's attendance for selected staff
  useEffect(() => {
    if (!selectedStaff) return;
    const fetchAttendance = async () => {
      setLoading(true);
      const today = new Date().toISOString().split("T")[0];
      const { data, error } = await supabase
        .from("staff_attendance")
        .select("*")
        .eq("staff_id", selectedStaff.id)
        .eq("date", today)
        .maybeSingle();
      if (error && error.code !== "PGRST116")
        toast({ title: "Error loading attendance", description: error.message, variant: "destructive" });
      setAttendanceToday(data || null);
      setLoading(false);
    };
    fetchAttendance();
  }, [selectedStaff, toast]);

  // Fetch leave requests for the staff
  useEffect(() => {
    if (!selectedStaff) {
      setLeaveRequests([]);
      return;
    }
    const fetchLeaveRequests = async () => {
      setLeaveLoading(true);
      const { data, error } = await supabase
        .from("staff_leave_requests")
        .select("*")
        .eq("staff_id", selectedStaff.id)
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
  }, [selectedStaff, leaveDialogOpen, toast]);

  return (
    <div className="max-w-lg mx-auto p-6 space-y-6">
      <h2 className="text-2xl font-bold text-cuephoria-lightpurple mb-3">
        Staff Attendance
      </h2>
      <div className="mb-4">
        <label className="block font-medium mb-2">Select Staff:</label>
        <select
          className="w-full px-3 py-2 bg-cuephoria-dark text-white rounded border border-cuephoria-lightpurple/40"
          onChange={handleStaffSelect}
          value={selectedStaff?.id || ""}
        >
          <option value="">Choose...</option>
          {profiles.map((profile) => (
            <option key={profile.id} value={profile.id}>
              {profile.full_name} ({profile.username})
            </option>
          ))}
        </select>
      </div>
      {selectedStaff && (
        <>
          <StaffClockInOutWidget
            staff={selectedStaff}
            attendance={attendanceToday}
            setAttendance={setAttendanceToday}
          />
          <div className="mt-6">
            <div className="flex items-center justify-between mb-2">
              <div className="font-semibold text-base">My Leave Requests</div>
              <Button
                size="sm"
                onClick={() => setLeaveDialogOpen(true)}
                className="bg-cuephoria-lightpurple hover:bg-cuephoria-blue"
              >Request Leave</Button>
            </div>
            <StaffLeaveRequestsTable
              requests={leaveRequests}
              isLoading={leaveLoading}
              actionable={false}
            />
          </div>
          <LeaveRequestDialog
            staffId={selectedStaff.id}
            open={leaveDialogOpen}
            onClose={() => setLeaveDialogOpen(false)}
            onSuccess={() => { /* Refetch via useEffect on open/close */ }}
          />
        </>
      )}
    </div>
  );
};

export default StaffAttendancePage;
