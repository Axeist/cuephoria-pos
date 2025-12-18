import React, { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
import { 
  Settings, 
  Building2, 
  Award, 
  Receipt, 
  Clock, 
  Package, 
  CreditCard, 
  Bell,
  Globe,
  Loader2
} from 'lucide-react';
import { useAppSettings, AppSettings } from '@/hooks/useAppSettings';
import { Separator } from '@/components/ui/separator';

const formSchema = z.object({
  businessInfo: z.object({
    name: z.string().min(1, 'Business name is required'),
    address: z.string().optional(),
    phone: z.string().optional(),
    email: z.string().email('Invalid email').optional().or(z.literal('')),
    gstin: z.string().optional(),
  }),
  loyaltyPoints: z.object({
    memberRate: z.number().min(0, 'Rate must be 0 or greater'),
    nonMemberRate: z.number().min(0, 'Rate must be 0 or greater'),
    pointsPerRupee: z.number().min(1, 'Must be at least 1'),
  }),
  taxSettings: z.object({
    gstEnabled: z.boolean(),
    gstRate: z.number().min(0).max(100),
    serviceTaxEnabled: z.boolean(),
    serviceTaxRate: z.number().min(0).max(100),
  }),
  receiptSettings: z.object({
    template: z.enum(['standard', 'detailed', 'minimal']),
    showGST: z.boolean(),
    showTax: z.boolean(),
    showLoyaltyPoints: z.boolean(),
    footerMessage: z.string(),
  }),
  sessionSettings: z.object({
    defaultTimeout: z.number().min(1, 'Timeout must be at least 1 minute'),
    autoPauseEnabled: z.boolean(),
    pauseAfterMinutes: z.number().min(0),
  }),
  inventorySettings: z.object({
    lowStockThreshold: z.number().min(0, 'Threshold must be 0 or greater'),
    alertEnabled: z.boolean(),
  }),
  paymentSettings: z.object({
    cashEnabled: z.boolean(),
    upiEnabled: z.boolean(),
    creditEnabled: z.boolean(),
    splitEnabled: z.boolean(),
  }),
  notificationSettings: z.object({
    lowStockAlerts: z.boolean(),
    sessionTimeouts: z.boolean(),
    dailyReports: z.boolean(),
  }),
  generalSettings: z.object({
    currency: z.string().min(1),
    currencySymbol: z.string().min(1),
    dateFormat: z.string().min(1),
    timeFormat: z.enum(['12h', '24h']),
    timezone: z.string().min(1),
  }),
});

type FormData = z.infer<typeof formSchema>;

const GeneralSettings = () => {
  const { toast } = useToast();
  const { settings, loading, saving, saveSettings } = useAppSettings();
  const [isSaving, setIsSaving] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      businessInfo: settings.businessInfo,
      loyaltyPoints: settings.loyaltyPoints,
      taxSettings: settings.taxSettings,
      receiptSettings: settings.receiptSettings,
      sessionSettings: settings.sessionSettings,
      inventorySettings: settings.inventorySettings,
      paymentSettings: settings.paymentSettings,
      notificationSettings: settings.notificationSettings,
      generalSettings: settings.generalSettings,
    },
  });

  // Update form when settings load
  useEffect(() => {
    if (!loading && settings) {
      form.reset({
        businessInfo: settings.businessInfo,
        loyaltyPoints: settings.loyaltyPoints,
        taxSettings: settings.taxSettings,
        receiptSettings: settings.receiptSettings,
        sessionSettings: settings.sessionSettings,
        inventorySettings: settings.inventorySettings,
        paymentSettings: settings.paymentSettings,
        notificationSettings: settings.notificationSettings,
        generalSettings: settings.generalSettings,
      });
    }
  }, [loading, settings, form]);

  const onSubmit = async (data: FormData) => {
    setIsSaving(true);
    
    const success = await saveSettings(data as Partial<AppSettings>);
    
    if (success) {
      form.reset(data);
    }
    
    setIsSaving(false);
  };

  if (loading) {
    return (
      <Card className="w-full">
        <CardContent className="flex items-center justify-center p-12">
          <Loader2 className="h-8 w-8 animate-spin text-cuephoria-lightpurple" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="w-full">
        <CardHeader>
          <div className="flex items-center gap-2 mb-2">
            <Settings className="h-5 w-5 text-cuephoria-lightpurple" />
            <CardTitle>General Settings</CardTitle>
          </div>
          <CardDescription>
            Manage your application preferences and business settings.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              {/* Business Information */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-cuephoria-lightpurple" />
                  <h3 className="text-lg font-semibold">Business Information</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="businessInfo.name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Business Name</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Cuephoria Gaming Lounge" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="businessInfo.phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone Number</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="+91 1234567890" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="businessInfo.email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input type="email" {...field} placeholder="info@cuephoria.in" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="businessInfo.gstin"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>GSTIN</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="29ABCDE1234F1Z5" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="businessInfo.address"
                    render={({ field }) => (
                      <FormItem className="md:col-span-2">
                        <FormLabel>Address</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Street, City, State, PIN" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <Separator />

              {/* Loyalty Points Configuration */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Award className="h-5 w-5 text-cuephoria-lightpurple" />
                  <h3 className="text-lg font-semibold">Loyalty Points</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="loyaltyPoints.memberRate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Points per ₹100 (Members)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            {...field} 
                            onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                            min="0"
                          />
                        </FormControl>
                        <FormDescription>Members earn this many points per ₹100 spent</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="loyaltyPoints.nonMemberRate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Points per ₹100 (Non-Members)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            {...field} 
                            onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                            min="0"
                          />
                        </FormControl>
                        <FormDescription>Non-members earn this many points per ₹100 spent</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="loyaltyPoints.pointsPerRupee"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Points Calculation Base</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            {...field} 
                            onChange={(e) => field.onChange(parseFloat(e.target.value) || 100)}
                            min="1"
                          />
                        </FormControl>
                        <FormDescription>Calculate points per this amount (default: ₹100)</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <Separator />

              {/* Tax Settings */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Receipt className="h-5 w-5 text-cuephoria-lightpurple" />
                  <h3 className="text-lg font-semibold">Tax Configuration</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="taxSettings.gstEnabled"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel>Enable GST</FormLabel>
                          <FormDescription>Apply GST to transactions</FormDescription>
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
                  {form.watch('taxSettings.gstEnabled') && (
                    <FormField
                      control={form.control}
                      name="taxSettings.gstRate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>GST Rate (%)</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              {...field} 
                              onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                              min="0"
                              max="100"
                              step="0.01"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                  <FormField
                    control={form.control}
                    name="taxSettings.serviceTaxEnabled"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel>Enable Service Tax</FormLabel>
                          <FormDescription>Apply service tax to transactions</FormDescription>
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
                  {form.watch('taxSettings.serviceTaxEnabled') && (
                    <FormField
                      control={form.control}
                      name="taxSettings.serviceTaxRate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Service Tax Rate (%)</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              {...field} 
                              onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                              min="0"
                              max="100"
                              step="0.01"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                </div>
              </div>

              <Separator />

              {/* Receipt Settings */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Receipt className="h-5 w-5 text-cuephoria-lightpurple" />
                  <h3 className="text-lg font-semibold">Receipt Settings</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="receiptSettings.template"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Receipt Template</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select template" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="standard">Standard</SelectItem>
                            <SelectItem value="detailed">Detailed</SelectItem>
                            <SelectItem value="minimal">Minimal</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormDescription>Choose the default receipt template</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="receiptSettings.footerMessage"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Footer Message</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Thank you for visiting!" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="receiptSettings.showLoyaltyPoints"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel>Show Loyalty Points</FormLabel>
                          <FormDescription>Display loyalty points on receipts</FormDescription>
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
                    name="receiptSettings.showGST"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel>Show GST</FormLabel>
                          <FormDescription>Display GST on receipts</FormDescription>
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

              <Separator />

              {/* Session Settings */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-cuephoria-lightpurple" />
                  <h3 className="text-lg font-semibold">Session Settings</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="sessionSettings.defaultTimeout"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Default Session Timeout (minutes)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            {...field} 
                            onChange={(e) => field.onChange(parseInt(e.target.value) || 60)}
                            min="1"
                          />
                        </FormControl>
                        <FormDescription>Default time limit for station sessions</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="sessionSettings.autoPauseEnabled"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel>Auto-Pause Sessions</FormLabel>
                          <FormDescription>Automatically pause inactive sessions</FormDescription>
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
                  {form.watch('sessionSettings.autoPauseEnabled') && (
                    <FormField
                      control={form.control}
                      name="sessionSettings.pauseAfterMinutes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Pause After (minutes)</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              {...field} 
                              onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                              min="0"
                            />
                          </FormControl>
                          <FormDescription>Auto-pause sessions after this many minutes of inactivity</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                </div>
              </div>

              <Separator />

              {/* Inventory Settings */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Package className="h-5 w-5 text-cuephoria-lightpurple" />
                  <h3 className="text-lg font-semibold">Inventory Settings</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="inventorySettings.lowStockThreshold"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Low Stock Threshold</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            {...field} 
                            onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                            min="0"
                          />
                        </FormControl>
                        <FormDescription>Alert when stock falls below this number</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="inventorySettings.alertEnabled"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel>Enable Low Stock Alerts</FormLabel>
                          <FormDescription>Show alerts for low stock items</FormDescription>
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

              <Separator />

              {/* Payment Settings */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-cuephoria-lightpurple" />
                  <h3 className="text-lg font-semibold">Payment Methods</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="paymentSettings.cashEnabled"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel>Cash Payments</FormLabel>
                          <FormDescription>Allow cash payment method</FormDescription>
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
                    name="paymentSettings.upiEnabled"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel>UPI Payments</FormLabel>
                          <FormDescription>Allow UPI payment method</FormDescription>
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
                    name="paymentSettings.creditEnabled"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel>Credit Payments</FormLabel>
                          <FormDescription>Allow credit payment method</FormDescription>
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
                    name="paymentSettings.splitEnabled"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel>Split Payments</FormLabel>
                          <FormDescription>Allow split payment method</FormDescription>
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

              <Separator />

              {/* Notification Settings */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Bell className="h-5 w-5 text-cuephoria-lightpurple" />
                  <h3 className="text-lg font-semibold">Notifications</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="notificationSettings.lowStockAlerts"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel>Low Stock Alerts</FormLabel>
                          <FormDescription>Notify when stock is low</FormDescription>
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
                    name="notificationSettings.sessionTimeouts"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel>Session Timeout Alerts</FormLabel>
                          <FormDescription>Notify about session timeouts</FormDescription>
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
                    name="notificationSettings.dailyReports"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel>Daily Reports</FormLabel>
                          <FormDescription>Send daily business reports</FormDescription>
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

              <Separator />

              {/* General Settings */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Globe className="h-5 w-5 text-cuephoria-lightpurple" />
                  <h3 className="text-lg font-semibold">General</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="generalSettings.currency"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Currency</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="INR" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="generalSettings.currencySymbol"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Currency Symbol</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="₹" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="generalSettings.dateFormat"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Date Format</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select format" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                            <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                            <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="generalSettings.timeFormat"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Time Format</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select format" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="12h">12 Hour</SelectItem>
                            <SelectItem value="24h">24 Hour</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="generalSettings.timezone"
                    render={({ field }) => (
                      <FormItem className="md:col-span-2">
                        <FormLabel>Timezone</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Asia/Kolkata" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <Button type="submit" disabled={isSaving || saving} className="min-w-[120px]">
                  {isSaving || saving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Save Settings'
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
};

export default GeneralSettings;
