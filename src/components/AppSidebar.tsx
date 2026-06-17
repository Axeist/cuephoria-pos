// src/components/AppSidebar.tsx
import React, { useCallback, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Shield,
  User,
  PowerOff,
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
import { usePermissions } from '@/context/PermissionsContext';
import { useViewMode } from '@/context/ViewModeContext';
import { useAppNavItems } from '@/hooks/useAppNavItems';
import { useLocation as useLocationCtx } from '@/context/LocationContext';
import { useTenantBrandingOptional } from '@/branding/BrandingProvider';
import { CUETRONIX_ASSETS } from '@/branding/assets';
import { cn } from '@/lib/utils';

const AppSidebar: React.FC = () => {
  const location = useLocation();
  const { user, logout } = useAuth();
  const { setOpen, state } = useSidebar();
  const hideOnPaths = ['/receipt'];
  const shouldHide = hideOnPaths.some((path) => location.pathname.includes(path));
  const { isMobile } = useViewMode();
  const hoverLeaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const branding = useTenantBrandingOptional();
  const override = branding?.override ?? {};
  const brandName =
    override.display_name || branding?.brand?.name || 'Cuephoria';
  const brandLogo = override.logo_url;

  const isAdmin = user?.isAdmin || false;
  const isSuperAdmin = user?.isSuperAdmin || false;
  const { role: workspaceRole } = usePermissions();
  const { menuItems, prefetchBilling } = useAppNavItems();
  const roleLabel = workspaceRole?.name || (isSuperAdmin ? 'Super Admin' : isAdmin ? 'Admin' : 'Staff');
  const showName = (user?.displayName?.trim() || user?.username || '').trim();
  const footerSubtitle = [user?.designation?.trim(), roleLabel].filter(Boolean).join(' · ');

  const { activeLocation } = useLocationCtx();
  const isLite = activeLocation?.slug === 'lite';

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

  // Mobile uses AppScreenHeader + AppBottomNav + MobileNavSheet.
  if (isMobile) return null;

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
        <img
          src={CUETRONIX_ASSETS.iconUrl}
          alt={CUETRONIX_ASSETS.logoAlt}
          className="h-full w-full object-contain"
          draggable={false}
        />
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
        onClick={() => logout()}
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
        onClick={() => logout()}
        className="h-8 w-8 grid place-items-center rounded-lg text-white/50 hover:text-white hover:bg-red-500/25 transition-colors"
        title="Sign out"
      >
        <PowerOff className="h-4 w-4" />
      </button>
    </div>
  );

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
