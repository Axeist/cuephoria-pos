import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import type { CafeSessionUser, CafeUserRole } from '@/types/cafe.types';
import { toast } from 'sonner';

interface CafeAuthContextType {
  user: CafeSessionUser | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  hasRole: (...roles: CafeUserRole[]) => boolean;
}

const CafeAuthContext = createContext<CafeAuthContextType | undefined>(undefined);

const IDLE_TIMEOUT_MS = 30 * 60 * 1000;

export const CafeAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<CafeSessionUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const resetIdleTimer = useCallback(() => {
    if (idleTimer.current) clearTimeout(idleTimer.current);
    if (user) {
      idleTimer.current = setTimeout(() => {
        setUser(null);
        toast.info('Session expired due to inactivity');
      }, IDLE_TIMEOUT_MS);
    }
  }, [user]);

  useEffect(() => {
    const events = ['mousedown', 'keydown', 'touchstart', 'scroll'];
    events.forEach(e => window.addEventListener(e, resetIdleTimer));
    resetIdleTimer();
    return () => {
      events.forEach(e => window.removeEventListener(e, resetIdleTimer));
      if (idleTimer.current) clearTimeout(idleTimer.current);
    };
  }, [resetIdleTimer]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/cafe/me', { credentials: 'include' });
        const data = await res.json();
        if (!cancelled && data?.ok && data.user) {
          setUser(data.user);
        }
      } catch {
        // Session check failed silently
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const login = useCallback(async (username: string, password: string): Promise<boolean> => {
    try {
      const res = await fetch('/api/cafe/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (data?.ok && data.success && data.user) {
        setUser(data.user);
        return true;
      }
      toast.error(data?.error || 'Invalid credentials');
      return false;
    } catch {
      toast.error('Login failed. Please try again.');
      return false;
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await fetch('/api/cafe/logout', { method: 'POST', credentials: 'include' });
    } catch {
      // Logout silently
    }
    setUser(null);
  }, []);

  const hasRole = useCallback((...roles: CafeUserRole[]) => {
    if (!user) return false;
    return roles.includes(user.role);
  }, [user]);

  return (
    <CafeAuthContext.Provider value={{ user, isLoading, login, logout, hasRole }}>
      {children}
    </CafeAuthContext.Provider>
  );
};

export const useCafeAuth = (): CafeAuthContextType => {
  const ctx = useContext(CafeAuthContext);
  if (!ctx) throw new Error('useCafeAuth must be used within CafeAuthProvider');
  return ctx;
};
