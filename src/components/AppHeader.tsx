import React, { useEffect, useMemo, useState } from "react";
import { Activity, Calendar, Clock } from "lucide-react";
import { LocationSwitcher } from "@/components/LocationSwitcher";
import { GlobalNotificationBell } from "@/components/GlobalNotificationBell";
import { useAuth } from "@/context/AuthContext";
import { usePOS } from "@/context/POSContext";

/**
 * Formats a greeting based on the current hour so the bar feels alive
 * rather than static across the day.
 */
function greetingForHour(hour: number): string {
  if (hour < 5) return "Working late";
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  if (hour < 21) return "Good evening";
  return "Good night";
}

/**
 * Live ticking clock. Re-renders every second so the seconds digit updates
 * without a layout shift (we reserve fixed width via `tabular-nums`).
 */
function LiveClock() {
  const [now, setNow] = useState<Date>(() => new Date());

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const time = now.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
  const date = now.toLocaleDateString([], {
    weekday: "short",
    day: "2-digit",
    month: "short",
  });

  return (
    <div className="hidden lg:flex items-center gap-2">
      <div className="flex h-7 w-7 items-center justify-center rounded-md bg-white/[0.04] border border-white/10 shadow-inner shadow-white/[0.03]">
        <Clock className="h-3.5 w-3.5 text-cuephoria-lightpurple" />
      </div>
      <div className="leading-none">
        <div className="text-[13px] font-semibold tracking-wide text-white/90 tabular-nums">
          {time}
        </div>
        <div className="mt-1 flex items-center gap-1 text-[9px] uppercase tracking-[0.14em] text-white/40">
          <Calendar className="h-2.5 w-2.5" />
          <span>{date}</span>
        </div>
      </div>
    </div>
  );
}

/**
 * Subtle "app is live" pill showing how many gaming stations are currently
 * occupied. Shows a neutral state when nothing is running so it never nags.
 */
function LiveActivityPill() {
  const { stations } = usePOS();

  const activeSessions = useMemo(
    () => stations.filter((s) => s.isOccupied).length,
    [stations],
  );

  const isLive = activeSessions > 0;

  return (
    <div
      className={`hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-medium transition-colors ${
        isLive
          ? "bg-emerald-500/10 border-emerald-400/30 text-emerald-300"
          : "bg-white/[0.04] border-white/10 text-white/50"
      }`}
      title={
        isLive
          ? `${activeSessions} gaming ${activeSessions === 1 ? "session" : "sessions"} running`
          : "No active sessions"
      }
    >
      <span className="relative flex h-1.5 w-1.5">
        {isLive && (
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
        )}
        <span
          className={`relative inline-flex rounded-full h-1.5 w-1.5 ${
            isLive ? "bg-emerald-400" : "bg-white/30"
          }`}
        />
      </span>
      <Activity className="h-3 w-3 opacity-80" />
      <span className="tabular-nums">
        {activeSessions} {activeSessions === 1 ? "session" : "sessions"}
      </span>
      <span className="hidden xl:inline text-[9px] uppercase tracking-widest opacity-60">
        {isLive ? "live" : "idle"}
      </span>
    </div>
  );
}

/**
 * Greeting chip — displays a time-of-day salutation plus the currently signed
 * in staff member. Falls back to a generic greeting when we have no user
 * (e.g. during auth transitions).
 */
function StaffGreeting() {
  const { user } = useAuth();
  const [hour, setHour] = useState<number>(() => new Date().getHours());

  useEffect(() => {
    const id = window.setInterval(() => setHour(new Date().getHours()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  const greeting = greetingForHour(hour);
  const displayName = user?.username
    ? user.username.charAt(0).toUpperCase() + user.username.slice(1)
    : null;

  return (
    <div className="hidden xl:flex flex-col leading-none">
      <span className="text-[9px] uppercase tracking-[0.18em] text-white/40">
        {greeting}
      </span>
      <span className="mt-1 text-[13px] font-semibold text-white/85">
        {displayName ? `@${displayName}` : "Welcome back"}
      </span>
    </div>
  );
}

/**
 * Tracks whether the window has been scrolled past a threshold so we can
 * deepen the glass effect. Uses a passive listener and rAF-style throttling
 * via a simple boolean state transition to avoid layout thrash.
 */
function useIsScrolled(threshold = 4): boolean {
  const [scrolled, setScrolled] = useState<boolean>(false);

  useEffect(() => {
    const update = () => setScrolled(window.scrollY > threshold);
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, [threshold]);

  return scrolled;
}

/**
 * Top-of-app utility bar. Sticks to the top of the viewport and deepens its
 * glass layers once the user begins scrolling, giving a premium floating
 * feel without stealing attention when the page is at rest.
 */
export function AppHeader() {
  const scrolled = useIsScrolled();

  return (
    <header
      className="hidden md:flex items-center justify-between px-5 py-2 gap-4 sticky top-0 z-30 isolate"
      style={{
        background: scrolled
          ? "linear-gradient(180deg, rgba(10,6,22,0.88) 0%, rgba(10,6,22,0.62) 100%)"
          : "linear-gradient(180deg, rgba(10,6,22,0.55) 0%, rgba(10,6,22,0.2) 100%)",
        backdropFilter: scrolled
          ? "blur(22px) saturate(180%)"
          : "blur(16px) saturate(150%)",
        WebkitBackdropFilter: scrolled
          ? "blur(22px) saturate(180%)"
          : "blur(16px) saturate(150%)",
        borderBottom: scrolled
          ? "1px solid rgba(255,255,255,0.08)"
          : "1px solid rgba(255,255,255,0.04)",
        boxShadow: scrolled
          ? "0 8px 32px -12px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.06)"
          : "inset 0 1px 0 rgba(255,255,255,0.04)",
        transition:
          "background 220ms ease, backdrop-filter 220ms ease, border-color 220ms ease, box-shadow 220ms ease",
      }}
    >
      {/* Radial highlight glow — sits behind the content and provides the
          "advanced glass" depth cue by tinting the upper strip with a soft
          purple bloom. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 opacity-70"
        style={{
          background:
            "radial-gradient(120% 160% at 50% -40%, rgba(168,85,247,0.18) 0%, rgba(168,85,247,0) 55%)",
        }}
      />
      {/* Bottom hairline glow — a warm violet line right below the border to
          separate the bar from content without a hard edge. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-px -z-10"
        style={{
          background:
            "linear-gradient(90deg, transparent 0%, rgba(168,85,247,0.35) 50%, transparent 100%)",
          opacity: scrolled ? 0.55 : 0.25,
          transition: "opacity 220ms ease",
        }}
      />

      <div className="flex items-center gap-3 min-w-0">
        <StaffGreeting />
        <div className="hidden xl:block h-7 w-px bg-white/10" />
        <LiveClock />
      </div>

      <div className="flex items-center gap-2.5">
        <LiveActivityPill />
        <div className="hidden md:block h-5 w-px bg-white/10" />
        <LocationSwitcher />
        <GlobalNotificationBell />
      </div>
    </header>
  );
}

export default AppHeader;
