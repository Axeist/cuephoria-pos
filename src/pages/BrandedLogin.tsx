/**
 * /app/t/:slug/login — tenant-branded sign-in.
 *
 * Pulls the public workspace + branding, renders an aurora-lit hero on the
 * left and the sign-in form on the right. Identity-flexible on mobile: the
 * hero collapses into a compact header above the form.
 *
 * Behaviour
 *   - If the slug doesn't exist (or is suspended/canceled) → redirect to the
 *     unbranded /login. We never render the form for a non-existent workspace.
 *   - On successful login → navigate to /dashboard (TenantWorkspace handles
 *     any cross-tenant mismatch edge case).
 *   - If the user is already authenticated → bounce to /dashboard immediately.
 *
 * Fallbacks
 *   - Missing logo → uses the first letter of display_name inside a gradient
 *     chip with the tenant's primary color.
 *   - Broken logo URL → `onError` hides the img and the chip letter stays.
 *   - No primary_color → default indigo/fuchsia gradient (still premium).
 */

import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { Lock, ShieldCheck, Sparkles, Users } from "lucide-react";
import GoogleButton from "@/components/auth/GoogleButton";
import CuephoriaTechAttribution from "@/components/branding/CuephoriaTechAttribution";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";

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

const fetcher = async <T,>(url: string): Promise<T> => {
  const res = await fetch(url, { credentials: "same-origin" });
  const json = await res.json();
  if (!res.ok || !json?.ok) throw new Error(json?.error || `Request failed (${res.status})`);
  return json as T;
};

