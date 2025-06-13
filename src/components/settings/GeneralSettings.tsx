
import React, { useState, useEffect } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Settings, Bell, Clock, Moon } from 'lucide-react';
import { useUserPreferences } from '@/hooks/useUserPreferences';
import { notificationService } from '@/services/notificationService';

const formSchema = z.object({
  default_timeout: z.string().min(1, {
    message: "Default timeout is required",
  }),
  theme: z.enum(['light', 'dark']),
  notifications_enabled: z.boolean().default(true),
  email_notifications: z.boolean().default(false),
  receipt_template: z.enum(['standard', 'detailed', 'minimal']),
});

type FormData = z.infer<typeof formSchema>;

const GeneralSettings = () => {
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const { preferences, loading, updatePreferences } = useUserPreferences();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      default_timeout: '60',
      theme: 'dark',
      notifications_enabled: true,
      email_notifications: false,
      receipt_template: 'standard',
    },
  });

  // Update form when preferences are loaded
  useEffect(() => {
    if (preferences) {
      form.reset({
        default_timeout: preferences.default_timeout.toString(),
        theme: preferences.theme,
        notifications_enabled: preferences.notifications_enabled,
        email_notifications: preferences.email_notifications,
        receipt_template: preferences.receipt_template,
      });
    }
  }, [preferences, form]);

  const onSubmit = async (data: FormData) => {
    setIsSaving(true);
    
    const previousTheme = preferences?.theme;
    
    const success = await updatePreferences({
      default_timeout: parseInt(data.default_timeout),
      theme: data.theme,
      notifications_enabled: data.notifications_enabled,
      email_notifications: data.email_notifications,
      receipt_template: data.receipt_template,
    });

    if (success) {
      // Send theme change notification if theme was changed
      if (previousTheme && previousTheme !== data.theme) {
        await notificationService.notifyThemeChanged(data.theme);
      }
      
      // Send general settings updated notification
      await notificationService.notifySettingsChanged();
    }
    
    setIsSaving(false);
  };

  if (loading) {
    return (
      <Card className="w-full animate-fade-in">
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cuephoria-lightpurple"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full animate-fade-in">
      <CardHeader>
        <div className="flex items-center gap-2 mb-2">
          <Settings className="h-5 w-5 text-cuephoria-lightpurple" />
          <CardTitle>General Settings</CardTitle>
        </div>
        <CardDescription>
          Manage your application preferences and default settings. Changes will trigger notifications and apply immediately.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Theme Settings */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium flex items-center gap-2">
                <Moon className="h-4 w-4 text-cuephoria-lightpurple" />
                Appearance
              </h3>
              <FormField
                control={form.control}
                name="theme"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Theme</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select theme" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="light">Light Mode</SelectItem>
                        <SelectItem value="dark">Dark Mode</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Choose your preferred color theme. Changes apply immediately and will trigger a notification.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Notification Settings */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium flex items-center gap-2">
                <Bell className="h-4 w-4 text-cuephoria-lightpurple" />
                Notifications
              </h3>
              <FormField
                control={form.control}
                name="notifications_enabled"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">In-App Notifications</FormLabel>
                      <FormDescription>
                        Receive notifications about station timeouts, low stock products, and customer activities.
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email_notifications"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Email Notifications</FormLabel>
                      <FormDescription>
                        Receive daily reports and critical alerts via email.
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            {/* Station Settings */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium flex items-center gap-2">
                <Clock className="h-4 w-4 text-cuephoria-lightpurple" />
                Station Settings
              </h3>
              <FormField
                control={form.control}
                name="default_timeout"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Default Station Timeout (minutes)</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                    <FormDescription>
                      Set the default time limit for station sessions.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Receipt Template Setting */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Receipt Settings</h3>
              <FormField
                control={form.control}
                name="receipt_template"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Receipt Template</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a receipt template" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="standard">Standard Receipt</SelectItem>
                        <SelectItem value="detailed">Detailed Receipt</SelectItem>
                        <SelectItem value="minimal">Minimal Receipt</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Choose the default template for customer receipts.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Button type="submit" disabled={isSaving} className="w-full sm:w-auto">
              {isSaving ? "Saving..." : "Save changes"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};

export default GeneralSettings;
