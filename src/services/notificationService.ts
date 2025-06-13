
import { supabase } from '@/integrations/supabase/client';

export interface NotificationTemplate {
  id: string;
  name: string;
  title_template: string;
  message_template: string;
  type: 'info' | 'success' | 'warning' | 'error';
  is_active: boolean;
}

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
        this.templates = data;
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
          user_id: userId || null,
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
