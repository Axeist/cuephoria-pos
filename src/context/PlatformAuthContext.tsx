/**
 * PlatformAuthContext — session + auth actions for the Cuetronix platform
 * admin console at `/platform/*`.
 *
 * Lives outside the tenant AuthProvider so cookies, session state, and
 * redirects never collide with tenant admin flows.
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

export type PlatformAdmin = {
  id: string;
  email: string;
  displayName: string | null;
};

type PlatformAuthContextValue = {
  admin: PlatformAdmin | null;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<{ ok: true } | { ok: false; error: string }>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
};

const PlatformAuthContext = createContext<PlatformAuthContextValue | undefined>(undefined);

export const PlatformAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [admin, setAdmin] = useState<PlatformAdmin | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/platform/me", { credentials: "same-origin" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setAdmin(null);
        setError(json?.error || null);
        return;
      }
      setAdmin(json?.admin ?? null);
    } catch (e) {
      setAdmin(null);
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setIsLoading(false);
    }
  }, []);

  const login = useCallback<PlatformAuthContextValue["login"]>(async (email, password) => {
    try {
      const res = await fetch("/api/platform/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ email, password }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.ok) {
        return { ok: false, error: json?.error || "Login failed." };
      }
      setAdmin(json.admin);
      setError(null);
      return { ok: true };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return { ok: false, error: msg };
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await fetch("/api/platform/logout", {
        method: "POST",
        credentials: "same-origin",
      });
    } finally {
      setAdmin(null);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const value = useMemo<PlatformAuthContextValue>(
    () => ({ admin, isLoading, error, login, logout, refresh }),
    [admin, isLoading, error, login, logout, refresh],
  );

  return <PlatformAuthContext.Provider value={value}>{children}</PlatformAuthContext.Provider>;
};

export function usePlatformAuth(): PlatformAuthContextValue {
  const ctx = useContext(PlatformAuthContext);
  if (!ctx) throw new Error("usePlatformAuth must be used within PlatformAuthProvider");
  return ctx;
}
