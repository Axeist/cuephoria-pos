import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { supabase } from "@/integrations/supabase/client";
import type { Database } from '@/integrations/supabase/types';
import { toast } from 'sonner';

interface AdminUser {
  id: string;
  username: string;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  mustChangePassword?: boolean;
  /** Friendly name (not necessarily the login username). */
  displayName?: string | null;
  designation?: string | null;
  loginEmail?: string | null;
}

interface LoginMetadata {
  ip?: string;
  city?: string;
  region?: string;
  country?: string;
  timezone?: string;
  isp?: string;
  browser?: string;
  browserVersion?: string;
  os?: string;
  osVersion?: string;
  deviceType?: string;
  deviceModel?: string;
  deviceVendor?: string;
  loginTime?: string;
  userAgent?: string;
  latitude?: number;
  longitude?: number;
  locationAccuracy?: number;
  selfieUrl?: string | null;
  screenResolution?: string;
  colorDepth?: number;
  pixelRatio?: number;
  cpuCores?: number;
  deviceMemory?: number;
  touchSupport?: boolean;
  connectionType?: string;
  batteryLevel?: number;
  canvasFingerprint?: string;
  installedFonts?: string;
}

export interface LoginLog {
  id: string;
  username: string;
  is_admin: boolean;
  login_success: boolean;
  ip_address?: string;
  city?: string;
  region?: string;
  country?: string;
  timezone?: string;
  isp?: string;
  browser?: string;
  browser_version?: string;
  os?: string;
  os_version?: string;
  device_type?: string;
  device_model?: string;
  device_vendor?: string;
  user_agent?: string;
  latitude?: number;
  longitude?: number;
  location_accuracy?: number;
  selfie_url?: string;
  screen_resolution?: string;
  color_depth?: number;
  pixel_ratio?: number;
  cpu_cores?: number;
  device_memory?: number;
  touch_support?: boolean;
  connection_type?: string;
  battery_level?: number;
  canvas_fingerprint?: string;
  installed_fonts?: string;
  login_time: string;
  created_at: string;
}

export type LoginResult =
  | { ok: true; error?: undefined; requireTotp?: undefined; emailVerificationRequired?: undefined }
  | { ok: false; requireTotp: true; error?: string; emailVerificationRequired?: undefined }
  | {
      ok: false;
      emailVerificationRequired: true;
      emailSent?: boolean;
      emailSkipped?: boolean;
      error?: string;
      requireTotp?: undefined;
    }
  | { ok: false; error?: string; requireTotp?: undefined; emailVerificationRequired?: undefined };

