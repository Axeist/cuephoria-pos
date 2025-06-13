
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';

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

export const useUserPreferences = () => {
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const loadPreferences = async () => {
    try {
      setLoading(true);
      
      // For now, we'll use a default user ID since auth isn't implemented
      const defaultUserId = 'default-user';
      
      const { data, error } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', defaultUserId)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading preferences:', error);
        return;
      }

      if (data) {
        setPreferences(data);
      } else {
        // Create default preferences
        const defaultPrefs: Omit<UserPreferences, 'id' | 'created_at' | 'updated_at'> = {
          user_id: defaultUserId,
          theme: 'dark',
          notifications_enabled: true,
          email_notifications: false,
          default_timeout: 60,
          receipt_template: 'standard'
        };

        const { data: newPrefs, error: createError } = await supabase
          .from('user_preferences')
          .insert([defaultPrefs])
          .select()
          .single();

        if (createError) {
          console.error('Error creating default preferences:', createError);
        } else if (newPrefs) {
          setPreferences(newPrefs);
        }
      }
    } catch (error) {
      console.error('Error in loadPreferences:', error);
    } finally {
      setLoading(false);
    }
  };

  const updatePreferences = async (updates: Partial<UserPreferences>) => {
    if (!preferences) return false;

    try {
      const { data, error } = await supabase
        .from('user_preferences')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', preferences.id)
        .select()
        .single();

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
        setPreferences(data);
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
  }, []);

  return {
    preferences,
    loading,
    updatePreferences,
    refreshPreferences: loadPreferences
  };
};
