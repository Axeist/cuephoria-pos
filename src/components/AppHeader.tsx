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
    <div className="hidden lg:flex items-center gap-2.5 pl-1">
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5 border border-white/10">
        <Clock className="h-4 w-4 text-cuephoria-lightpurple" />
      </div>
      <div className="leading-tight">
        <div className="text-sm font-semibold tracking-wide text-white/90 tabular-nums">
          {time}
        </div>
        <div className="flex items-center gap-1 text-[10px] uppercase tracking-[0.14em] text-white/40">
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
      className={`hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-medium transition-colors ${
        isLive
          ? "bg-emerald-500/10 border-emerald-400/30 text-emerald-300"
          : "bg-white/5 border-white/10 text-white/50"
      }`}
      title={
        isLive
          ? `${activeSessions} gaming ${activeSessions === 1 ? "session" : "sessions"} running`
          : "No active sessions"
      }
    >
      <span className="relative flex h-2 w-2">
        {isLive && (
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
        )}
        <span
          className={`relative inline-flex rounded-full h-2 w-2 ${
            isLive ? "bg-emerald-400" : "bg-white/30"
          }`}
        />
      </span>
      <Activity className="h-3.5 w-3.5 opacity-80" />
      <span className="tabular-nums">
        {activeSessions} {activeSessions === 1 ? "session" : "sessions"}
      </span>
      <span className="hidden xl:inline text-[10px] uppercase tracking-widest opacity-60">
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
    // Update hourly so "Good morning" flips over correctly on long sessions.
    const id = window.setInterval(() => setHour(new Date().getHours()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  const greeting = greetingForHour(hour);
  const displayName = user?.username
    ? user.username.charAt(0).toUpperCase() + user.username.slice(1)
    : null;

  return (
    <div className="hidden xl:flex flex-col leading-tight">
      <span className="text-[10px] uppercase tracking-[0.18em] text-white/40">
        {greeting}
      </span>
      <span className="text-sm font-semibold text-white/85">
        {displayName ? `@${displayName}` : "Welcome back"}
      </span>
    </div>
  );
}

/**
 * Top-of-app utility bar that sits above `<main>`. Previously an empty strip
 * holding only the branch switcher & notification bell — now surfaces live
 * context (time, greeting, active sessions) so the space feels purposeful.
 */
export function AppHeader() {
  return (
    <div
      className="hidden md:flex items-center justify-between px-5 py-2.5 gap-4 sticky top-0 z-20"
      style={{
        background:
          "linear-gradient(180deg, rgba(10,6,22,0.78) 0%, rgba(10,6,22,0.3) 100%)",
        backdropFilter: "blur(14px) saturate(140%)",
        WebkitBackdropFilter: "blur(14px) saturate(140%)",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      <div className="flex items-center gap-4 min-w-0">
        <StaffGreeting />
        <div className="hidden xl:block h-8 w-px bg-white/10" />
        <LiveClock />
      </div>

      <div className="flex items-center gap-3">
        <LiveActivityPill />
        <div className="hidden md:block h-6 w-px bg-white/10" />
        <LocationSwitcher />
        <GlobalNotificationBell />
      </div>
    </div>
  );
}

export default AppHeader;
