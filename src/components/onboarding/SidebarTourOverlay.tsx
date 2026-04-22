import React from "react";
import { useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
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
  // Bump version when tour visuals/behavior change so existing users
  // see the updated experience once.
  return `cuephoria_sidebar_tour_v2:${orgId}`;
}

const SidebarTourOverlay: React.FC = () => {
  const { setOpen } = useSidebar();
  const { organization } = useOrganization();
  const { user } = useAuth();
  const location = useLocation();
  const isMobile = useIsMobile();
  const [open, setOverlayOpen] = React.useState(false);
  const [index, setIndex] = React.useState(0);
  const [cardPos, setCardPos] = React.useState<{ top: number; left: number }>({
    top: 88,
    left: 96,
  });
  const [anchorSide, setAnchorSide] = React.useState<"left" | "right">("left");
  const [targetRect, setTargetRect] = React.useState<{
    top: number;
    left: number;
    width: number;
    height: number;
  } | null>(null);

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

  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        localStorage.setItem(keyForOrg(organization?.id || ""), "1");
        setOverlayOpen(false);
        setOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, organization?.id, setOpen]);

  React.useEffect(() => {
    if (!open) return;
    const CARD_WIDTH = 380;
    const CARD_HEIGHT = 390;
    const GAP = 14;
    const PAD = 16;

    const updatePosition = () => {
      const target = items[index];
      if (!target) return;
      const el = document.querySelector(`[data-tour-path="${target.path}"]`) as HTMLElement | null;
      if (!el) {
        setCardPos({ top: 88, left: Math.max(PAD, window.innerWidth - CARD_WIDTH - PAD) });
        setTargetRect(null);
        return;
      }

      const rect = el.getBoundingClientRect();
      setTargetRect({
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
      });
      let side: "left" | "right" = "left";
      let left = rect.right + GAP;
      if (left + CARD_WIDTH > window.innerWidth - PAD) {
        left = Math.max(PAD, rect.left - CARD_WIDTH - GAP);
        side = "right";
      }
      let top = rect.top + rect.height / 2 - CARD_HEIGHT / 2;
      top = Math.max(PAD, Math.min(top, window.innerHeight - CARD_HEIGHT - PAD));
      setCardPos({ top, left });
      setAnchorSide(side);
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [index, items, open]);

  if (!open || !organization || !items.length) return null;

  const item = items[index];
  const done = () => {
    localStorage.setItem(keyForOrg(organization.id), "1");
    setOverlayOpen(false);
    setOpen(false);
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        className="pointer-events-none fixed inset-0 z-[90] bg-[radial-gradient(circle_at_25%_20%,rgba(99,102,241,0.16),transparent_45%),radial-gradient(circle_at_85%_70%,rgba(217,70,239,0.16),transparent_45%),rgba(8,4,20,0.42)] backdrop-blur-[8px]"
      >
        {targetRect && (
          <motion.div
            layout
            transition={{ type: "spring", stiffness: 360, damping: 32, mass: 0.65 }}
            className="absolute rounded-xl border border-fuchsia-300/70 shadow-[0_0_0_2px_rgba(232,121,249,0.2),0_0_36px_rgba(217,70,239,0.48)]"
            style={{
              top: targetRect.top - 4,
              left: targetRect.left - 4,
              width: targetRect.width + 8,
              height: targetRect.height + 8,
            }}
          />
        )}
      <motion.div
        key={item.path}
        initial={{ opacity: 0, y: 10, scale: 0.985 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.22, ease: "easeOut" }}
        className="pointer-events-auto absolute w-[380px] rounded-3xl border border-white/20 bg-[linear-gradient(180deg,rgba(34,18,60,0.78),rgba(16,10,30,0.72))] p-5 text-zinc-100 shadow-[0_28px_80px_-28px_rgba(0,0,0,0.85),0_0_0_1px_rgba(255,255,255,0.06)] backdrop-blur-2xl"
        style={{ top: cardPos.top, left: cardPos.left }}
      >
        <div
          aria-hidden
          className={`absolute top-[52%] h-3.5 w-3.5 -translate-y-1/2 rotate-45 border border-white/20 bg-[rgba(32,16,56,0.86)] ${anchorSide === "left" ? "-left-2" : "-right-2"}`}
        />
        <div
          className="pointer-events-none absolute inset-0 rounded-3xl"
          aria-hidden
          style={{
            background:
              "radial-gradient(120% 100% at 100% 0%, rgba(232,121,249,0.2) 0%, rgba(99,102,241,0.12) 40%, transparent 80%)",
          }}
        />
        <div className="mb-3 flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="inline-flex items-center gap-1.5 rounded-full border border-fuchsia-300/25 bg-fuchsia-500/12 px-2 py-0.5 text-[10px] uppercase tracking-[0.2em] text-fuchsia-200/90">
              <Sparkles className="h-3 w-3" />
              Quick Sidebar Tour
            </p>
            <h3 className="mt-2 text-lg font-bold text-white">Know every page in 60 seconds</h3>
            <p className="mt-1 text-xs text-zinc-400">A polished walkthrough of your workspace modules.</p>
          </div>
          <button
            type="button"
            aria-label="Close tour"
            className="rounded-lg border border-white/15 bg-white/[0.04] p-1.5 text-zinc-300 hover:bg-white/10 hover:text-white"
            onClick={done}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="relative rounded-2xl border border-white/15 bg-white/[0.06] p-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-[11px] uppercase tracking-[0.16em] text-zinc-400">Current module</p>
            <span className="rounded-full border border-white/15 bg-black/20 px-2 py-0.5 text-[11px] text-zinc-300">
              {index + 1} / {items.length}
            </span>
          </div>
          <p className="flex items-center gap-2 text-xs text-fuchsia-200">
            <Sparkles className="h-3.5 w-3.5" />
            {item.label}
          </p>
          <p className="mt-2 text-sm leading-relaxed text-zinc-300">{item.description}</p>
          <div className="mt-4 flex items-center gap-1.5">
            {items.map((_, i) => (
              <span
                key={`dot-${i}`}
                className={`h-1.5 rounded-full transition-all ${i === index ? "w-6 bg-fuchsia-400" : "w-1.5 bg-white/25"}`}
              />
            ))}
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 rounded-lg border border-white/15 bg-white/[0.05] text-zinc-300"
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
        <p className="mt-3 text-[11px] text-zinc-500">Tip: Press Esc to close this guide.</p>
      </motion.div>
    </motion.div>
    </AnimatePresence>
  );
};

export default SidebarTourOverlay;
