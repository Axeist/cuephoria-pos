import React from "react";
import { useLocation } from "react-router-dom";
import { Info, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSidebar } from "@/components/ui/sidebar";
import { useOrganization } from "@/context/OrganizationContext";
import { useAuth } from "@/context/AuthContext";
import { useIsMobile } from "@/hooks/use-mobile";

type TourItem = { path: string; label: string; description: string; adminOnly?: boolean };

const TOUR_ITEMS: TourItem[] = [
  { path: "/dashboard", label: "Dashboard", description: "Live KPIs, trends, and alerts." },
  { path: "/pos", label: "POS", description: "Create bills, apply discounts, and close sales quickly." },
  { path: "/stations", label: "Gaming Stations", description: "Manage stations and active sessions." },
  { path: "/products", label: "Products", description: "Organize categories, prices, and inventory." },
  { path: "/customers", label: "Customers", description: "Track profiles, loyalty, and spend history." },
  { path: "/reports", label: "Reports", description: "Detailed analytics, exportable statements, and drilldowns." },
  { path: "/booking-management", label: "Bookings", description: "Handle public bookings and slot management." },
  { path: "/staff", label: "Staff Management", description: "Invite staff and control permissions.", adminOnly: true },
  { path: "/settings", label: "Settings", description: "Configure branding, billing, and workspace preferences." },
  { path: "/how-to-use", label: "How to Use", description: "Open the full in-app training guide anytime." },
];

function keyForOrg(orgId: string): string {
  return `cuephoria_sidebar_tour_v1:${orgId}`;
}

const SidebarTourOverlay: React.FC = () => {
  const { setOpen } = useSidebar();
  const { organization } = useOrganization();
  const { user } = useAuth();
  const location = useLocation();
  const isMobile = useIsMobile();
  const [open, setOverlayOpen] = React.useState(false);
  const [index, setIndex] = React.useState(0);

  const items = React.useMemo(
    () => TOUR_ITEMS.filter((item) => !item.adminOnly || user?.isAdmin),
    [user?.isAdmin],
  );

  React.useEffect(() => {
    if (!organization?.onboardingCompletedAt) return;
    if (isMobile) return;
    const key = keyForOrg(organization.id);
    const seen = localStorage.getItem(key) === "1";
    if (!seen) {
      setOpen(true);
      setOverlayOpen(true);
    }
  }, [isMobile, organization?.id, organization?.onboardingCompletedAt, setOpen]);

  React.useEffect(() => {
    if (!open) return;
    const target = items[index];
    if (!target) return;
    const el = document.querySelector(`[data-tour-path="${target.path}"]`) as HTMLElement | null;
    if (!el) return;
    el.classList.add("ring-2", "ring-fuchsia-400/70");
    return () => {
      el.classList.remove("ring-2", "ring-fuchsia-400/70");
    };
  }, [index, items, open]);

  React.useEffect(() => {
    if (!open) return;
    const activeIdx = items.findIndex((item) => item.path === location.pathname);
    if (activeIdx >= 0) setIndex(activeIdx);
  }, [items, location.pathname, open]);

  if (!open || !organization || !items.length) return null;

  const item = items[index];
  const done = () => {
    localStorage.setItem(keyForOrg(organization.id), "1");
    setOverlayOpen(false);
  };

  return (
    <div className="pointer-events-none fixed inset-0 z-[70] bg-black/40">
      <div className="pointer-events-auto absolute right-6 top-20 w-[360px] rounded-2xl border border-white/10 bg-[#140a25]/95 p-5 text-zinc-100 shadow-2xl backdrop-blur-xl">
        <div className="mb-3 flex items-start justify-between gap-2">
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-fuchsia-200/80">
              Quick Sidebar Tour
            </p>
            <h3 className="mt-1 text-lg font-bold text-white">Know every page in 60 seconds</h3>
          </div>
          <button
            type="button"
            aria-label="Close tour"
            className="rounded-lg border border-white/15 p-1.5 text-zinc-300 hover:bg-white/10 hover:text-white"
            onClick={done}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
          <p className="flex items-center gap-2 text-xs text-fuchsia-200">
            <Sparkles className="h-3.5 w-3.5" />
            {item.label}
          </p>
          <p className="mt-2 text-sm text-zinc-300">{item.description}</p>
          <p className="mt-3 text-[11px] text-zinc-500">
            Step {index + 1} / {items.length}
          </p>
        </div>

        <div className="mt-4 flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 rounded-lg border border-white/10 bg-white/[0.03] text-zinc-300"
            onClick={() => setIndex((i) => Math.max(0, i - 1))}
            disabled={index === 0}
          >
            Previous
          </Button>
          {index < items.length - 1 ? (
            <Button
              size="sm"
              className="h-8 rounded-lg bg-gradient-to-r from-violet-500 to-fuchsia-500"
              onClick={() => setIndex((i) => Math.min(items.length - 1, i + 1))}
            >
              Next
            </Button>
          ) : (
            <Button size="sm" className="h-8 rounded-lg" onClick={done}>
              <Info className="mr-1.5 h-3.5 w-3.5" />
              Got it
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default SidebarTourOverlay;
