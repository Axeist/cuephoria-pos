// src/components/AppSidebar.tsx
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import {
  Home,
  ShoppingCart,
  User,
  BarChart2,
  Settings,
  Package,
  Clock,
  Users,
  Menu,
  Shield,
  PowerOff,
  BookOpen,
  Calendar,
  Users2,
  UserCircle,
  Bot,
  Sparkles,
  CreditCard,
  Activity,
  Smartphone,
  Monitor,
} from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarSeparator,
  useSidebar,
} from '@/components/ui/sidebar';
import { useAuth } from '@/context/AuthContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { useViewMode } from '@/context/ViewModeContext';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { GlobalNotificationBell } from '@/components/GlobalNotificationBell';
import { LocationSwitcher } from '@/components/LocationSwitcher';
import { useLocation as useLocationCtx } from '@/context/LocationContext';
import { useTenantBrandingOptional } from '@/branding/BrandingProvider';
import { usePOS } from '@/context/POSContext';
import { cn } from '@/lib/utils';

const AppSidebar: React.FC = () => {
  const location = useLocation();
  const { user, logout } = useAuth();
  const { setOpen, state } = useSidebar();
  const hideOnPaths = ['/receipt'];
  const shouldHide = hideOnPaths.some((path) => location.pathname.includes(path));
  const isMobile = useIsMobile();
  const { isMobile: viewModeIsMobile, mode: viewMode, setOverride, triggerPrompt } = useViewMode();
  const [sheetOpen, setSheetOpen] = useState(false);
  const hoverLeaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const branding = useTenantBrandingOptional();
  const override = branding?.override ?? {};
  const brandName =
    override.display_name || branding?.brand?.name || 'Cuephoria';
  const brandLogo = override.logo_url;

  const queryClient = useQueryClient();
  const isAdmin = user?.isAdmin || false;
  const isSuperAdmin = user?.isSuperAdmin || false;

  const prefetchBilling = useCallback(() => {
    void queryClient.prefetchQuery({
      queryKey: ['tenant-billing'],
      queryFn: async () => {
        const res = await fetch('/api/tenant/billing', { credentials: 'same-origin' });
        const json = await res.json().catch(() => ({}));
        if (!res.ok || json?.ok === false) {
          throw new Error(json?.error || `Billing prefetch failed (${res.status})`);
        }
        return json;
      },
      staleTime: 60_000,
    });
  }, [queryClient]);
  const roleLabel = isSuperAdmin ? 'Super Admin' : isAdmin ? 'Admin' : 'Staff';
  const showName = (user?.displayName?.trim() || user?.username || '').trim();
  const footerSubtitle = [user?.designation?.trim(), roleLabel].filter(Boolean).join(' · ');

  const { activeLocation } = useLocationCtx();
  const isLite = activeLocation?.slug === 'lite';

  // Live session count for the mobile header pill (mirrors the desktop
  // `AppHeader.LiveActivityPill` that's hidden below md). Falls back to 0 if
  // the POS context isn't yet hydrated.
  let activeSessionsCount = 0;
  try {
    const { stations } = usePOS();
    activeSessionsCount = stations?.filter((s: { isOccupied?: boolean }) => s.isOccupied).length ?? 0;
  } catch {
    // POSProvider not mounted (shouldn't happen in protected route, but stay safe).
    activeSessionsCount = 0;
  }
  const hasActiveSession = activeSessionsCount > 0;

  const desktopCollapsed = !isMobile && state === 'collapsed';

  const handleSidebarPointerEnter = useCallback(() => {
    if (isMobile) return;
    if (hoverLeaveTimer.current) {
      clearTimeout(hoverLeaveTimer.current);
      hoverLeaveTimer.current = null;
    }
    setOpen(true);
  }, [isMobile, setOpen]);

  const handleSidebarPointerLeave = useCallback(() => {
    if (isMobile) return;
    if (hoverLeaveTimer.current) clearTimeout(hoverLeaveTimer.current);
    hoverLeaveTimer.current = setTimeout(() => {
      setOpen(false);
      hoverLeaveTimer.current = null;
    }, 220);
  }, [isMobile, setOpen]);

  useEffect(() => {
    return () => {
      if (hoverLeaveTimer.current) clearTimeout(hoverLeaveTimer.current);
    };
  }, []);

  if (!user || shouldHide) return null;

  const baseMenuItems = [
    { icon: Home, label: 'Dashboard', path: '/dashboard' },
    { icon: ShoppingCart, label: 'POS', path: '/pos' },
    { icon: Clock, label: 'Gaming Stations', path: '/stations' },
    { icon: Package, label: 'Products', path: '/products' },
    { icon: Users, label: 'Customers', path: '/customers' },
    { icon: BarChart2, label: 'Reports', path: '/reports' },
    { icon: Calendar, label: 'Bookings', path: '/booking-management' },
  ];

  const menuItems = [
    ...baseMenuItems,
    ...(isAdmin ? [{ icon: Users2, label: 'Staff Management', path: '/staff' }] : []),
    ...(!isAdmin ? [{ icon: UserCircle, label: 'My Portal', path: '/staff-portal' }] : []),
    { icon: Bot, label: 'Cuephoria AI', path: '/chat-ai' },
    ...(isAdmin ? [{ icon: CreditCard, label: 'Subscription', path: '/subscription' }] : []),
    { icon: Settings, label: 'Settings', path: '/settings' },
    { icon: BookOpen, label: 'How to Use', path: '/how-to-use' },
  ];

  const BrandLogo = (
    <div
      className="relative h-11 w-11 rounded-xl grid place-items-center overflow-hidden shadow-[0_10px_30px_-8px_var(--brand-primary-hex)] flex-shrink-0"
      style={{
        background:
          'linear-gradient(135deg, var(--brand-primary-hex), var(--brand-accent-hex))',
      }}
    >
      {brandLogo ? (
        <img
          src={brandLogo}
          alt={brandName}
          className="h-full w-full object-contain p-1.5"
          onError={(e) => ((e.currentTarget as HTMLImageElement).style.display = 'none')}
        />
      ) : (
        <Sparkles className="h-5 w-5 text-white" />
      )}
      <div className="pointer-events-none absolute inset-0 rounded-xl ring-1 ring-white/15" />
    </div>
  );

  const Brand = (
    <div className="flex items-center gap-3 min-w-0">
      {BrandLogo}
      <div className="min-w-0">
        <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/50">
          Workspace
        </div>
        <div className="text-base font-extrabold tracking-tight text-white truncate">
          {brandName}
          {isLite && (
            <span className="ml-1.5 text-[10px] font-semibold uppercase text-cyan-200/80">
              · Lite
            </span>
          )}
        </div>
      </div>
    </div>
  );

  const NavLinks = ({
    collapsed,
    onNavigate,
  }: {
    collapsed: boolean;
    onNavigate?: () => void;
  }) => (
    <nav className="space-y-1">
      {menuItems.map((item) => {
        const active = location.pathname === item.path;
        const link = (
          <Link
            to={item.path}
            onClick={onNavigate}
            onMouseEnter={item.path === '/subscription' ? prefetchBilling : undefined}
            onFocus={item.path === '/subscription' ? prefetchBilling : undefined}
            title={collapsed ? item.label : undefined}
            data-tour-path={item.path}
            data-tour-label={item.label}
            className={cn(
              'group relative flex items-center rounded-xl py-2.5 text-sm font-medium transition-all duration-200',
              collapsed ? 'justify-center px-0' : 'gap-3 px-3',
              active
                ? 'text-white'
                : 'text-white/65 hover:text-white hover:bg-white/[0.04]',
            )}
          >
            {active && (
              <>
                <span
                  aria-hidden
                  className="absolute inset-0 rounded-xl opacity-90"
                  style={{
                    background:
                      'linear-gradient(90deg, color-mix(in oklab, var(--brand-primary-hex) 28%, transparent), color-mix(in oklab, var(--brand-accent-hex) 18%, transparent))',
                    border:
                      '1px solid color-mix(in oklab, var(--brand-primary-hex) 45%, transparent)',
                    boxShadow:
                      '0 8px 24px -10px color-mix(in oklab, var(--brand-primary-hex) 50%, transparent), inset 0 1px 0 rgba(255,255,255,0.06)',
                  }}
                />
                <span
                  aria-hidden
                  className={cn(
                    'absolute top-1/2 -translate-y-1/2 h-5 w-0.5 rounded-r-full',
                    collapsed ? 'left-1' : 'left-0',
                  )}
                  style={{ background: 'var(--brand-primary-hex)' }}
                />
              </>
            )}
            <item.icon
              className={cn(
                'relative z-10 h-4.5 w-4.5 flex-shrink-0 transition-colors',
                active ? 'text-white' : 'text-white/55 group-hover:text-white/90',
              )}
              style={{ width: 18, height: 18 }}
            />
            <span
              className={cn(
                'relative z-10 truncate transition-[opacity,width] duration-200',
                collapsed ? 'sr-only' : 'flex-1 min-w-0',
              )}
            >
              {item.label}
            </span>
          </Link>
        );

        return (
          <React.Fragment key={item.path}>
            {link}
          </React.Fragment>
        );
      })}
    </nav>
  );

  const UserCardDesktop = desktopCollapsed ? (
    <div className="flex flex-col items-center gap-2 py-1">
      <div
        className="h-9 w-9 rounded-lg grid place-items-center flex-shrink-0 cursor-default"
        style={{
          background:
            'linear-gradient(135deg, color-mix(in oklab, var(--brand-primary-hex) 35%, transparent), color-mix(in oklab, var(--brand-accent-hex) 25%, transparent))',
          border:
            '1px solid color-mix(in oklab, var(--brand-primary-hex) 40%, transparent)',
        }}
        title={`${showName} · ${footerSubtitle}`}
      >
        {isAdmin ? (
          <Shield className="h-4 w-4 text-white" />
        ) : (
          <User className="h-4 w-4 text-white" />
        )}
      </div>
      <button
        type="button"
        onClick={() => {
          setSheetOpen(false);
          logout();
        }}
        className="h-8 w-8 grid place-items-center rounded-lg text-white/50 hover:text-white hover:bg-red-500/25 transition-colors"
        title="Sign out"
      >
        <PowerOff className="h-4 w-4" />
      </button>
    </div>
  ) : (
    <div className="glass-card p-3 flex items-center gap-3">
      <div
        className="h-9 w-9 rounded-lg grid place-items-center flex-shrink-0"
        style={{
          background:
            'linear-gradient(135deg, color-mix(in oklab, var(--brand-primary-hex) 35%, transparent), color-mix(in oklab, var(--brand-accent-hex) 25%, transparent))',
          border:
            '1px solid color-mix(in oklab, var(--brand-primary-hex) 40%, transparent)',
        }}
      >
        {isAdmin ? (
          <Shield className="h-4 w-4 text-white" />
        ) : (
          <User className="h-4 w-4 text-white" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold text-white truncate">{showName}</div>
        <div className="text-[11px] text-white/55 truncate">{footerSubtitle}</div>
      </div>
      <button
        type="button"
        onClick={() => {
          setSheetOpen(false);
          logout();
        }}
        className="h-8 w-8 grid place-items-center rounded-lg text-white/50 hover:text-white hover:bg-red-500/25 transition-colors"
        title="Sign out"
      >
        <PowerOff className="h-4 w-4" />
      </button>
    </div>
  );

  // ─── Mobile (sheet) ────────────────────────────────────────────────────────
  if (isMobile) {
    return (
      <>
        <div
          className="fixed top-0 left-0 right-0 z-30 border-b border-white/10"
          style={{
            background:
              'linear-gradient(180deg, rgba(10,6,22,0.95) 0%, rgba(10,6,22,0.85) 100%)',
            backdropFilter: 'blur(18px) saturate(140%)',
            WebkitBackdropFilter: 'blur(18px) saturate(140%)',
            paddingTop: 'max(0px, env(safe-area-inset-top))',
          }}
        >
          <div className="flex items-center justify-between px-3 py-2 gap-2">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
                <SheetTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-white h-10 w-10 hover:bg-white/10 shrink-0"
                  >
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent
                  side="left"
                  className="p-0 w-[86%] max-w-[300px] border-white/10 text-white"
                  style={{
                    background:
                      'linear-gradient(180deg, rgba(10,6,22,0.98) 0%, rgba(7,3,15,0.98) 100%)',
                    backdropFilter: 'blur(24px) saturate(150%)',
                    WebkitBackdropFilter: 'blur(24px) saturate(150%)',
                  }}
                >
                  <div className="h-full flex flex-col">
                    <div className="p-4">{Brand}</div>
                    <div className="px-3 pb-2 flex items-center gap-2">
                      <GlobalNotificationBell />
                      <LocationSwitcher />
                    </div>
                    <div className="hero-divider mx-4" />
                    <div className="flex-1 overflow-auto p-3">
                      <NavLinks collapsed={false} onNavigate={() => setSheetOpen(false)} />
                    </div>
                    {/* View-mode switcher — lets the user flip between
                        mobile-optimized and standard view from inside the
                        nav sheet. */}
                    <div className="px-3 pb-2">
                      <div className="rounded-xl border border-white/10 bg-white/[0.04] p-2 flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setOverride('mobile')}
                          className={cn(
                            'flex-1 flex items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-[11px] font-semibold transition-colors',
                            viewMode === 'mobile'
                              ? 'bg-white/15 text-white'
                              : 'text-white/55 hover:text-white hover:bg-white/[0.06]',
                          )}
                        >
                          <Smartphone className="h-3.5 w-3.5" />
                          Mobile
                        </button>
                        <button
                          type="button"
                          onClick={() => setOverride('desktop')}
                          className={cn(
                            'flex-1 flex items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-[11px] font-semibold transition-colors',
                            viewMode === 'desktop'
                              ? 'bg-white/15 text-white'
                              : 'text-white/55 hover:text-white hover:bg-white/[0.06]',
                          )}
                        >
                          <Monitor className="h-3.5 w-3.5" />
                          Desktop
                        </button>
                      </div>
                    </div>
                    <div className="p-3">
                      <div className="glass-card p-3 flex items-center gap-3">
                        <div
                          className="h-9 w-9 rounded-lg grid place-items-center flex-shrink-0"
                          style={{
                            background:
                              'linear-gradient(135deg, color-mix(in oklab, var(--brand-primary-hex) 35%, transparent), color-mix(in oklab, var(--brand-accent-hex) 25%, transparent))',
                            border:
                              '1px solid color-mix(in oklab, var(--brand-primary-hex) 40%, transparent)',
                          }}
                        >
                          {isAdmin ? (
                            <Shield className="h-4 w-4 text-white" />
                          ) : (
                            <User className="h-4 w-4 text-white" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-semibold text-white truncate">
                            {showName}
                          </div>
                          <div className="text-[11px] text-white/55 truncate">{footerSubtitle}</div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setSheetOpen(false);
                            logout();
                          }}
                          className="h-8 w-8 grid place-items-center rounded-lg text-white/50 hover:text-white hover:bg-red-500/25 transition-colors"
                          title="Sign out"
                        >
                          <PowerOff className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
              <div className="flex items-center gap-2 min-w-0">
                <div
                  className="h-8 w-8 rounded-lg grid place-items-center shadow-[0_6px_18px_-6px_var(--brand-primary-hex)] shrink-0"
                  style={{
                    background:
                      'linear-gradient(135deg, var(--brand-primary-hex), var(--brand-accent-hex))',
                  }}
                >
                  <Sparkles className="h-4 w-4 text-white" />
                </div>
                <span className="text-base font-extrabold text-white tracking-tight truncate">
                  {brandName}
                  {isLite && (
                    <span className="ml-1 text-[10px] font-semibold uppercase text-cyan-200/80">
                      · Lite
                    </span>
                  )}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              {/* Live activity pill — mirrors AppHeader.LiveActivityPill on
                  desktop. Tappable opens nothing today; purely informational. */}
              {hasActiveSession ? (
                <div
                  className="flex items-center gap-1 rounded-full bg-emerald-500/15 border border-emerald-400/30 px-2 py-0.5 text-[10px] font-semibold text-emerald-300 tabular-nums"
                  title={`${activeSessionsCount} gaming ${activeSessionsCount === 1 ? 'session' : 'sessions'} running`}
                >
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-400" />
                  </span>
                  <Activity className="h-2.5 w-2.5 opacity-80" />
                  <span>{activeSessionsCount}</span>
                </div>
              ) : null}
              <GlobalNotificationBell />
            </div>
          </div>
          {/* Compact second row: only renders when multiple branches exist
              (LocationSwitcher hides itself otherwise). Keeps branch context
              one tap away on phones. */}
          <div className="px-3 pb-2 -mt-1 flex items-center justify-between gap-2 flex-wrap [&:empty]:hidden">
            <LocationSwitcher />
          </div>
        </div>
        {/* Spacer for the fixed top bar. Slightly taller to account for
            optional second row + safe-area inset. */}
        <div
          style={{
            paddingTop: 'calc(60px + env(safe-area-inset-top))',
          }}
        />
      </>
    );
  }

  // ─── Desktop ───────────────────────────────────────────────────────────────
  return (
    <Sidebar
      collapsible="icon"
      className="border-r-0 text-white overflow-visible"
      style={{
        background:
          'linear-gradient(180deg, rgba(10,6,22,0.92) 0%, rgba(7,3,15,0.96) 100%)',
        backdropFilter: 'blur(20px) saturate(150%)',
        WebkitBackdropFilter: 'blur(20px) saturate(150%)',
      }}
      onPointerEnter={handleSidebarPointerEnter}
      onPointerLeave={handleSidebarPointerLeave}
    >
      {/* Right-edge vertical glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 right-0 w-px"
        style={{
          background:
            'linear-gradient(180deg, transparent 0%, color-mix(in oklab, var(--brand-primary-hex) 60%, transparent) 50%, transparent 100%)',
        }}
      />
      <SidebarHeader
        className={cn(
          'p-4 transition-[padding] duration-200',
          desktopCollapsed && 'px-2 py-3 flex items-center justify-center',
        )}
      >
        {desktopCollapsed ? BrandLogo : Brand}
      </SidebarHeader>
      <div className={cn('hero-divider mx-4 transition-[margin] duration-200', desktopCollapsed && 'mx-2')} />
      <SidebarContent className={cn('mt-3 px-2 transition-[padding] duration-200', desktopCollapsed && 'px-1.5')}>
        <SidebarGroup className={cn(desktopCollapsed && 'p-1.5')}>
          <SidebarGroupContent>
            <NavLinks collapsed={desktopCollapsed} />
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarSeparator
        className={cn('mx-4 bg-white/10 transition-[margin] duration-200', desktopCollapsed && 'mx-2')}
      />
      <SidebarFooter className={cn('p-3 transition-[padding] duration-200', desktopCollapsed && 'p-2')}>
        {UserCardDesktop}
      </SidebarFooter>
    </Sidebar>
  );
};

export default AppSidebar;
