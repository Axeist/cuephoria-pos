import { useState, useEffect } from 'react';
import { Customer } from '@/types/pos.types';
import { supabase } from "@/integrations/supabase/client";
import { useToast } from '@/hooks/use-toast';

// ✅ HELPER FUNCTIONS FOR PHONE NORMALIZATION AND ID GENERATION
const normalizePhoneNumber = (phone: string): string => {
  return phone.replace(/\D/g, '');
};

const generateCustomerID = (phone: string): string => {
  const normalized = normalizePhoneNumber(phone);
  const timestamp = Date.now().toString(36).slice(-4).toUpperCase();
  const phoneHash = normalized.slice(-4);
  return `CUE${phoneHash}${timestamp}`;
};

export const useCustomers = (initialCustomers: Customer[]) => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const { toast } = useToast();
  
  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        const storedCustomers = localStorage.getItem('cuephoriaCustomers');
        if (storedCustomers) {
          const parsedCustomers = JSON.parse(storedCustomers);
          
          const customersWithDates = parsedCustomers.map((customer: any) => ({
            ...customer,
            customerId: customer.customerId || generateCustomerID(customer.phone), // ✅ Generate if missing
            phone: normalizePhoneNumber(customer.phone), // ✅ Normalize phone
            createdAt: new Date(customer.createdAt),
            membershipStartDate: customer.membershipStartDate ? new Date(customer.membershipStartDate) : undefined,
            membershipExpiryDate: customer.membershipExpiryDate ? new Date(customer.membershipExpiryDate) : undefined
          }));
          
          setCustomers(customersWithDates);
          
          // ✅ Sync to database with custom_id and customer_id
          for (const customer of customersWithDates) {
            const customerID = customer.customerId || generateCustomerID(customer.phone);
            await supabase.from('customers').upsert({
                id: customer.id,
                custom_id: customerID, // ✅ Include custom_id (required)
                customer_id: customerID, // ✅ Also include customer_id for backward compatibility
                name: customer.name,
                phone: normalizePhoneNumber(customer.phone), // ✅ Normalize phone
                email: customer.email,
                is_member: customer.isMember,
                membership_expiry_date: customer.membershipExpiryDate?.toISOString(),
                membership_start_date: customer.membershipStartDate?.toISOString(),
                membership_plan: customer.membershipPlan,
                membership_hours_left: customer.membershipHoursLeft,
                membership_duration: customer.membershipDuration,
                loyalty_points: customer.loyaltyPoints,
                total_spent: customer.totalSpent,
                total_play_time: customer.totalPlayTime,
                created_at: customer.createdAt.toISOString()
              }, 
              { onConflict: 'id' }
            );
          }
          
          localStorage.removeItem('cuephoriaCustomers');
          return;
        }
        
        // Fetch all customers using pagination to bypass 1000 record limit
        let page = 0;
        const pageSize = 1000;
        let allCustomersData: any[] = [];
        let finished = false;

        while (!finished) {
          const { data, error } = await supabase
            .from('customers')
            .select('*')
            .order('created_at', { ascending: false })
            .range(page * pageSize, (page + 1) * pageSize - 1);
            
          if (error) {
            console.error('Error fetching customers:', error);
            toast({
              title: 'Database Error',
              description: 'Failed to fetch customers from database',
              variant: 'destructive'
            });
            return;
          }
          
          if (data && data.length > 0) {
            allCustomersData = [...allCustomersData, ...data];
            // If we got less than pageSize, we've reached the end
            if (data.length < pageSize) {
              finished = true;
            } else {
              page++;
            }
          } else {
            finished = true;
          }
        }
        
        if (allCustomersData.length > 0) {
          const transformedCustomers = allCustomersData.map(item => ({
            id: item.id,
            customerId: item.customer_id || generateCustomerID(item.phone), // ✅ Map customer_id
            name: item.name,
            phone: item.phone,
            email: item.email || undefined,
            isMember: item.is_member,
            membershipExpiryDate: item.membership_expiry_date ? new Date(item.membership_expiry_date) : undefined,
            membershipStartDate: item.membership_start_date ? new Date(item.membership_start_date) : undefined,
            membershipPlan: item.membership_plan || undefined,
            membershipHoursLeft: item.membership_hours_left || undefined,
            membershipDuration: item.membership_duration as 'weekly' | 'monthly' | undefined,
            loyaltyPoints: item.loyalty_points,
            totalSpent: item.total_spent,
            totalPlayTime: item.total_play_time,
            createdAt: new Date(item.created_at)
          }));
          
          setCustomers(transformedCustomers);
          console.log(`Loaded ${transformedCustomers.length} customers from database`);
        } else {
          setCustomers([]);
        }
      } catch (error) {
        console.error('Error in fetchCustomers:', error);
        toast({
          title: 'Error',
          description: 'Failed to load customers',
          variant: 'destructive'
        });
        setCustomers([]);
      }
    };
    
    fetchCustomers();
  }, []);
  
  useEffect(() => {
    const now = new Date();
    let customersUpdated = false;
    
    const checkExpirations = async () => {
      const updatedCustomers = customers.map(customer => {
        if (customer.isMember && customer.membershipExpiryDate) {
          const expiryDate = new Date(customer.membershipExpiryDate);
          
          if (expiryDate < now) {
            customersUpdated = true;
            console.log(`Membership expired for ${customer.name}`);
            return {
              ...customer,
              isMember: false
            };
          }
        }
        return customer;
      });
      
      if (customersUpdated) {
        setCustomers(updatedCustomers);
        
        for (const customer of updatedCustomers) {
          if (!customer.isMember) {
            await supabase
              .from('customers')
              .update({ is_member: false })
              .eq('id', customer.id);
          }
        }
      }
    };
    
    checkExpirations();
  }, [customers]);
  
  // ✅ UPDATED: Duplicate check with normalized phone comparison
  const isDuplicateCustomer = (phone: string, email?: string, currentCustomerId?: string): { isDuplicate: boolean, existingCustomer?: Customer } => {
    const normalizedPhone = normalizePhoneNumber(phone);
    
    // Check for duplicate phone (normalized comparison)
    const existingByPhone = customers.find(c => {
      if (currentCustomerId && c.id === currentCustomerId) return false; // Skip current customer in edit mode
      return normalizePhoneNumber(c.phone) === normalizedPhone;
    });
    
    if (existingByPhone) {
      return { isDuplicate: true, existingCustomer: existingByPhone };
    }
    
    // Check for duplicate email
    if (email && email.trim() !== '') {
      const normalizedEmail = email.toLowerCase().trim();
      const existingByEmail = customers.find(c => {
        if (currentCustomerId && c.id === currentCustomerId) return false;
        return c.email?.toLowerCase().trim() === normalizedEmail;
      });
      
      if (existingByEmail) {
        return { isDuplicate: true, existingCustomer: existingByEmail };
      }
    }
    
    return { isDuplicate: false };
  };
  
  // ✅ UPDATED: Add customer with ID generation and phone normalization
  const addCustomer = async (customer: Omit<Customer, 'id' | 'createdAt'>) => {
    try {
      // Normalize phone
      const normalizedPhone = normalizePhoneNumber(customer.phone);
      
      // Check for duplicates
      const { isDuplicate, existingCustomer } = isDuplicateCustomer(customer.phone, customer.email);
      
      if (isDuplicate && existingCustomer) {
        toast({
          title: 'Duplicate Customer',
          description: `Customer "${existingCustomer.name}" (${existingCustomer.customerId}) already exists with this ${existingCustomer.phone === normalizedPhone ? 'phone number' : 'email'}`,
          variant: 'destructive'
        });
        return existingCustomer;
      }
      
      // Generate customer ID
      const customerID = customer.customerId || generateCustomerID(normalizedPhone);
      
      // Insert into database
      const { data, error } = await supabase
        .from('customers')
        .insert({
          custom_id: customerID, // ✅ Use custom_id (required field)
          customer_id: customerID, // Also set customer_id for backward compatibility
          name: customer.name,
          phone: normalizedPhone, // ✅ Store normalized phone
          email: customer.email,
          is_member: customer.isMember,
          membership_expiry_date: customer.membershipExpiryDate?.toISOString(),
          membership_start_date: customer.membershipStartDate?.toISOString(),
          membership_plan: customer.membershipPlan,
          membership_hours_left: customer.membershipHoursLeft,
          membership_duration: customer.membershipDuration,
          loyalty_points: customer.loyaltyPoints || 0,
          total_spent: customer.totalSpent || 0,
          total_play_time: customer.totalPlayTime || 0
        })
        .select()
        .single();
        
      if (error) {
        console.error('Error adding customer:', error);
        toast({
          title: 'Database Error',
          description: 'Failed to add customer to database',
          variant: 'destructive'
        });
        return null;
      }
      
      if (data) {
        const newCustomer: Customer = {
          id: data.id,
          customerId: data.customer_id, // ✅ Map customer_id
          name: data.name,
          phone: data.phone,
          email: data.email || undefined,
          isMember: data.is_member,
          membershipExpiryDate: data.membership_expiry_date ? new Date(data.membership_expiry_date) : undefined,
          membershipStartDate: data.membership_start_date ? new Date(data.membership_start_date) : undefined,
          membershipPlan: data.membership_plan || undefined,
          membershipHoursLeft: data.membership_hours_left || undefined,
          membershipDuration: data.membership_duration as 'weekly' | 'monthly' | undefined,
          loyaltyPoints: data.loyalty_points,
          totalSpent: data.total_spent,
          totalPlayTime: data.total_play_time,
          createdAt: new Date(data.created_at)
        };
        
        setCustomers(prev => [...prev, newCustomer]);
        
        toast({
          title: 'Customer Added',
          description: `${newCustomer.name} (ID: ${newCustomer.customerId}) added successfully`,
        });
        
        return newCustomer;
      }
      return null;
    } catch (error) {
      console.error('Error in addCustomer:', error);
      toast({
        title: 'Error',
        description: 'Failed to add customer',
        variant: 'destructive'
      });
      return null;
    }
  };
  
  const updateCustomerMembership = async (customerId: string, membershipData: {
    membershipPlan?: string;
    membershipDuration?: 'weekly' | 'monthly';
    membershipHoursLeft?: number;
  }) => {
    const customer = customers.find(c => c.id === customerId);
    if (!customer) return null;
    
    const now = new Date();
    const membershipStartDate = now;
    let membershipExpiryDate = new Date(now);
    
    if (membershipData.membershipDuration === 'weekly') {
      membershipExpiryDate.setDate(membershipExpiryDate.getDate() + 7);
    } else if (membershipData.membershipDuration === 'monthly') {
      membershipExpiryDate.setMonth(membershipExpiryDate.getMonth() + 1);
    }
    
    const updatedCustomer = {
      ...customer,
      isMember: true,
      membershipPlan: membershipData.membershipPlan || customer.membershipPlan,
      membershipDuration: membershipData.membershipDuration || customer.membershipDuration,
      membershipHoursLeft: membershipData.membershipHoursLeft !== undefined 
        ? membershipData.membershipHoursLeft 
        : customer.membershipHoursLeft,
      membershipStartDate,
      membershipExpiryDate
    };
    
    const result = await updateCustomer(updatedCustomer);
    
    toast({
      title: "Membership Updated",
      description: `${customer.name}'s membership has been updated successfully.`,
      variant: "default"
    });
    
    return result;
  };
  
  // ✅ UPDATED: Update customer with duplicate checking
  const updateCustomer = async (customer: Customer) => {
    try {
      const existingCustomer = customers.find(c => c.id === customer.id);
      
      if (existingCustomer) {
        // Check for duplicate phone (normalized comparison, excluding current customer)
        const normalizedPhone = normalizePhoneNumber(customer.phone);
        const normalizedExistingPhone = normalizePhoneNumber(existingCustomer.phone);
        
        if (normalizedPhone !== normalizedExistingPhone) {
          const duplicatePhone = customers.find(c => 
            c.id !== customer.id && normalizePhoneNumber(c.phone) === normalizedPhone
          );
          
          if (duplicatePhone) {
            toast({
              title: 'Duplicate Phone Number',
              description: `This phone number is already used by ${duplicatePhone.name} (${duplicatePhone.customerId})`,
              variant: 'destructive'
            });
            return null;
          }
        }
        
        // Check for duplicate email
        if (existingCustomer.email !== customer.email && customer.email) {
          const normalizedEmail = customer.email.toLowerCase().trim();
          const duplicateEmail = customers.find(c => 
            c.id !== customer.id && c.email?.toLowerCase().trim() === normalizedEmail
          );
          
          if (duplicateEmail) {
            toast({
              title: 'Duplicate Email',
              description: `This email is already used by ${duplicateEmail.name} (${duplicateEmail.customerId})`,
              variant: 'destructive'
            });
            return null;
          }
        }
      }
      
      console.log('useCustomers: Updating customer in database:', customer.name, {
        totalSpent: customer.totalSpent,
        loyaltyPoints: customer.loyaltyPoints
      });
      
      // ✅ Update with normalized phone, custom_id, and customer_id
      const customerID = customer.customerId || generateCustomerID(customer.phone);
      const updateData: any = {
        custom_id: customerID, // ✅ Ensure custom_id is set (required field)
        customer_id: customerID, // ✅ Also update customer_id for backward compatibility
        name: customer.name,
        phone: normalizePhoneNumber(customer.phone), // ✅ Normalize phone
        email: customer.email,
        is_member: customer.isMember,
        membership_expiry_date: customer.membershipExpiryDate?.toISOString(),
        membership_start_date: customer.membershipStartDate?.toISOString(),
        membership_plan: customer.membershipPlan,
        membership_hours_left: customer.membershipHoursLeft,
        membership_duration: customer.membershipDuration,
        loyalty_points: customer.loyaltyPoints,
        total_spent: customer.totalSpent,
        total_play_time: customer.totalPlayTime
      };
      
      const { error } = await supabase
        .from('customers')
        .update(updateData)
        .eq('id', customer.id);
        
      if (error) {
        console.error('Error updating customer:', error);
        toast({
          title: 'Database Error',
          description: 'Failed to update customer in database',
          variant: 'destructive'
        });
        return null;
      }
      
      // Update customers array immediately
      setCustomers(prevCustomers => 
        prevCustomers.map(c => c.id === customer.id ? customer : c)
      );
      
      // Update selected customer if this was the selected one
      if (selectedCustomer && selectedCustomer.id === customer.id) {
        console.log('useCustomers: Updating selected customer with new data');
        setSelectedCustomer(customer);
      }
      
      console.log('useCustomers: Customer updated successfully in state and database');
      
      toast({
        title: 'Success',
        description: 'Customer updated successfully',
      });
      
      return customer;
    } catch (error) {
      console.error('Error in updateCustomer:', error);
      toast({
        title: 'Error',
        description: 'Failed to update customer',
        variant: 'destructive'
      });
      return null;
    }
  };
  
  const deleteCustomer = async (id: string) => {
    try {
      console.log('Attempting to delete customer with ID:', id);
      
      // First, check if customer has any active sessions
      const { data: activeSessions, error: sessionsError } = await supabase
        .from('sessions')
        .select('id')
        .eq('customer_id', id)
        .is('end_time', null);
        
      if (sessionsError) {
        console.error('Error checking active sessions:', sessionsError);
      } else if (activeSessions && activeSessions.length > 0) {
        toast({
          title: 'Cannot Delete Customer',
          description: 'This customer has active sessions. Please end all sessions before deleting.',
          variant: 'destructive'
        });
        return;
      }

      const { error } = await supabase
        .from('customers')
        .delete()
        .eq('id', id);
        
      if (error) {
        console.error('Error deleting customer:', error);
        toast({
          title: 'Error',
          description: 'Failed to delete customer: ' + error.message,
          variant: 'destructive'
        });
        return;
      }
      
      setCustomers(customers.filter(c => c.id !== id));
      
      if (selectedCustomer && selectedCustomer.id === id) {
        setSelectedCustomer(null);
      }
      
      toast({
        title: 'Success',
        description: 'Customer deleted successfully',
      });
    } catch (error) {
      console.error('Error in deleteCustomer:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete customer',
        variant: 'destructive'
      });
    }
  };
  
  const selectCustomer = (id: string | null) => {
    console.log('useCustomers: Selecting customer with ID:', id);
    if (!id) {
      setSelectedCustomer(null);
      return;
    }
    
    const customer = customers.find(c => c.id === id);
    
    if (customer) {
      console.log('useCustomers: Found customer to select:', {
        name: customer.name,
        customerId: customer.customerId,
        totalSpent: customer.totalSpent,
        loyaltyPoints: customer.loyaltyPoints
      });
      
      if (customer.isMember && customer.membershipExpiryDate) {
        const expiryDate = new Date(customer.membershipExpiryDate);
        
        if (expiryDate < new Date()) {
          toast({
            title: "Membership Expired",
            description: `${customer.name}'s membership has expired on ${expiryDate.toLocaleDateString()}`,
            variant: "destructive"
          });
          
          const updatedCustomer = {
            ...customer,
            isMember: false
          };
          
          updateCustomer(updatedCustomer);
          setSelectedCustomer(updatedCustomer);
          return;
        }
        
        if (customer.membershipHoursLeft !== undefined && customer.membershipHoursLeft <= 0) {
          toast({
            title: "Membership Hours Depleted",
            description: `${customer.name} has no remaining hours on their membership plan`,
            variant: "destructive"
          });
        }
      }
      
      setSelectedCustomer(customer);
    } else {
      console.log('useCustomers: Customer not found with ID:', id);
      setSelectedCustomer(null);
    }
  };
  
  const checkMembershipValidity = (customerId: string): boolean => {
    const customer = customers.find(c => c.id === customerId);
    
    if (!customer) return false;
    if (!customer.isMember) return false;
    
    if (customer.membershipExpiryDate) {
      const expiryDate = new Date(customer.membershipExpiryDate);
      if (expiryDate < new Date()) {
        toast({
          title: "Membership Expired",
          description: `${customer.name}'s membership has expired on ${expiryDate.toLocaleDateString()}`,
          variant: "destructive"
        });
        
        updateCustomer({
          ...customer,
          isMember: false
        });
        
        return false;
      }
    }
    
    if (customer.membershipHoursLeft !== undefined && customer.membershipHoursLeft <= 0) {
      toast({
        title: "No Hours Remaining",
        description: `${customer.name} has used all allocated hours in their membership plan`,
        variant: "destructive"
      });
      return false;
    }
    
    return true;
  };
  
  const deductMembershipHours = (customerId: string, hours: number): boolean => {
    const customer = customers.find(c => c.id === customerId);
    
    if (!customer || !customer.isMember || customer.membershipHoursLeft === undefined) {
      return false;
    }
    
    if (customer.membershipHoursLeft < hours) {
      toast({
        title: "Insufficient Hours",
        description: `Customer only has ${customer.membershipHoursLeft} hours remaining`,
        variant: "destructive"
      });
      return false;
    }
    
    const updatedCustomer = {
      ...customer,
      membershipHoursLeft: customer.membershipHoursLeft - hours
    };
    
    updateCustomer(updatedCustomer);
    return true;
  };
  
  return {
    customers,
    setCustomers,
    selectedCustomer,
    setSelectedCustomer,
    addCustomer,
    updateCustomer,
    updateCustomerMembership,
    deleteCustomer,
    selectCustomer,
    checkMembershipValidity,
    deductMembershipHours
  };
};
