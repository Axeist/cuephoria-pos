
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/context/AuthContext';

export interface UserPreferences {
  id?: string;
  user_id: string;
  theme: 'light' | 'dark';
  notifications_enabled: boolean;
  email_notifications: boolean;
  default_timeout: number;
  receipt_template: 'standard' | 'detailed' | 'minimal';
  created_at?: string;
  updated_at?: string;
}

// Type guards for validation
const isValidTheme = (theme: string): theme is 'light' | 'dark' => {
  return ['light', 'dark'].includes(theme);
};

const isValidReceiptTemplate = (template: string): template is 'standard' | 'detailed' | 'minimal' => {
  return ['standard', 'detailed', 'minimal'].includes(template);
};

export const useUserPreferences = () => {
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { user } = useAuth();

  const loadPreferences = async () => {
    try {
      setLoading(true);
      
      if (!user?.id) {
        console.log('No user logged in, skipping preferences load');
        setLoading(false);
        return;
      }
      
      const { data, error } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Error loading preferences:', error);
        return;
      }

      if (data) {
        const transformedPreferences: UserPreferences = {
          id: data.id,
          user_id: data.user_id,
          theme: isValidTheme(data.theme) ? data.theme : 'dark',
          notifications_enabled: data.notifications_enabled,
          email_notifications: data.email_notifications,
          default_timeout: data.default_timeout,
          receipt_template: isValidReceiptTemplate(data.receipt_template) ? data.receipt_template : 'standard',
          created_at: data.created_at,
          updated_at: data.updated_at
        };
        
        setPreferences(transformedPreferences);
      } else {
        // Create default preferences for the current user
        const defaultPrefs = {
          user_id: user.id,
          theme: 'dark' as const,
          notifications_enabled: true,
          email_notifications: false,
          default_timeout: 60,
          receipt_template: 'standard' as const
        };

        const { data: newPrefs, error: createError } = await supabase
          .from('user_preferences')
          .insert([defaultPrefs])
          .select()
          .maybeSingle();

        if (createError) {
          console.error('Error creating default preferences:', createError);
        } else if (newPrefs) {
          const transformedNewPrefs: UserPreferences = {
            id: newPrefs.id,
            user_id: newPrefs.user_id,
            theme: isValidTheme(newPrefs.theme) ? newPrefs.theme : 'dark',
            notifications_enabled: newPrefs.notifications_enabled,
            email_notifications: newPrefs.email_notifications,
            default_timeout: newPrefs.default_timeout,
            receipt_template: isValidReceiptTemplate(newPrefs.receipt_template) ? newPrefs.receipt_template : 'standard',
            created_at: newPrefs.created_at,
            updated_at: newPrefs.updated_at
          };
          
          setPreferences(transformedNewPrefs);
        }
      }
    } catch (error) {
      console.error('Error in loadPreferences:', error);
    } finally {
      setLoading(false);
    }
  };

  const updatePreferences = async (updates: Partial<UserPreferences>) => {
    if (!preferences || !user?.id) return false;

    try {
      const { data, error } = await supabase
        .from('user_preferences')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', preferences.id)
        .select()
        .maybeSingle();

      if (error) {
        console.error('Error updating preferences:', error);
        toast({
          title: "Error",
          description: "Failed to save preferences. Please try again.",
          variant: "destructive"
        });
        return false;
      }

      if (data) {
        const transformedData: UserPreferences = {
          id: data.id,
          user_id: data.user_id,
          theme: isValidTheme(data.theme) ? data.theme : 'dark',
          notifications_enabled: data.notifications_enabled,
          email_notifications: data.email_notifications,
          default_timeout: data.default_timeout,
          receipt_template: isValidReceiptTemplate(data.receipt_template) ? data.receipt_template : 'standard',
          created_at: data.created_at,
          updated_at: data.updated_at
        };
        
        setPreferences(transformedData);
        toast({
          title: "Settings saved",
          description: "Your preferences have been updated successfully."
        });
        return true;
      }
    } catch (error) {
      console.error('Error in updatePreferences:', error);
      toast({
        title: "Error",
        description: "Failed to save preferences. Please try again.",
        variant: "destructive"
      });
    }
    
    return false;
  };

  useEffect(() => {
    loadPreferences();
  }, [user?.id]);

  return {
    preferences,
    loading,
    updatePreferences,
    refreshPreferences: loadPreferences
  };
};
