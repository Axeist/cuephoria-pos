import React from "react";
import { createPortal } from "react-dom";
import { useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Info, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSidebar } from "@/components/ui/sidebar";
import { useOrganization } from "@/context/OrganizationContext";
import { useAuth } from "@/context/AuthContext";
import { useIsMobile } from "@/hooks/use-mobile";

type TourItem = {
  path: string;
  label: string;
  description: string;
  details?: string;
  quickTips?: string[];
  adminOnly?: boolean;
};

const TOUR_ITEMS: TourItem[] = [
  {
    path: "/dashboard",
    label: "Dashboard",
    description: "Your command center for live business health.",
    details:
      "Start your day here to check revenue, active sessions, pending bookings, and any operational alerts in one glance.",
    quickTips: ["Review today's KPIs before opening shifts", "Use trend cards to spot peak demand hours"],
  },
  {
    path: "/pos",
    label: "POS",
    description: "Create bills fast and complete checkout without delays.",
    details:
      "Use POS for walk-ins, add snacks/products, apply discounts, split payments, and close bills accurately at the counter.",
    quickTips: ["Search customers to apply loyalty quickly", "Use split payment for cash + UPI checkout"],
  },
  {
    path: "/stations",
    label: "Gaming Stations",
    description: "Control live sessions for tables, consoles, and stations.",
    details:
      "Start, pause, extend, or stop sessions while tracking occupancy and usage time so billing always stays accurate.",
    quickTips: ["Keep an eye on idle stations to improve utilization", "Extend running sessions without opening a new bill"],
  },
  {
    path: "/products",
    label: "Products",
    description: "Manage your menu, pricing, and inventory structure.",
    details:
      "Organize categories, set item prices, mark stock, and prepare products for fast POS billing during peak hours.",
    quickTips: ["Group products by quick-sell categories", "Update low-stock items before evening rush"],
  },
  {
    path: "/customers",
    label: "Customers",
    description: "Build repeat business with better customer tracking.",
    details:
      "View customer history, sessions, spend, and loyalty so your team can personalize offers and improve retention.",
    quickTips: ["Capture phone numbers for faster repeat billing", "Use spend history to run targeted offers"],
  },
  {
    path: "/reports",
    label: "Reports",
    description: "Analyze performance and make data-backed decisions.",
    details:
      "Track revenue, utilization, item sales, and trends by day/week/month to optimize pricing and staffing.",
    quickTips: ["Check hourly utilization to tune pricing slabs", "Export statements for accountant or partner review"],
  },
  {
    path: "/booking-management",
    label: "Bookings",
    description: "Handle online/public bookings with full control.",
    details:
      "Review incoming bookings, manage slots, confirm changes, and prevent overbooking by keeping the calendar updated.",
    quickTips: ["Confirm pending slots early to avoid no-shows", "Use slot view to identify overbooked windows"],
  },
  {
    path: "/staff",
    label: "Staff Management",
    description: "Set up team members and permission boundaries.",
    details:
      "Invite staff, assign roles, and control access so operations stay secure while each employee sees only what they need.",
    quickTips: ["Use least-privilege roles for safety", "Review permissions whenever responsibilities change"],
    adminOnly: true,
  },
  {
    path: "/settings",
    label: "Settings",
    description: "Customize workspace rules, identity, and preferences.",
    details:
      "Configure branding, billing defaults, booking behavior, and workspace options that shape your daily operational flow.",
    quickTips: ["Set branding before sharing booking links", "Verify billing defaults to reduce manual edits"],
  },
  {
    path: "/how-to-use",
    label: "How to Use",
    description: "Open guided docs and walkthroughs anytime.",
    details:
      "Use this section for team onboarding, feature explainers, and SOP-style instructions when training new staff.",
    quickTips: ["Share with new hires on day one", "Revisit when enabling a new module"],
  },
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
  const [sidebarClearRight, setSidebarClearRight] = React.useState(300);

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
    const CARD_HEIGHT = 470;
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

      // Keep the entire sidebar visibly clear (no backdrop blur) while
      // dimming/blurring only the rest of the app.
      const sidebarItemRects = items
        .map((it) => document.querySelector(`[data-tour-path="${it.path}"]`) as HTMLElement | null)
        .filter((node): node is HTMLElement => !!node)
        .map((node) => node.getBoundingClientRect());
      if (sidebarItemRects.length) {
        const maxRight = Math.max(...sidebarItemRects.map((r) => r.right));
        const clearRight = Math.min(window.innerWidth - 120, Math.max(220, maxRight + 20));
        setSidebarClearRight(clearRight);
      }

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

  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        className="pointer-events-none fixed inset-0 z-[10050]"
      >
        <div
          className="absolute inset-y-0 right-0 bg-[radial-gradient(circle_at_25%_20%,rgba(99,102,241,0.2),transparent_45%),radial-gradient(circle_at_85%_70%,rgba(217,70,239,0.22),transparent_45%),rgba(8,4,20,0.62)] backdrop-blur-[14px] backdrop-saturate-150"
          style={{ left: sidebarClearRight }}
        />
        <div
          className="absolute inset-y-0 w-px bg-white/10"
          style={{ left: sidebarClearRight }}
          aria-hidden
        />
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
          className="pointer-events-auto absolute w-[380px] rounded-3xl border border-white/25 bg-[linear-gradient(180deg,rgba(48,28,82,0.74),rgba(18,10,34,0.7))] p-5 text-zinc-100 shadow-[0_28px_90px_-28px_rgba(0,0,0,0.92),0_0_0_1px_rgba(255,255,255,0.08),inset_0_1px_0_rgba(255,255,255,0.09)] backdrop-blur-3xl"
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
          {item.details ? <p className="mt-2 text-xs leading-relaxed text-zinc-400">{item.details}</p> : null}
          {item.quickTips?.length ? (
            <div className="mt-3 rounded-xl border border-white/10 bg-black/20 p-2.5">
              <p className="text-[10px] uppercase tracking-[0.16em] text-zinc-400">Quick tips</p>
              <ul className="mt-1.5 space-y-1.5">
                {item.quickTips.map((tip) => (
                  <li key={tip} className="flex items-start gap-2 text-xs text-zinc-300">
                    <span className="mt-1 h-1.5 w-1.5 rounded-full bg-fuchsia-300/80" />
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
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
    </AnimatePresence>,
    document.body,
  );
};

export default SidebarTourOverlay;
