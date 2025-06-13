
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';

export interface Notification {
  id: string;
  user_id?: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  is_read: boolean;
  expires_at?: string;
  created_at: string;
  metadata?: Record<string, any>;
}

// Type guard to ensure notification type is valid
const isValidNotificationType = (type: string): type is 'info' | 'success' | 'warning' | 'error' => {
  return ['info', 'success', 'warning', 'error'].includes(type);
};

export const useNotifications = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const { toast } = useToast();

  const loadNotifications = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .is('user_id', null)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('Error loading notifications:', error);
        return;
      }

      if (data) {
        const transformedNotifications: Notification[] = data.map(item => ({
          id: item.id,
          user_id: item.user_id,
          title: item.title,
          message: item.message,
          type: isValidNotificationType(item.type) ? item.type : 'info',
          is_read: item.is_read,
          expires_at: item.expires_at,
          created_at: item.created_at,
          metadata: item.metadata as Record<string, any>
        }));
        
        setNotifications(transformedNotifications);
        setUnreadCount(transformedNotifications.filter(n => !n.is_read).length);
      }
    } catch (error) {
      console.error('Error in loadNotifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId);

      if (error) {
        console.error('Error marking notification as read:', error);
        return false;
      }

      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
      return true;
    } catch (error) {
      console.error('Error in markAsRead:', error);
      return false;
    }
  };

  const markAllAsRead = async () => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .is('user_id', null)
        .eq('is_read', false);

      if (error) {
        console.error('Error marking all notifications as read:', error);
        return false;
      }

      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
      return true;
    } catch (error) {
      console.error('Error in markAllAsRead:', error);
      return false;
    }
  };

  const createNotification = async (notification: Omit<Notification, 'id' | 'created_at' | 'is_read'>) => {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .insert([{
          ...notification,
          user_id: null, // Set to null for global notifications
          is_read: false
        }])
        .select()
        .maybeSingle();

      if (error) {
        console.error('Error creating notification:', error);
        return false;
      }

      if (data) {
        const transformedNotification: Notification = {
          id: data.id,
          user_id: data.user_id,
          title: data.title,
          message: data.message,
          type: isValidNotificationType(data.type) ? data.type : 'info',
          is_read: data.is_read,
          expires_at: data.expires_at,
          created_at: data.created_at,
          metadata: data.metadata as Record<string, any>
        };
        
        setNotifications(prev => [transformedNotification, ...prev]);
        setUnreadCount(prev => prev + 1);
        
        // Show toast for immediate feedback
        toast({
          title: notification.title,
          description: notification.message,
          variant: notification.type === 'error' ? 'destructive' : 'default'
        });
        
        return true;
      }
    } catch (error) {
      console.error('Error in createNotification:', error);
    }
    
    return false;
  };

  useEffect(() => {
    loadNotifications();

    // Set up real-time subscription for global notifications
    const channel = supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: 'user_id=is.null'
        },
        (payload) => {
          const data = payload.new;
          const newNotification: Notification = {
            id: data.id,
            user_id: data.user_id,
            title: data.title,
            message: data.message,
            type: isValidNotificationType(data.type) ? data.type : 'info',
            is_read: data.is_read,
            expires_at: data.expires_at,
            created_at: data.created_at,
            metadata: data.metadata as Record<string, any>
          };
          
          setNotifications(prev => [newNotification, ...prev]);
          setUnreadCount(prev => prev + 1);
          
          // Show toast for new notifications
          toast({
            title: newNotification.title,
            description: newNotification.message,
            variant: newNotification.type === 'error' ? 'destructive' : 'default'
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [toast]);

  return {
    notifications,
    loading,
    unreadCount,
    loadNotifications,
    markAsRead,
    markAllAsRead,
    createNotification
  };
};