const BrandedLogin: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const wsQuery = useQuery({
    queryKey: ["public", "workspace", slug],
    queryFn: () =>
      fetcher<WorkspaceResp>(`/api/public/workspace?slug=${encodeURIComponent(slug ?? "")}`),
    enabled: Boolean(slug),
    staleTime: 60_000,
  });

  React.useEffect(() => {
    if (slug) {
      try {
        window.sessionStorage?.setItem("cuetronix.intended_workspace", slug);
      } catch {
        /* ignore */
      }
    }
  }, [slug]);

  // If already signed in → let TenantWorkspace handle routing.
  React.useEffect(() => {
    if (user) navigate(`/app/t/${slug}`, { replace: true });
  }, [user, slug, navigate]);

  // If the workspace doesn't exist, fall back to the default Cuephoria login
  // so visitors can still reach *something* actionable rather than a dead page.
  React.useEffect(() => {
    if (wsQuery.isSuccess && !wsQuery.data?.workspace) {
      navigate("/login", { replace: true });
    }
  }, [wsQuery.isSuccess, wsQuery.data, navigate]);

  const workspace = wsQuery.data?.workspace;
  const branding: PublicBranding = workspace?.branding ?? {};
  const primary = branding.primary_color ?? "#7c3aed";
  const accent = branding.accent_color ?? "#4f46e5";
  const displayName = branding.display_name || workspace?.name || "Workspace";
  const tagline = branding.tagline;
  const initial = (displayName || "?").trim().charAt(0).toUpperCase();

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-[#05060c] text-zinc-100 relative overflow-hidden">
      {/* Aurora background */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-90"
        style={{
          background: `radial-gradient(900px circle at 12% 18%, ${primary}22, transparent 58%), radial-gradient(800px circle at 88% 82%, ${accent}1c, transparent 60%)`,
        }}
      />
      <motion.div
        aria-hidden
        animate={{ opacity: [0.35, 0.6, 0.35] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        className="pointer-events-none absolute -top-40 -left-40 h-[520px] w-[520px] rounded-full blur-[140px]"
        style={{ background: primary }}
      />
      <motion.div
        aria-hidden
        animate={{ opacity: [0.25, 0.5, 0.25] }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 1.5 }}
        className="pointer-events-none absolute -bottom-32 -right-32 h-[460px] w-[460px] rounded-full blur-[120px]"
        style={{ background: accent }}
      />
      {/* Fine dot-grid (Cuephoria signature) */}
      <div
        aria-hidden
        className="absolute inset-0 opacity-[0.035] pointer-events-none"
        style={{
          backgroundImage: "radial-gradient(rgba(255,255,255,0.8) 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }}
      />

      {/* LEFT — tenant hero (desktop only) */}
      <aside className="hidden lg:flex lg:w-[56%] relative flex-col justify-between p-14">
        <BrandMark primary={primary} accent={accent} logoUrl={branding.logo_url} initial={initial} />

        <div className="relative z-10 max-w-[480px]">
          <AnimatePresence mode="wait">
            {wsQuery.isLoading ? (
              <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <div className="h-8 w-60 rounded bg-white/5 animate-pulse" />
                <div className="mt-3 h-4 w-80 rounded bg-white/5 animate-pulse" />
              </motion.div>
            ) : (
              <motion.div
                key={`hero-${displayName}`}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                <div
                  className="inline-flex items-center gap-2 mb-6 px-3 py-1.5 rounded-full text-[11px] font-semibold tracking-wide"
                  style={{
                    background: `${primary}18`,
                    border: `1px solid ${primary}40`,
                    color: "#ffffff",
                  }}
                >
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  Workspace · {workspace?.country || "—"}
                </div>

                <h1 className="text-4xl xl:text-5xl font-extrabold leading-[1.05] tracking-[-0.02em]">
                  <span className="text-white">Welcome to</span>
                  <br />
                  <span
                    className="bg-clip-text text-transparent"
                    style={{
                      backgroundImage: `linear-gradient(135deg, ${primary}, ${accent})`,
                    }}
                  >
                    {displayName}
                  </span>
                </h1>
                {tagline && (
                  <p className="mt-5 text-[15px] leading-relaxed text-zinc-400 max-w-md">{tagline}</p>
                )}

                <div className="mt-10 grid grid-cols-2 gap-2.5 max-w-md">
                  {[
                    { icon: ShieldCheck, label: "Secure sign-in" },
                    { icon: Sparkles, label: "Realtime POS" },
                    { icon: Users, label: "Your team's portal" },
                    { icon: Lock, label: "Activity audited" },
                  ].map((f) => (
                    <div
                      key={f.label}
                      className="flex items-center gap-3 px-4 py-3 rounded-xl"
                      style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}
                    >
                      <f.icon className="h-4 w-4" style={{ color: primary }} />
                      <span className="text-[13px] font-medium text-zinc-300">{f.label}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <PoweredBy hide={!!branding.hide_powered_by} />
      </aside>

      {/* RIGHT — sign-in form */}
      <main
        className="flex-1 relative flex flex-col justify-center px-6 sm:px-10 lg:px-12 xl:px-16 py-12 overflow-auto"
        style={{ background: "rgba(8,8,14,0.72)", backdropFilter: "blur(24px)" }}
      >
        <div className="w-full max-w-[380px] mx-auto relative z-10">
          {/* Mobile brand mark */}
          <div className="lg:hidden mb-10 flex flex-col items-center">
            <BrandMark primary={primary} accent={accent} logoUrl={branding.logo_url} initial={initial} compact />
            <div className="mt-4 text-center">
              <div className="text-xl font-bold">{displayName}</div>
              {tagline && <div className="mt-1 text-xs text-zinc-400 max-w-[22rem]">{tagline}</div>}
            </div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
          >
            <h2 className="text-[26px] font-extrabold tracking-tight">Sign in</h2>
            <p className="mt-1 text-sm text-zinc-500">
              Continue with Google — use the account that matches your profile for{" "}
              <span className="text-zinc-300 font-medium">{displayName}</span>
            </p>
          </motion.div>

          <div className="mt-8">
            <GoogleButton intent="login" next="/dashboard" />
          </div>

          <div
            className="mt-8 pt-6 text-center text-[11px] text-zinc-600"
            style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
          >
            <div className="flex items-center justify-center gap-2 mb-3">
              <Lock size={11} />
              <span>Authorised personnel only · Sessions are audited</span>
            </div>
            <button
              type="button"
              onClick={() => navigate("/login")}
              className="text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              Not this workspace? Use the standard sign-in →
            </button>
          </div>

          {/* Powered-by footer on mobile */}
          <div className="lg:hidden mt-6">
            <PoweredBy hide={!!branding.hide_powered_by} />
          </div>
        </div>
      </main>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------
const BrandMark: React.FC<{
  primary: string;
  accent: string;
  logoUrl?: string;
  initial: string;
  compact?: boolean;
}> = ({ primary, accent, logoUrl, initial, compact }) => {
  const size = compact ? "h-16 w-16" : "h-14 w-14";
  const [broken, setBroken] = React.useState(false);
  return (
    <motion.div
      initial={{ opacity: 0, y: -8, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.4 }}
      className={cn("relative z-10 flex items-center gap-3", compact && "flex-col gap-0")}
    >
      <div className="relative">
        <div
          className={cn("absolute inset-0 rounded-2xl blur-xl opacity-70")}
          style={{ background: `linear-gradient(135deg, ${primary}, ${accent})` }}
        />
        <div
          className={cn(
            "relative rounded-2xl overflow-hidden grid place-items-center shadow-2xl",
            size,
          )}
          style={{
            background: `linear-gradient(135deg, ${primary}, ${accent})`,
            boxShadow: `0 18px 50px -12px ${primary}77`,
          }}
        >
          {logoUrl && !broken ? (
            <img
              src={logoUrl}
              alt=""
              className="h-full w-full object-contain p-2"
              onError={() => setBroken(true)}
            />
          ) : (
            <span className="text-2xl font-black text-white drop-shadow">{initial}</span>
          )}
        </div>
      </div>
    </motion.div>
  );
};

const PoweredBy: React.FC<{ hide: boolean }> = ({ hide }) => {
  if (hide) return <div className="relative z-10 text-[10px] text-zinc-700">&nbsp;</div>;
  return <CuephoriaTechAttribution variant="powered-by" className="relative z-10" />;
};

export default BrandedLogin;
