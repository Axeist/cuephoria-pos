
import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

type Props = {
  staffId: string;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
};

const LeaveRequestDialog: React.FC<Props> = ({ staffId, open, onClose, onSuccess }) => {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!startDate || !endDate) {
      toast({ title: "Dates required", description: "Please select start and end dates.", variant: "destructive" });
      return;
    }
    setLoading(true);
    const { error } = await supabase
      .from("staff_leave_requests")
      .insert({
        staff_id: staffId,
        start_date: startDate,
        end_date: endDate,
        reason,
        status: "pending",
      });
    setLoading(false);
    if (error) {
      toast({ title: "Failed to submit", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Leave requested", description: "Your leave request has been submitted." });
      onSuccess();
      onClose();
      setStartDate("");
      setEndDate("");
      setReason("");
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => !loading && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Request Leave</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <Label className="mt-2">Start Date</Label>
          <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} required />
          <Label className="mt-4">End Date</Label>
          <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} required />
          <Label className="mt-4">Reason</Label>
          <Input type="text" value={reason} onChange={e => setReason(e.target.value)} placeholder="Optional" />
          <DialogFooter>
            <Button variant="outline" type="button" onClick={onClose} disabled={loading}>Cancel</Button>
            <Button type="submit" loading={loading ? "Submitting..." : undefined} disabled={loading}>
              {loading ? "Submitting..." : "Submit Request"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default LeaveRequestDialog;
