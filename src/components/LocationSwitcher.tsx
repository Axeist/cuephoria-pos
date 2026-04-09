import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useLocation } from "@/context/LocationContext";

/**
 * Branch selector for Main vs Cuephoria Lite (and future venues).
 */
export function LocationSwitcher() {
  const { locations, activeLocationId, setActiveLocationId, loading } = useLocation();

  if (loading || locations.length <= 1) {
    return null;
  }

  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="text-muted-foreground hidden sm:inline">Branch</span>
      <Select value={activeLocationId ?? undefined} onValueChange={setActiveLocationId}>
        <SelectTrigger className="w-[200px] h-9 bg-cuephoria-dark/80 border-cuephoria-lightpurple/30 text-white">
          <SelectValue placeholder="Select branch" />
        </SelectTrigger>
        <SelectContent>
          {locations.map((l) => (
            <SelectItem key={l.id} value={l.id}>
              <span className="font-medium">{l.name}</span>
              <span className="ml-2 text-xs text-muted-foreground">{l.short_code}</span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
