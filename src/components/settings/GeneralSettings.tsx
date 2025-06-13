
import React, { useState } from 'react';
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

const formSchema = z.object({
  defaultTimeout: z.string().min(1, {
    message: "Default timeout is required",
  }),
  darkMode: z.boolean().default(false),
  enableNotifications: z.boolean().default(true),
  emailNotifications: z.boolean().default(false),
  receiptTemplate: z.string().min(1, {
    message: "Receipt template is required",
  }),
});

type FormData = z.infer<typeof formSchema>;

const GeneralSettings = () => {
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);

  // Default values - in a real app, these would come from user preferences in the database
  const defaultValues: FormData = {
    defaultTimeout: '60',
    darkMode: true,
    enableNotifications: true,
    emailNotifications: false,
    receiptTemplate: 'standard',
  };

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues,
  });

  const onSubmit = async (data: FormData) => {
    setIsSaving(true);
    
    // Simulate API call to save settings
    await new Promise((resolve) => setTimeout(resolve, 800));
    
    console.log('Saving settings:', data);
    
    // In a real app, you would save these settings to your database
    
    toast({
      title: "Settings saved",
      description: "Your preferences have been updated successfully.",
    });
    
    setIsSaving(false);
  };

  return (
    <Card className="w-full animate-fade-in">
      <CardHeader>
        <div className="flex items-center gap-2 mb-2">
          <Settings className="h-5 w-5 text-cuephoria-lightpurple" />
          <CardTitle>General Settings</CardTitle>
        </div>
        <CardDescription>
          Manage your application preferences and default settings.
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
                name="darkMode"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Dark Mode</FormLabel>
                      <FormDescription>
                        Enable dark mode for the application interface.
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
                        Receive notifications about station timeouts and low stock products.
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
                name="defaultTimeout"
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
