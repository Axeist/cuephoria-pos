/**
 * /app/t/:slug — the workspace landing for a specific tenant.
 *
 * Resolution order:
 *   1. Look up the slug publicly. If missing / suspended, show not-found.
 *   2. Check the current admin session via /api/admin/me.
 *      - No session → send to /login (we preserve the intended slug in
 *        sessionStorage so post-login routing could read it in the future).
 *      - Session for that tenant → redirect to /dashboard.
 *      - Session for a different tenant → show "wrong workspace" panel
 *        with sign-out-and-retry CTA.
 *   3. Render a short splash while deciding so we never flash the dashboard
 *      for an unauthorized user.
 */

import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { AlertCircle, ArrowRight, Building2, Loader2, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

type PublicBranding = {
  display_name?: string;
  tagline?: string;
  primary_color?: string;
  accent_color?: string;
  logo_url?: string;
  icon_url?: string;
  hide_powered_by?: boolean;
};

type WorkspaceResp = {
  ok: true;
  workspace: {
    slug: string;
    name: string;
    country: string;
    branding?: PublicBranding;
  } | null;
};
type MeResp = {
  ok: true;
  user: { id: string; username: string } | null;
  organization: { id: string; slug: string; isInternal: boolean; role: string } | null;
};

const fetcher = async <T,>(url: string): Promise<T> => {
  const res = await fetch(url, { credentials: "same-origin" });
  const json = await res.json();
  if (!res.ok || !json?.ok) throw new Error(json?.error || `Request failed (${res.status})`);
  return json as T;
};

const TenantWorkspace: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();

  const wsQuery = useQuery({
    queryKey: ["public", "workspace", slug],
    queryFn: () => fetcher<WorkspaceResp>(`/api/public/workspace?slug=${encodeURIComponent(slug ?? "")}`),
    enabled: Boolean(slug),
    staleTime: 60_000,
  });

  const meQuery = useQuery({
    queryKey: ["public", "tenant-workspace-me"],
    queryFn: () => fetcher<MeResp>("/api/admin/me"),
    enabled: wsQuery.isSuccess && Boolean(wsQuery.data?.workspace),
  });

  // Remember intended tenant so a future login-page enhancement could
  // pick it up; never used for routing in Slice 3.
  React.useEffect(() => {
    if (slug) {
      try {
        window.sessionStorage?.setItem("cuetronix.intended_workspace", slug);
      } catch {
        /* ignore */
      }
    }
  }, [slug]);

  // Decide & navigate once we have both answers.
  React.useEffect(() => {
    if (!wsQuery.data) return;
    if (!wsQuery.data.workspace) return; // render not-found below
    if (meQuery.isLoading || !meQuery.data) return;

    const { user, organization } = meQuery.data;
    if (!user) {
      // Unauthenticated → send to the *branded* login for this workspace so
      // the visitor sees the tenant's name/colors before typing credentials.
      navigate(`/app/t/${slug}/login`, { replace: true });
      return;
    }

    const userSlug = organization?.slug;
    if (userSlug && userSlug === slug) {
      navigate("/dashboard", { replace: true });
      return;
    }
    // Otherwise: user is signed in but not a member. Render guidance below.
  }, [wsQuery.data, meQuery.data, meQuery.isLoading, navigate, slug]);

  // --- Render states ------------------------------------------------------
  if (wsQuery.isLoading) return <Splash label="Resolving workspace…" branding={undefined} />;

  if (wsQuery.isError) {
    return (
      <Shell>
        <PanelError
          title="We hit a snag"
          message={(wsQuery.error as Error).message}
          onRetry={() => wsQuery.refetch()}
        />
      </Shell>
    );
  }

  const workspace = wsQuery.data?.workspace;
  if (!workspace) {
    return (
      <Shell>
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md mx-auto text-center"
        >
          <div className="h-14 w-14 mx-auto rounded-2xl bg-rose-500/10 grid place-items-center">
            <AlertCircle className="h-7 w-7 text-rose-400" />
          </div>
          <h1 className="mt-4 text-xl font-semibold text-zinc-100">Workspace not found</h1>
          <p className="mt-2 text-sm text-zinc-400">
            We couldn't find a workspace named <span className="font-mono text-zinc-200">{slug}</span>.
            Double-check the URL, or ask whoever invited you for the correct link.
          </p>
          <Button className="mt-6" onClick={() => navigate("/login")}>
            Go to sign in
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </motion.div>
      </Shell>
    );
  }

  // Workspace exists; we're waiting on /me or the user is signed into a different org.
  const me = meQuery.data;
  if (!me && meQuery.isLoading)
    return (
      <Splash
        label={`Opening ${workspace.branding?.display_name || workspace.name}…`}
        branding={workspace.branding}
      />
    );

  if (me?.user && me.organization?.slug && me.organization.slug !== slug) {
    return (
      <Shell>
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md mx-auto text-center"
        >
          <div className="h-14 w-14 mx-auto rounded-2xl bg-amber-500/10 grid place-items-center">
            <ShieldAlert className="h-7 w-7 text-amber-400" />
          </div>
          <h1 className="mt-4 text-xl font-semibold text-zinc-100">Different workspace</h1>
          <p className="mt-2 text-sm text-zinc-400">
            You're signed in as <span className="font-mono text-zinc-200">{me.user.username}</span>, a
            member of <span className="font-medium text-zinc-200">{me.organization.slug}</span>, not
            <span className="font-medium text-zinc-200"> {workspace.name}</span>.
          </p>
          <div className="mt-6 flex items-center justify-center gap-2">
            <Button variant="outline" onClick={() => navigate("/dashboard", { replace: true })}>
              Continue as {me.user.username}
            </Button>
            <Button
              onClick={async () => {
                await fetch("/api/admin/logout", { method: "POST", credentials: "same-origin" });
                navigate("/login", { replace: true });
              }}
            >
              Sign out &amp; retry
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </motion.div>
      </Shell>
    );
  }

  return (
    <Splash
      label={`Opening ${workspace.branding?.display_name || workspace.name}…`}
      branding={workspace.branding}
    />
  );
};

