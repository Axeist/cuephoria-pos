/**
 * PlatformProtectedRoute — guards `/platform/*` routes.
 *
 * Shows a minimal brand-accurate loading state while the session is
 * being resolved, redirects to `/platform/login` when unauthenticated,
 * and renders the shell when authorized.
 */

import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { usePlatformAuth } from "@/context/PlatformAuthContext";
import { PlatformShell } from "./PlatformShell";

export const PlatformProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { admin, isLoading } = usePlatformAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0A0A14]">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 rounded-full border-2 border-indigo-500/30 border-t-indigo-400 animate-spin" />
          <p className="text-sm tracking-wide text-zinc-400">Verifying operator session…</p>
        </div>
      </div>
    );
  }

  if (!admin) {
    return <Navigate to="/platform/login" state={{ from: location.pathname }} replace />;
  }

  return <PlatformShell>{children}</PlatformShell>;
};
