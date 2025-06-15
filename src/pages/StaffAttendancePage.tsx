
import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import StaffClockInOutWidget from "../components/staff/StaffClockInOutWidget";
import { useToast } from "@/hooks/use-toast";

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

const StaffAttendancePage: React.FC = () => {
  // For demo: emulate staff user by picking from profiles (replace with login later)
  const [selectedStaff, setSelectedStaff] = useState<StaffProfile | null>(null);
  const [profiles, setProfiles] = useState<StaffProfile[]>([]);
  const [attendanceToday, setAttendanceToday] = useState<AttendanceRow | null>(null);
  const [loading, setLoading] = useState(false);
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
      if (error && error.code !== "PGRST116") // ignore "no row found"
        toast({ title: "Error loading attendance", description: error.message, variant: "destructive" });
      setAttendanceToday(data || null);
      setLoading(false);
    };
    fetchAttendance();
  }, [selectedStaff, toast]);

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
        <StaffClockInOutWidget
          staff={selectedStaff}
          attendance={attendanceToday}
          setAttendance={setAttendanceToday}
        />
      )}
    </div>
  );
};

export default StaffAttendancePage;
