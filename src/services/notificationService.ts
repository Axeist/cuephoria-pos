
import { supabase } from '@/integrations/supabase/client';

export interface NotificationTemplate {
  id: string;
  name: string;
  title_template: string;
  message_template: string;
  type: 'info' | 'success' | 'warning' | 'error';
  is_active: boolean;
}

// Type guard to ensure notification type is valid
const isValidNotificationType = (type: string): type is 'info' | 'success' | 'warning' | 'error' => {
  return ['info', 'success', 'warning', 'error'].includes(type);
};

export class NotificationService {
  private static instance: NotificationService;
  private templates: NotificationTemplate[] = [];

  private constructor() {
    this.loadTemplates();
  }

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  private async loadTemplates() {
    try {
      const { data, error } = await supabase
        .from('notification_templates')
        .select('*')
        .eq('is_active', true);

      if (error) {
        console.error('Error loading notification templates:', error);
        return;
      }

      if (data) {
        this.templates = data.map(item => ({
          id: item.id,
          name: item.name,
          title_template: item.title_template,
          message_template: item.message_template,
          type: isValidNotificationType(item.type) ? item.type : 'info',
          is_active: item.is_active
        }));
      }
    } catch (error) {
      console.error('Error in loadTemplates:', error);
    }
  }

  private interpolateTemplate(template: string, variables: Record<string, any>): string {
    return template.replace(/\{(\w+)\}/g, (match, key) => {
      return variables[key]?.toString() || match;
    });
  }

  async sendNotification(templateName: string, variables: Record<string, any>, userId?: string) {
    const template = this.templates.find(t => t.name === templateName);
    if (!template) {
      console.error(`Notification template '${templateName}' not found`);
      return false;
    }

    const title = this.interpolateTemplate(template.title_template, variables);
    const message = this.interpolateTemplate(template.message_template, variables);

    try {
      const { error } = await supabase
        .from('notifications')
        .insert([{
          user_id: null, // Use null for global notifications
          title,
          message,
          type: template.type,
          metadata: variables
        }]);

      if (error) {
        console.error('Error sending notification:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in sendNotification:', error);
      return false;
    }
  }

  // Utility methods for common notifications
  async notifyLowStock(productName: string, stockCount: number) {
    return this.sendNotification('low_stock', {
      product_name: productName,
      stock_count: stockCount
    });
  }

  async notifySessionTimeout(stationName: string, minutes: number) {
    return this.sendNotification('session_timeout', {
      station_name: stationName,
      minutes: minutes
    });
  }

  async notifyNewCustomer(customerName: string) {
    return this.sendNotification('new_customer', {
      customer_name: customerName
    });
  }

  async notifyProductSoldOut(productName: string) {
    return this.sendNotification('product_sold_out', {
      product_name: productName
    });
  }

  async notifyDailyReport(date: string) {
    return this.sendNotification('daily_report', {
      date: date
    });
  }
}

export const notificationService = NotificationService.getInstance();
