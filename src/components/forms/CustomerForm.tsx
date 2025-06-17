
import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Customer } from '@/types/pos.types';

const customerFormSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  phone: z.string().min(10, { message: "Phone number must be at least 10 digits." }),
  email: z.string().email({ message: "Please enter a valid email address." }).optional().or(z.literal("")),
  isMember: z.boolean().default(false),
  membershipPlan: z.string().optional(),
  membershipStartDate: z.date().optional(),
  membershipExpiryDate: z.date().optional(),
  membershipHoursLeft: z.number().optional(),
});

type CustomerFormData = z.infer<typeof customerFormSchema>;

interface CustomerFormProps {
  onSubmit: (data: Omit<Customer, 'id' | 'createdAt'>) => void;
  initialData?: Customer;
}

export const CustomerForm: React.FC<CustomerFormProps> = ({ onSubmit, initialData }) => {
  const form = useForm<CustomerFormData>({
    resolver: zodResolver(customerFormSchema),
    defaultValues: {
      name: initialData?.name || '',
      phone: initialData?.phone || '',
      email: initialData?.email || '',
      isMember: initialData?.isMember || false,
      membershipPlan: initialData?.membershipPlan || '',
      membershipStartDate: initialData?.membershipStartDate,
      membershipExpiryDate: initialData?.membershipExpiryDate,
      membershipHoursLeft: initialData?.membershipHoursLeft || 0,
    },
  });

  const isMember = form.watch('isMember');

  const handleSubmit = (data: CustomerFormData) => {
    const customerData: Omit<Customer, 'id' | 'createdAt'> = {
      name: data.name,
      phone: data.phone,
      email: data.email || undefined,
      isMember: data.isMember,
      membershipPlan: data.isMember ? data.membershipPlan : undefined,
      membershipStartDate: data.isMember ? data.membershipStartDate : undefined,
      membershipExpiryDate: data.isMember ? data.membershipExpiryDate : undefined,
      membershipHoursLeft: data.isMember ? (data.membershipHoursLeft || 0) : 0,
      totalSpent: initialData?.totalSpent || 0,
      loyaltyPoints: initialData?.loyaltyPoints || 0,
      totalPlayTime: initialData?.totalPlayTime || 0,
    };

    onSubmit(customerData);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input placeholder="Customer name" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="phone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Phone</FormLabel>
              <FormControl>
                <Input placeholder="Phone number" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email (Optional)</FormLabel>
              <FormControl>
                <Input placeholder="Email address" type="email" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="isMember"
          render={({ field }) => (
            <FormItem className="flex flex-row items-start space-x-3 space-y-0">
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
              <div className="space-y-1 leading-none">
                <FormLabel>Is Member</FormLabel>
              </div>
            </FormItem>
          )}
        />

        {isMember && (
          <>
            <FormField
              control={form.control}
              name="membershipPlan"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Membership Plan</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a membership plan" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="basic">Basic</SelectItem>
                      <SelectItem value="premium">Premium</SelectItem>
                      <SelectItem value="vip">VIP</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="membershipHoursLeft"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Membership Hours Left</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      placeholder="Hours remaining" 
                      {...field}
                      onChange={(e) => field.onChange(Number(e.target.value))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </>
        )}

        <Button type="submit" className="w-full">
          {initialData ? 'Update Customer' : 'Add Customer'}
        </Button>
      </form>
    </Form>
  );
};
