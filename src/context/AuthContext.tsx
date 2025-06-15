import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { supabase } from "@/integrations/supabase/client";
import type { Database } from '@/integrations/supabase/types';
import { toast } from 'sonner';

interface AdminUser {
  id: string;
  username: string;
  isAdmin: boolean;
}

interface AuthContextType {
  user: AdminUser | null;
  login: (username: string, password: string, isAdminLogin: boolean) => Promise<boolean>;
  logout: () => void;
  isLoading: boolean;
  addStaffMember: (username: string, password: string) => Promise<boolean>;
  getStaffMembers: () => Promise<AdminUser[]>;
  updateStaffMember: (id: string, data: Partial<AdminUser>) => Promise<boolean>;
  deleteStaffMember: (id: string) => Promise<boolean>;
  resetPassword: (username: string, newPassword: string) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Track the inactivity timer
  const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null);
  const INACTIVITY_LIMIT_MS = 5 * 60 * 60 * 1000; // 5 hours

  // Helper to clear inactivity timer
  const clearInactivityTimer = () => {
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
      inactivityTimerRef.current = null;
    }
  };

  // Helper to set inactivity timer
  const startInactivityTimer = () => {
    clearInactivityTimer();
    inactivityTimerRef.current = setTimeout(() => {
      // Auto logout after inactivity
      setUser(null);
      localStorage.removeItem('cuephoriaAdmin');
      toast.warning('You have been logged out due to inactivity. Please login again.');
    }, INACTIVITY_LIMIT_MS);
  };

  // Listen for user interactions to reset inactivity timer (only if logged in)
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  useEffect(() => {
    const checkExistingUser = async () => {
      try {
        const storedAdmin = localStorage.getItem('cuephoriaAdmin');
        if (storedAdmin) {
          setUser(JSON.parse(storedAdmin));
          setIsLoading(false);
          return;
        }

        const { data, error } = await supabase
          .from('admin_users')
          .select('id, username, is_admin')
          .single();
        
        if (error) {
          console.error('Error fetching admin user:', error);
          setIsLoading(false);
          return;
        }

        if (data) {
          const adminUser = {
            id: data.id,
            username: data.username,
            isAdmin: data.is_admin
          };
          setUser(adminUser);
          localStorage.setItem('cuephoriaAdmin', JSON.stringify(adminUser));
        }
      } catch (error) {
        console.error('Error checking existing user:', error);
      } finally {
        setIsLoading(false);
      }
    };

    checkExistingUser();
  }, []);

  const login = async (username: string, password: string, isAdminLogin: boolean): Promise<boolean> => {
    try {
      const query = supabase
        .from('admin_users')
        .select('id, username, is_admin, password');
      
      if (isAdminLogin) {
        query.eq('is_admin', true);
      } else {
        query.eq('is_admin', false);
      }
      
      query.eq('username', username);
      
      const { data, error } = await query.single();

      if (error || !data) {
        console.error('Login error:', error);
        return false;
      }

      if (data.password === password) {
        const adminUser = {
          id: data.id,
          username: data.username,
          isAdmin: data.is_admin
        };
        setUser(adminUser);
        localStorage.setItem('cuephoriaAdmin', JSON.stringify(adminUser));
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Login error:', error);
      return false;
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('cuephoriaAdmin');
  };

  const addStaffMember = async (username: string, password: string): Promise<boolean> => {
    try {
      if (!user?.isAdmin) {
        console.error("Only admins can add staff members");
        toast.error("Only admins can add staff members");
        return false;
      }

      const { data: existingUser, error: checkError } = await supabase
        .from('admin_users')
        .select('id')
        .eq('username', username)
        .single();
      
      if (existingUser) {
        console.error('Username already exists');
        toast.error('Username already exists');
        return false;
      }
      
      const basicUserData = {
        username,
        password,
        is_admin: false
      };
      
      const { error } = await supabase
        .from('admin_users')
        .insert(basicUserData);
      
      if (error) {
        console.error('Error creating staff member:', error);
        toast.error('Error creating staff member');
        return false;
      }
      
      toast.success('Staff member added successfully');
      return true;
    } catch (error) {
      console.error('Error adding staff member:', error);
      toast.error('Error adding staff member');
      return false;
    }
  };

  const getStaffMembers = async (): Promise<AdminUser[]> => {
    try {
      if (!user?.isAdmin) {
        console.error("Only admins can view staff members");
        toast.error("Only admins can view staff members");
        return [];
      }
      
      const { data, error } = await supabase
        .from('admin_users')
        .select('id, username, is_admin')
        .eq('is_admin', false);
      
      if (error) {
        console.error('Error fetching staff members:', error);
        toast.error('Error fetching staff members');
        return [];
      }
        
      if (!data || !Array.isArray(data)) {
        return [];
      }
      
      const staffMembers: AdminUser[] = data.map(staff => ({
        id: staff.id || '',
        username: staff.username || '',
        isAdmin: staff.is_admin === true,
      }));
      
      return staffMembers;
    } catch (error) {
      console.error('Error fetching staff members:', error);
      toast.error('Error fetching staff members');
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

      const dbData: Record<string, any> = {};
      
      if (updatedData.username) dbData.username = updatedData.username;

      if (Object.keys(dbData).length > 0) {
        const { error } = await supabase
          .from('admin_users')
          .update(dbData)
          .eq('id', id);
        
        if (error) {
          console.error('Error updating staff member:', error);
          toast.error('Error updating staff member');
          return false;
        }
      } else {
        console.warn("No valid fields to update");
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
      
      const { error } = await supabase
        .from('admin_users')
        .delete()
        .eq('id', id);
      
      if (error) {
        console.error('Error deleting staff member:', error);
        toast.error('Error deleting staff member');
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

  const resetPassword = async (username: string, newPassword: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase
        .from('admin_users')
        .select('id')
        .eq('username', username)
        .single();
        
      if (error || !data) {
        console.error('Error finding user for password reset:', error);
        return false;
      }
      
      const { error: updateError } = await supabase
        .from('admin_users')
        .update({ password: newPassword })
        .eq('id', data.id);
        
      if (updateError) {
        console.error('Error updating password:', updateError);
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Error in resetPassword:', error);
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
      resetPassword
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
