
import React from "react";
import { Button } from "@/components/ui/button";

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

interface Props {
  requests: LeaveRequest[];
  isLoading: boolean;
  onAction?: (id: string, action: "approved" | "rejected") => void;
  actionable?: boolean;
}

const StaffLeaveRequestsTable: React.FC<Props> = ({
  requests, isLoading, onAction, actionable = false
}) => {
  return (
    <div className="overflow-auto rounded shadow">
      <table className="min-w-full bg-cuephoria-dark text-white text-sm">
        <thead>
          <tr>
            <th className="px-2 py-1">Staff</th>
            <th className="px-2 py-1">From</th>
            <th className="px-2 py-1">To</th>
            <th className="px-2 py-1">Reason</th>
            <th className="px-2 py-1">Status</th>
            <th className="px-2 py-1">Remarks</th>
            {actionable && <th className="px-2 py-1">Action</th>}
          </tr>
        </thead>
        <tbody>
          {isLoading ? (
            <tr>
              <td colSpan={actionable ? 7 : 6} className="py-6 text-center">Loading...</td>
            </tr>
          ) : requests.length === 0 ? (
            <tr>
              <td colSpan={actionable ? 7 : 6} className="py-6 text-center opacity-60">No leave requests</td>
            </tr>
          ) : (
            requests.map(req => (
              <tr key={req.id} className="border-b border-cuephoria-lightpurple/15">
                <td className="px-2 py-1">{req.staff?.full_name || "-"} <span className="text-xs text-cuephoria-lightpurple">({req.staff?.username})</span></td>
                <td className="px-2 py-1">{req.start_date}</td>
                <td className="px-2 py-1">{req.end_date}</td>
                <td className="px-2 py-1">{req.reason || ""}</td>
                <td className="px-2 py-1">
                  <span className={
                    req.status === "approved"
                      ? "text-green-400"
                      : req.status === "pending"
                      ? "text-yellow-400"
                      : "text-red-400"
                  }>{req.status}</span>
                </td>
                <td className="px-2 py-1">{req.remarks || ""}</td>
                {actionable && (
                  <td className="px-2 py-1">
                    {req.status === "pending" && onAction && (
                      <div className="flex gap-1">
                        <Button size="sm" variant="outline" onClick={() => onAction(req.id, "approved")}>Approve</Button>
                        <Button size="sm" variant="destructive" onClick={() => onAction(req.id, "rejected")}>Reject</Button>
                      </div>
                    )}
                  </td>
                )}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};

export default StaffLeaveRequestsTable;