export default TenantWorkspace;

// ---------------------------------------------------------------------------
// Presentation helpers
// ---------------------------------------------------------------------------
const Shell: React.FC<{ children: React.ReactNode; primary?: string; accent?: string }> = ({ children, primary, accent }) => {
  const p = primary ?? "#6366f1";
  const a = accent ?? "#a855f7";
  return (
    <div className="min-h-screen bg-[#05060c] text-zinc-100 relative overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-95"
        style={{
          background: `radial-gradient(800px circle at 28% 22%, ${p}26, transparent 62%), radial-gradient(700px circle at 80% 78%, ${a}1f, transparent 62%)`,
        }}
      />
      <motion.div
        aria-hidden
        animate={{ opacity: [0.35, 0.6, 0.35] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        className="pointer-events-none absolute -top-32 -left-32 h-[460px] w-[460px] rounded-full blur-[140px]"
        style={{ background: p }}
      />
      <motion.div
        aria-hidden
        animate={{ opacity: [0.25, 0.5, 0.25] }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 1.5 }}
        className="pointer-events-none absolute -bottom-32 -right-32 h-[440px] w-[440px] rounded-full blur-[120px]"
        style={{ background: a }}
      />
      <div
        aria-hidden
        className="absolute inset-0 opacity-[0.035] pointer-events-none"
        style={{
          backgroundImage: "radial-gradient(rgba(255,255,255,0.8) 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }}
      />
      <div className="relative z-10 min-h-screen flex items-center justify-center p-6">
        <div className="w-full max-w-xl">{children}</div>
      </div>
    </div>
  );
};

const Splash: React.FC<{ label: string; branding?: PublicBranding }> = ({ label, branding }) => {
  const primary = branding?.primary_color ?? "#6366f1";
  const accent = branding?.accent_color ?? "#a855f7";
  const gradient = `linear-gradient(135deg, ${primary}, ${accent})`;
  const displayName = branding?.display_name;
  const tagline = branding?.tagline;

  return (
    <Shell primary={primary} accent={accent}>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex flex-col items-center gap-5 text-center"
      >
        <motion.div
          initial={{ scale: 0.92, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 160, damping: 14 }}
          className="relative"
        >
          <motion.div
            aria-hidden
            animate={{ opacity: [0.5, 1, 0.5], scale: [0.95, 1.05, 0.95] }}
            transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
            className="absolute inset-0 rounded-[22px] blur-xl"
            style={{ background: gradient }}
          />
          <div
            className="relative h-20 w-20 rounded-2xl grid place-items-center shadow-2xl overflow-hidden"
            style={{ background: gradient, boxShadow: `0 18px 46px -12px ${primary}66` }}
          >
            {branding?.logo_url ? (
              <img
                src={branding.logo_url}
                alt={displayName || "Workspace logo"}
                className="h-full w-full object-contain p-3"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).style.display = "none";
                }}
              />
            ) : (
              <Building2 className="h-8 w-8 text-white drop-shadow" />
            )}
          </div>
        </motion.div>
        {displayName && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.15 }}
            className="text-2xl font-extrabold text-zinc-100 tracking-tight"
          >
            {displayName}
          </motion.div>
        )}
        {tagline && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.25 }}
            className="text-sm text-zinc-400 max-w-sm"
          >
            {tagline}
          </motion.div>
        )}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.35 }}
          className="flex items-center gap-2 text-sm text-zinc-400"
        >
          <Loader2 className="h-4 w-4 animate-spin" />
          {label}
        </motion.div>
      </motion.div>
    </Shell>
  );
};

const PanelError: React.FC<{ title: string; message: string; onRetry: () => void }> = ({ title, message, onRetry }) => (
  <div className="max-w-md mx-auto text-center">
    <div className="h-14 w-14 mx-auto rounded-2xl bg-rose-500/10 grid place-items-center">
      <AlertCircle className="h-7 w-7 text-rose-400" />
    </div>
    <h1 className="mt-4 text-xl font-semibold text-zinc-100">{title}</h1>
    <p className="mt-2 text-sm text-zinc-400">{message}</p>
    <Button className="mt-6" onClick={onRetry}>Retry</Button>
  </div>
);
