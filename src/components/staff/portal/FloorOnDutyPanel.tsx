import { adminFetch } from "@/services/adminFetch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Clock, Users } from "lucide-react";

export type FloorClockIn = {
  staffId: string;
  staffName: string;
  username: string;
  designation: string | null;
  clockIn: string;
  locationId: string | null;
};

type Props = {
  rows: FloorClockIn[];
  className?: string;
};

export default function FloorOnDutyPanel({ rows, className }: Props) {
  return (
    <Card className={className ?? "glass-card border-border/50"}>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2 text-white">
          <Users className="h-5 w-5 text-primary" />
          On duty now
        </CardTitle>
        <CardDescription>
          Staff clocked in at this venue — enter your own PIN below to join or manage your shift.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No one is clocked in yet.</p>
        ) : (
          <ul className="space-y-2">
            {rows.map((row) => (
              <li
                key={`${row.staffId}-${row.clockIn}`}
                className="flex items-center justify-between gap-3 rounded-lg border border-border/40 bg-card/20 px-3 py-2.5"
              >
                <div className="min-w-0">
                  <p className="font-medium text-white truncate">{row.staffName}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {row.designation || row.username}
                  </p>
                </div>
                <Badge variant="outline" className="shrink-0 border-green-500/40 text-green-400 gap-1">
                  <Clock className="h-3 w-3" />
                  {format(new Date(row.clockIn), "hh:mm a")}
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

export async function fetchFloorClockInsClient(locationId?: string | null): Promise<FloorClockIn[]> {
  const qs = locationId ? `?locationId=${encodeURIComponent(locationId)}` : "";
  const res = await adminFetch(`/api/admin/staff-portal${qs}`, { method: "GET" });
  const json = (await res.json().catch(() => ({}))) as {
    ok?: boolean;
    floorClockIns?: FloorClockIn[];
  };
  if (!res.ok || !json.ok) return [];
  return json.floorClockIns ?? [];
}
