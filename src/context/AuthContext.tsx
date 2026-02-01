import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { supabase } from "@/integrations/supabase/client";
import type { Database } from '@/integrations/supabase/types';
import { toast } from 'sonner';

interface AdminUser {
  id: string;
  username: string;
  isAdmin: boolean;
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

interface AuthContextType {
  user: AdminUser | null;
  login: (username: string, password: string, isAdminLogin: boolean, metadata?: LoginMetadata) => Promise<boolean>;
  logout: () => void;
  isLoading: boolean;
  addStaffMember: (username: string, password: string) => Promise<boolean>;
  getStaffMembers: () => Promise<AdminUser[]>;
  updateStaffMember: (id: string, data: Partial<AdminUser>) => Promise<boolean>;
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
        const res = await fetch('/api/admin/me', { method: 'GET' });
        const json = await res.json();
        const u = json?.user;
        if (u?.id && u?.username) {
          setUser({ id: u.id, username: u.username, isAdmin: !!u.isAdmin });
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
    username: string, 
    password: string, 
    isAdminLogin: boolean,
    metadata: LoginMetadata = {}
  ): Promise<boolean> => {
    let loginSuccess = false;
    let attemptedUsername = username;

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          username,
          password,
          isAdminLogin,
          metadata,
        }),
      });
      const json = await res.json();

      loginSuccess = !!json?.success;
      if (loginSuccess && json?.user?.id) {
        const adminUser = {
          id: json.user.id,
          username: json.user.username,
          isAdmin: !!json.user.isAdmin,
        };
        // Trigger login-success splash for management portal
        try {
          sessionStorage.setItem("gh_show_login_splash_v1", "1");
        } catch {
          // ignore (private mode / denied storage)
        }
        setUser(adminUser);
      }

      return loginSuccess;
    } catch (error) {
      console.error('Login error:', error);
      return false;
    }
  };

  const logout = () => {
    fetch('/api/admin/logout', { method: 'POST' }).catch(() => {});
    setUser(null);
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

  const addStaffMember = async (username: string, password: string, isAdmin: boolean = false): Promise<boolean> => {
    try {
      if (!user?.isAdmin) {
        console.error("Only admins can add users");
        toast.error("Only admins can add users");
        return false;
      }

      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ username, password, isAdmin }),
      });
      const json = await res.json();
      if (!json?.ok) {
        toast.error(json?.error || 'Error creating user');
        return false;
      }

      toast.success(`${isAdmin ? 'Admin' : 'Staff'} user added successfully`);
      return true;
    } catch (error) {
      console.error('Error adding user:', error);
      toast.error('Error adding user');
      return false;
    }
  };

  const getStaffMembers = async (): Promise<AdminUser[]> => {
    try {
      if (!user?.isAdmin) {
        console.error("Only admins can view users");
        toast.error("Only admins can view users");
        return [];
      }
      
      const res = await fetch('/api/admin/users', { method: 'GET' });
      const json = await res.json();
      if (!json?.ok) {
        toast.error(json?.error || 'Error fetching users');
        return [];
      }

      const data = Array.isArray(json.users) ? json.users : [];
      return data.map((u: any) => ({
        id: u.id || '',
        username: u.username || '',
        isAdmin: u.is_admin === true,
      }));
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Error fetching users');
      return [];
    }
  };

  const updateStaffMember = async (id: string, updatedData: Partial<AdminUser>): Promise<boolean> => {
    try {
      if (!user?.isAdmin) {
        console.error("Only admins can update staff members");
        toast.error("Only admins can update staff members");
        return false;
      }

      if (!updatedData.username) {
        console.warn("No valid fields to update");
        return true;
      }

      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ id, username: updatedData.username }),
      });
      const json = await res.json();
      if (!json?.ok) {
        toast.error(json?.error || 'Error updating staff member');
        return false;
      }
      
      toast.success('Staff member updated successfully');
      return true;
    } catch (error) {
      console.error('Error updating staff member:', error);
      toast.error('Error updating staff member');
      return false;
    }
  };

  const deleteStaffMember = async (id: string): Promise<boolean> => {
    try {
      if (!user?.isAdmin) {
        console.error("Only admins can delete staff members");
        toast.error("Only admins can delete staff members");
        return false;
      }
      
      const res = await fetch(`/api/admin/users?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
      const json = await res.json();
      if (!json?.ok) {
        toast.error(json?.error || 'Error deleting staff member');
        return false;
      }
      
      toast.success('Staff member deleted successfully');
      return true;
    } catch (error) {
      console.error('Error deleting staff member:', error);
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
      addStaffMember, 
      getStaffMembers,
      updateStaffMember,
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
