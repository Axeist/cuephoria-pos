
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
import { Settings, Bell, Clock, Receipt, Gamepad2, Users, DollarSign, Timer } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';

const formSchema = z.object({
  // Station Settings
  defaultTimeout: z.string().min(1, {
    message: "Default timeout is required",
  }),
  autoExtendSessions: z.boolean().default(false),
  gracePeriodMinutes: z.string().min(1),
  
  // Notification Settings
  enableNotifications: z.boolean().default(true),
  emailNotifications: z.boolean().default(false),
  lowStockThreshold: z.string().min(1),
  
  // Pricing Settings
  membershipDiscount: z.string().min(0),
  studentDiscount: z.string().min(0),
  loyaltyPointsRate: z.string().min(1),
  
  // Receipt Settings
  receiptTemplate: z.string().min(1),
  showBusinessLogo: z.boolean().default(true),
  includeQRCode: z.boolean().default(false),
  
  // Business Settings
  businessName: z.string().min(1),
  businessPhone: z.string().min(10),
  businessAddress: z.string().min(1),
  
  // Theme Settings
  darkMode: z.boolean().default(true),
});

type FormData = z.infer<typeof formSchema>;

const GeneralSettings = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const defaultValues: FormData = {
    // Station Settings
    defaultTimeout: '60',
    autoExtendSessions: false,
    gracePeriodMinutes: '5',
    
    // Notification Settings
    enableNotifications: true,
    emailNotifications: false,
    lowStockThreshold: '10',
    
    // Pricing Settings
    membershipDiscount: '10',
    studentDiscount: '15',
    loyaltyPointsRate: '1',
    
    // Receipt Settings
    receiptTemplate: 'standard',
    showBusinessLogo: true,
    includeQRCode: false,
    
    // Business Settings
    businessName: 'Cuephoria Gaming Lounge',
    businessPhone: '+1234567890',
    businessAddress: '123 Gaming Street, City',
    
    // Theme Settings
    darkMode: true,
  };

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues,
  });

  // Load existing preferences on component mount
  useEffect(() => {
    const loadPreferences = async () => {
      if (!user?.id) return;
      
      try {
        const { data, error } = await supabase
          .from('user_preferences')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (error && error.code !== 'PGRST116') {
          console.error('Error loading preferences:', error);
          return;
        }

        if (data) {
          form.reset({
            defaultTimeout: data.default_timeout?.toString() || '60',
            enableNotifications: data.notifications_enabled ?? true,
            emailNotifications: data.email_notifications ?? false,
            receiptTemplate: data.receipt_template || 'standard',
            darkMode: data.theme === 'dark',
            // For other settings, we'll use defaults for now
            autoExtendSessions: false,
            gracePeriodMinutes: '5',
            lowStockThreshold: '10',
            membershipDiscount: '10',
            studentDiscount: '15',
            loyaltyPointsRate: '1',
            showBusinessLogo: true,
            includeQRCode: false,
            businessName: 'Cuephoria Gaming Lounge',
            businessPhone: '+1234567890',
            businessAddress: '123 Gaming Street, City',
          });
        }
      } catch (error) {
        console.error('Error loading preferences:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadPreferences();
  }, [user?.id, form]);

  const onSubmit = async (data: FormData) => {
    if (!user?.id) {
      toast({
        title: "Error",
        description: "You must be logged in to save settings.",
        variant: "destructive"
      });
      return;
    }

    setIsSaving(true);
    
    try {
      // Save to user_preferences table
      const { error } = await supabase
        .from('user_preferences')
        .upsert({
          user_id: user.id,
          default_timeout: parseInt(data.defaultTimeout),
          notifications_enabled: data.enableNotifications,
          email_notifications: data.emailNotifications,
          receipt_template: data.receiptTemplate,
          theme: data.darkMode ? 'dark' : 'light',
          updated_at: new Date().toISOString()
        });

      if (error) {
        throw error;
      }

      toast({
        title: "Settings saved",
        description: "Your preferences have been updated successfully.",
      });
      
    } catch (error) {
      console.error('Error saving preferences:', error);
      toast({
        title: "Error saving settings",
        description: "There was a problem saving your preferences. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <Card className="w-full">
        <CardContent className="flex items-center justify-center py-8">
          <div className="animate-spin h-8 w-8 rounded-full border-4 border-primary border-t-transparent"></div>
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
          Configure your gaming lounge management preferences and business settings.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            
            {/* Station Management Settings */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium flex items-center gap-2">
                <Gamepad2 className="h-4 w-4 text-cuephoria-lightpurple" />
                Station Management
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="defaultTimeout"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Default Session Timeout (minutes)</FormLabel>
                      <FormControl>
                        <Input type="number" min="15" max="480" {...field} />
                      </FormControl>
                      <FormDescription>
                        Default time limit for gaming sessions
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="gracePeriodMinutes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Grace Period (minutes)</FormLabel>
                      <FormControl>
                        <Input type="number" min="0" max="15" {...field} />
                      </FormControl>
                      <FormDescription>
                        Extra time before auto-ending sessions
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="autoExtendSessions"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Auto-extend Sessions</FormLabel>
                      <FormDescription>
                        Automatically extend sessions when customers add time
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

            {/* Notification Settings */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium flex items-center gap-2">
                <Bell className="h-4 w-4 text-cuephoria-lightpurple" />
                Notifications
              </h3>
              
              <FormField
                control={form.control}
                name="enableNotifications"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">In-App Notifications</FormLabel>
                      <FormDescription>
                        Receive notifications about timeouts, low stock, and alerts
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
                name="emailNotifications"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Email Notifications</FormLabel>
                      <FormDescription>
                        Receive daily reports and critical alerts via email
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
                name="lowStockThreshold"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Low Stock Alert Threshold</FormLabel>
                    <FormControl>
                      <Input type="number" min="1" max="100" {...field} />
                    </FormControl>
                    <FormDescription>
                      Get notified when product stock falls below this number
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Pricing & Loyalty Settings */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-cuephoria-lightpurple" />
                Pricing & Loyalty
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="membershipDiscount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Membership Discount (%)</FormLabel>
                      <FormControl>
                        <Input type="number" min="0" max="50" {...field} />
                      </FormControl>
                      <FormDescription>
                        Discount for members
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="studentDiscount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Student Discount (%)</FormLabel>
                      <FormControl>
                        <Input type="number" min="0" max="50" {...field} />
                      </FormControl>
                      <FormDescription>
                        Discount for students
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="loyaltyPointsRate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Loyalty Points Rate</FormLabel>
                      <FormControl>
                        <Input type="number" min="0.1" step="0.1" {...field} />
                      </FormControl>
                      <FormDescription>
                        Points per dollar spent
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Receipt Settings */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium flex items-center gap-2">
                <Receipt className="h-4 w-4 text-cuephoria-lightpurple" />
                Receipt Settings
              </h3>
              
              <FormField
                control={form.control}
                name="receiptTemplate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Receipt Template</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a receipt template" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="standard">Standard Receipt</SelectItem>
                        <SelectItem value="detailed">Detailed Receipt</SelectItem>
                        <SelectItem value="minimal">Minimal Receipt</SelectItem>
                        <SelectItem value="branded">Branded Receipt</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Choose the default template for customer receipts
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="showBusinessLogo"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Show Business Logo</FormLabel>
                        <FormDescription>
                          Include logo on receipts
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
                  name="includeQRCode"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Include QR Code</FormLabel>
                        <FormDescription>
                          Add QR code for feedback/reviews
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
            </div>

            {/* Business Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium flex items-center gap-2">
                <Users className="h-4 w-4 text-cuephoria-lightpurple" />
                Business Information
              </h3>
              
              <FormField
                control={form.control}
                name="businessName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Business Name</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormDescription>
                      Your gaming lounge's official name
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="businessPhone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Business Phone</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormDescription>
                        Contact number for customers
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="businessAddress"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Business Address</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormDescription>
                        Physical location address
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Theme Settings */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium flex items-center gap-2">
                <Settings className="h-4 w-4 text-cuephoria-lightpurple" />
                Appearance
              </h3>
              
              <FormField
                control={form.control}
                name="darkMode"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Dark Mode</FormLabel>
                      <FormDescription>
                        Enable dark theme for the application interface
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

            <Button type="submit" disabled={isSaving} className="w-full sm:w-auto">
              {isSaving ? "Saving..." : "Save Settings"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};

export default GeneralSettings;