interface AuthContextType {
  user: AdminUser | null;
  login: (
    email: string,
    password: string,
    isAdminLogin: boolean,
    metadata?: LoginMetadata,
    second?: { totpCode?: string; backupCode?: string },
  ) => Promise<LoginResult>;
  logout: () => void;
  isLoading: boolean;
  changePassword: (currentPassword: string, newPassword: string) => Promise<{ ok: true } | { ok: false; error: string }>;
  addStaffMember: (
    username: string,
    password: string,
    isAdmin?: boolean,
    isSuperAdmin?: boolean,
    locationIds?: string[],
    profile?: { displayName?: string; designation?: string },
  ) => Promise<boolean>;
  getStaffMembers: () => Promise<(AdminUser & { locations: { id: string; name: string; slug: string; short_code: string }[]; email?: string | null; emailVerifiedAt?: string | null })[]>;
  updateStaffMember: (
    id: string,
    data: Partial<
      AdminUser & { locationIds: string[]; newPassword?: string; displayName?: string | null; designation?: string | null }
    >,
  ) => Promise<boolean>;
  verifyStaffEmailManually: (id: string) => Promise<boolean>;
  resendStaffVerificationEmail: (id: string) => Promise<boolean>;
  deleteStaffMember: (id: string) => Promise<boolean>;
  getLoginLogs: () => Promise<LoginLog[]>;
  deleteLoginLog: (logId: string) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null);
  const INACTIVITY_LIMIT_MS = 5 * 60 * 60 * 1000;

  const clearInactivityTimer = () => {
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
      inactivityTimerRef.current = null;
    }
  };

  const startInactivityTimer = () => {
    clearInactivityTimer();
    inactivityTimerRef.current = setTimeout(() => {
      fetch('/api/admin/logout', { method: 'POST' }).catch(() => {});
      setUser(null);
      toast.warning('You have been logged out due to inactivity. Please login again.');
    }, INACTIVITY_LIMIT_MS);
  };

  useEffect(() => {
    if (user) {
      const events = [
        'mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'resize',
        'focus'
      ];
      const resetTimer = () => startInactivityTimer();

      events.forEach(event =>
        window.addEventListener(event, resetTimer, true)
      );
      startInactivityTimer();

      return () => {
        events.forEach(event =>
          window.removeEventListener(event, resetTimer, true)
        );
        clearInactivityTimer();
      };
    } else {
      clearInactivityTimer();
    }
  }, [user]);

  useEffect(() => {
    const checkExistingUser = async () => {
      try {
        // Do NOT trust localStorage for auth. We validate the session server-side.
        const res = await fetch('/api/admin/me', { method: 'GET', credentials: 'same-origin' });
        const json = await res.json();
        const u = json?.user;
        if (u?.id && u?.username) {
          setUser({
            id: u.id,
            username: u.username,
            isAdmin: !!u.isAdmin,
            isSuperAdmin: !!u.isSuperAdmin,
            mustChangePassword: !!u.mustChangePassword,
            displayName: u.displayName ?? null,
            designation: u.designation ?? null,
            loginEmail: u.email ?? null,
          });
        } else {
          setUser(null);
        }
      } catch (error) {
        console.error('Error checking existing user:', error);
      } finally {
        setIsLoading(false);
      }
    };

    checkExistingUser();
  }, []);

  const login = async (
    email: string,
    password: string,
    isAdminLogin: boolean,
    metadata: LoginMetadata = {},
    second: { totpCode?: string; backupCode?: string } = {},
  ): Promise<LoginResult> => {
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          password,
          isAdminLogin,
          metadata,
          ...(second.totpCode ? { totpCode: second.totpCode } : {}),
          ...(second.backupCode ? { backupCode: second.backupCode } : {}),
        }),
      });
      const json = await res.json();

      if (json?.requireTotp) {
        return { ok: false, requireTotp: true, error: json?.error };
      }

      if (json?.emailVerificationRequired) {
        return {
          ok: false,
          emailVerificationRequired: true,
          emailSent: !!json.emailSent,
          emailSkipped: !!json.emailSkipped,
          error: typeof json.error === 'string' ? json.error : undefined,
        };
      }

      const loginSuccess = !!json?.success;
      if (loginSuccess && json?.user?.id) {
        const adminUser = {
          id: json.user.id,
          username: json.user.username,
          isAdmin: !!json.user.isAdmin,
          isSuperAdmin: !!json.user.isSuperAdmin,
          mustChangePassword: !!json.user.mustChangePassword,
          displayName: json.user.displayName ?? null,
          designation: json.user.designation ?? null,
          loginEmail: json.user.email ?? null,
        };
        try {
          sessionStorage.setItem("gh_show_login_splash_v1", "1");
        } catch {
          // ignore (private mode / denied storage)
        }
        setUser(adminUser);
        return { ok: true };
      }

      return { ok: false, error: json?.error };
    } catch (error) {
      console.error('Login error:', error);
      return { ok: false, error: error instanceof Error ? error.message : 'Login failed' };
    }
  };

  const logout = () => {
    fetch('/api/admin/logout', { method: 'POST' }).catch(() => {});
    setUser(null);
  };

  const changePassword = async (
    currentPassword: string,
    newPassword: string,
  ): Promise<{ ok: true } | { ok: false; error: string }> => {
    try {
      const res = await fetch('/api/admin/change-password', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const json = await res.json();
      if (!res.ok || !json?.ok) {
        return { ok: false, error: json?.error || `Request failed (${res.status})` };
      }
      setUser((prev) => (prev ? { ...prev, mustChangePassword: false } : prev));
      return { ok: true };
    } catch (error) {
      return { ok: false, error: (error as Error)?.message || 'Network error' };
    }
  };

  const getLoginLogs = async (): Promise<LoginLog[]> => {
    try {
      const res = await fetch('/api/admin/login-logs', { method: 'GET' });
      const json = await res.json();
      if (!json?.ok) {
        toast.error('Error fetching login logs');
        return [];
      }
      return json.logs || [];
    } catch (error) {
      console.error('Error fetching login logs:', error);
      toast.error('Error fetching login logs');
      return [];
    }
  };

  const deleteLoginLog = async (logId: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/admin/login-logs?id=${encodeURIComponent(logId)}`, {
        method: 'DELETE',
      });
      const json = await res.json();
      if (!json?.ok) {
        toast.error('Error deleting login log');
        return false;
      }
      return true;
    } catch (error) {
      console.error('Error deleting login log:', error);
      toast.error('Error deleting login log');
      return false;
    }
  };

  const addStaffMember = async (
    username: string,
    password: string,
    isAdmin: boolean = false,
    isSuperAdmin: boolean = false,
    locationIds: string[] = [],
    profile?: { displayName?: string; designation?: string },
  ): Promise<boolean> => {
    try {
      if (!user?.isAdmin) {
        toast.error("Only admins can add users");
        return false;
      }

      const res = await fetch('/api/admin/users', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          username,
          email: username.trim(),
          password,
          isAdmin,
          isSuperAdmin,
          locationIds,
          displayName: profile?.displayName?.trim() || undefined,
          designation: profile?.designation?.trim() || undefined,
        }),
      });
      const json = await res.json();
      if (!json?.ok) {
        toast.error(json?.error || 'Error creating user');
        return false;
      }

      if (json.verificationEmailSent === true) {
        toast.success(
          `${isSuperAdmin ? 'Super Admin' : isAdmin ? 'Admin' : 'Staff'} added. A verification email was sent — they should open the link, then they can use Google sign-in with that email.`,
        );
      } else if (json.verificationEmailSkipped === true) {
        toast.success(
          `${isSuperAdmin ? 'Super Admin' : isAdmin ? 'Admin' : 'Staff'} user added (outgoing mail is not configured — verify email manually or fix Resend).`,
        );
      } else if (json.verificationEmailError) {
        toast.success(
          `${isSuperAdmin ? 'Super Admin' : isAdmin ? 'Admin' : 'Staff'} user added, but the verification email could not be sent: ${json.verificationEmailError}`,
        );
      } else {
        toast.success(`${isSuperAdmin ? 'Super Admin' : isAdmin ? 'Admin' : 'Staff'} user added successfully`);
      }
      return true;
    } catch (error) {
      toast.error('Error adding user');
      return false;
    }
  };

  const getStaffMembers = async () => {
    try {
      if (!user?.isAdmin) {
        toast.error("Only admins can view users");
        return [];
      }
      
      const res = await fetch('/api/admin/users', { method: 'GET', credentials: 'same-origin' });
      const json = await res.json();
      if (!json?.ok) {
        toast.error(json?.error || 'Error fetching users');
        return [];
      }

      const data = Array.isArray(json.users) ? json.users : [];
      return data.map((u: any) => ({
        id: u.id || '',
        username: u.username || '',
        email: u.email ?? null,
        emailVerifiedAt: u.emailVerifiedAt ?? null,
        displayName: u.displayName ?? null,
        designation: u.designation ?? null,
        isAdmin: u.isAdmin === true,
        isSuperAdmin: u.isSuperAdmin === true,
        locations: Array.isArray(u.locations) ? u.locations : [],
      }));
    } catch (error) {
      toast.error('Error fetching users');
      return [];
    }
  };

  const updateStaffMember = async (
    id: string,
    updatedData: Partial<
      AdminUser & { locationIds: string[]; newPassword?: string; displayName?: string | null; designation?: string | null }
    >,
  ): Promise<boolean> => {
    try {
      if (!user?.isAdmin) {
        toast.error("Only admins can update staff members");
        return false;
      }

      const body: Record<string, any> = { id };
      if (updatedData.username) body.username = updatedData.username;
      if (typeof updatedData.displayName === "string") body.displayName = updatedData.displayName;
      if (typeof updatedData.designation === "string") body.designation = updatedData.designation;
      if (typeof updatedData.isSuperAdmin === 'boolean') body.isSuperAdmin = updatedData.isSuperAdmin;
      if (Array.isArray(updatedData.locationIds)) body.locationIds = updatedData.locationIds;
      if (typeof updatedData.newPassword === 'string' && updatedData.newPassword.trim()) {
        body.newPassword = updatedData.newPassword.trim();
      }

      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        credentials: 'same-origin',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!json?.ok) {
        toast.error(json?.error || 'Error updating staff member');
        return false;
      }

      if (id === user?.id) {
        try {
          const mr = await fetch('/api/admin/me', { method: 'GET', credentials: 'same-origin' });
          const mj = await mr.json();
          const u = mj?.user;
          if (u?.id && u?.username) {
            setUser({
              id: u.id,
              username: u.username,
              isAdmin: !!u.isAdmin,
              isSuperAdmin: !!u.isSuperAdmin,
              mustChangePassword: !!u.mustChangePassword,
              displayName: u.displayName ?? null,
              designation: u.designation ?? null,
              loginEmail: u.email ?? null,
            });
          }
        } catch {
          /* non-fatal */
        }
      }

      if (json.verificationEmailSent) {
        toast.success('Saved. A verification email was sent to the new address.');
      } else if (json.verificationEmailSkipped) {
        toast.success('Saved. Outgoing mail is not configured — send verification manually if the email changed.');
      } else if (json.verificationEmailError) {
        toast.success(`Saved, but verification email failed: ${json.verificationEmailError}`);
      } else {
        toast.success('Staff member updated successfully');
      }
      return true;
    } catch (error) {
      toast.error('Error updating staff member');
      return false;
    }
  };

  const verifyStaffEmailManually = async (id: string): Promise<boolean> => {
    try {
      if (!user?.isAdmin) {
        toast.error('Only admins can verify staff email');
        return false;
      }
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        credentials: 'same-origin',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ id, verifyEmailManually: true }),
      });
      const json = await res.json();
      if (!json?.ok) {
        toast.error(json?.error || 'Could not verify email');
        return false;
      }
      if (json.alreadyVerified) {
        toast.success('That address was already verified.');
      } else {
        toast.success('Email marked as verified. They can use Google sign-in with this address.');
      }
      return true;
    } catch {
      toast.error('Could not verify email');
      return false;
    }
  };

  const resendStaffVerificationEmail = async (id: string): Promise<boolean> => {
    try {
      if (!user?.isAdmin) {
        toast.error('Only admins can resend verification email');
        return false;
      }
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        credentials: 'same-origin',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ id, resendVerificationEmail: true }),
      });
      const json = await res.json();
      if (!json?.ok) {
        toast.error(json?.error || 'Could not resend verification email');
        return false;
      }
      if (json.alreadyVerified) {
        toast.success('That address is already verified.');
        return true;
      }
      if (json.verificationEmailSent) {
        toast.success('Verification link sent. Ask them to check inbox and spam.');
        return true;
      }
      if (json.verificationEmailSkipped) {
        toast.error(
          'Outgoing mail is not configured on the server (set RESEND_API_KEY and RESEND_FROM).',
        );
        return false;
      }
      if (json.verificationEmailError) {
        toast.error(`Verification email failed: ${json.verificationEmailError}`);
        return false;
      }
      toast.error('Verification email was not sent.');
      return false;
    } catch {
      toast.error('Could not resend verification email');
      return false;
    }
  };

  const deleteStaffMember = async (id: string): Promise<boolean> => {
    try {
      if (!user?.isAdmin) {
        toast.error("Only admins can delete staff members");
        return false;
      }
      
      const res = await fetch(`/api/admin/users?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
        credentials: 'same-origin',
      });
      const json = await res.json();
      if (!json?.ok) {
        toast.error(json?.error || 'Error deleting staff member');
        return false;
      }
      
      toast.success('Staff member deleted successfully');
      return true;
    } catch (error) {
      toast.error('Error deleting staff member');
      return false;
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      login, 
      logout, 
      isLoading, 
      changePassword,
      addStaffMember, 
      getStaffMembers,
      updateStaffMember,
      verifyStaffEmailManually,
      resendStaffVerificationEmail,
      deleteStaffMember,
      getLoginLogs,
      deleteLoginLog
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
