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

// ✅ CACHE CONFIGURATION
const CUSTOMERS_CACHE_KEY = 'cuephoria_customers_cache';
const CUSTOMERS_CACHE_TIMESTAMP_KEY = 'cuephoria_customers_cache_timestamp';
const CACHE_DURATION_MS = 5 * 60 * 1000; // 5 minutes cache
const DUPLICATE_CLEANUP_INTERVAL_MS = 24 * 60 * 60 * 1000; // Run cleanup once per day
const LAST_DUPLICATE_CLEANUP_KEY = 'cuephoria_last_duplicate_cleanup';

// ✅ MEMORY CACHE (for current session)
let memoryCache: { customers: Customer[]; timestamp: number } | null = null;

export const useCustomers = (initialCustomers: Customer[]) => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const { toast } = useToast();
  
  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        setIsLoading(true);
        
        // ✅ STEP 1: Check memory cache first (fastest)
        if (memoryCache && Date.now() - memoryCache.timestamp < CACHE_DURATION_MS) {
          console.log('📦 Using memory cache for customers');
          setCustomers(memoryCache.customers);
          setIsLoading(false);
          return;
        }
        
        // ✅ STEP 2: Check localStorage cache
        const cachedTimestamp = localStorage.getItem(CUSTOMERS_CACHE_TIMESTAMP_KEY);
        const cachedData = localStorage.getItem(CUSTOMERS_CACHE_KEY);
        
        if (cachedData && cachedTimestamp) {
          const cacheAge = Date.now() - parseInt(cachedTimestamp, 10);
          
          if (cacheAge < CACHE_DURATION_MS) {
            console.log('💾 Using localStorage cache for customers');
            const parsedCustomers = JSON.parse(cachedData);
            const customersWithDates = parsedCustomers.map((customer: any) => ({
              ...customer,
              customerId: customer.customerId || generateCustomerID(customer.phone),
              phone: normalizePhoneNumber(customer.phone),
              createdAt: new Date(customer.createdAt),
              membershipStartDate: customer.membershipStartDate ? new Date(customer.membershipStartDate) : undefined,
              membershipExpiryDate: customer.membershipExpiryDate ? new Date(customer.membershipExpiryDate) : undefined
            }));
            
            setCustomers(customersWithDates);
            memoryCache = { customers: customersWithDates, timestamp: Date.now() };
            setIsLoading(false);
            
            // ✅ Background refresh if cache is older than 2 minutes
            if (cacheAge > 2 * 60 * 1000) {
              fetchCustomersFromDB(true); // Silent background refresh
            }
            return;
          }
        }
        
        // ✅ STEP 3: Handle legacy localStorage migration
        const storedCustomers = localStorage.getItem('cuephoriaCustomers');
        if (storedCustomers) {
          const parsedCustomers = JSON.parse(storedCustomers);
          const customersWithDates = parsedCustomers.map((customer: any) => ({
            ...customer,
            customerId: customer.customerId || generateCustomerID(customer.phone),
            phone: normalizePhoneNumber(customer.phone),
            createdAt: new Date(customer.createdAt),
            membershipStartDate: customer.membershipStartDate ? new Date(customer.membershipStartDate) : undefined,
            membershipExpiryDate: customer.membershipExpiryDate ? new Date(customer.membershipExpiryDate) : undefined
          }));
          
          setCustomers(customersWithDates);
          localStorage.removeItem('cuephoriaCustomers');
          
          // Sync to database in background
          fetchCustomersFromDB(true);
          return;
        }
        
        // ✅ STEP 4: Fetch from database
        await fetchCustomersFromDB(false);
      } catch (error) {
        console.error('Error in fetchCustomers:', error);
        toast({
          title: 'Error',
          description: 'Failed to load customers',
          variant: 'destructive'
        });
        setCustomers([]);
        setIsLoading(false);
      }
    };
    
    const fetchCustomersFromDB = async (silent: boolean = false) => {
      try {
        if (!silent) setIsLoading(true);
        
        // ✅ OPTIMIZED: Select only needed columns (reduces data transfer)
        const selectFields = 'id,customer_id,custom_id,name,phone,email,is_member,membership_expiry_date,membership_start_date,membership_plan,membership_hours_left,membership_duration,loyalty_points,total_spent,total_play_time,created_at';
        
        // Fetch all customers using pagination
        let page = 0;
        const pageSize = 1000;
        let allCustomersData: any[] = [];
        let finished = false;

        while (!finished) {
          const { data, error } = await supabase
            .from('customers')
            .select(selectFields) // ✅ Only fetch needed columns
            .order('created_at', { ascending: false })
            .range(page * pageSize, (page + 1) * pageSize - 1);
          
          if (error) {
            console.error('Error fetching customers:', error);
            if (!silent) {
              toast({
                title: 'Database Error',
                description: 'Failed to fetch customers from database',
                variant: 'destructive'
              });
            }
            return;
          }
        
          if (data && data.length > 0) {
            allCustomersData = [...allCustomersData, ...data];
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
            customerId: (item as any).customer_id || generateCustomerID(item.phone),
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
          
          // ✅ OPTIMIZED: Run duplicate cleanup only once per day
          const lastCleanup = localStorage.getItem(LAST_DUPLICATE_CLEANUP_KEY);
          const shouldRunCleanup = !lastCleanup || (Date.now() - parseInt(lastCleanup, 10)) > DUPLICATE_CLEANUP_INTERVAL_MS;
          
          if (shouldRunCleanup) {
            console.log('🔧 Running scheduled duplicate cleanup...');
            const { cleaned, merged } = await cleanupDuplicates(transformedCustomers);
            
            if (cleaned > 0) {
              // Re-fetch only if duplicates were cleaned
              page = 0;
              allCustomersData = [];
              finished = false;
              
              while (!finished) {
                const { data, error } = await supabase
                  .from('customers')
                  .select(selectFields)
                  .order('created_at', { ascending: false })
                  .range(page * pageSize, (page + 1) * pageSize - 1);
                  
                if (error) {
                  console.error('Error re-fetching customers after cleanup:', error);
                  break;
                }
                
                if (data && data.length > 0) {
                  allCustomersData = [...allCustomersData, ...data];
                  if (data.length < pageSize) {
                    finished = true;
                  } else {
                    page++;
                  }
                } else {
                  finished = true;
                }
              }
              
              // Transform again after cleanup
              const cleanedCustomers = allCustomersData.map(item => ({
                id: item.id,
                customerId: (item as any).customer_id || generateCustomerID(item.phone),
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
              
              setCustomers(cleanedCustomers);
              saveToCache(cleanedCustomers);
              
              if (!silent && cleaned > 0) {
                toast({
                  title: 'Duplicates Cleaned',
                  description: `Automatically merged ${cleaned} duplicate customer(s) into ${merged} account(s).`,
                  duration: 5000
                });
              }
              
              localStorage.setItem(LAST_DUPLICATE_CLEANUP_KEY, Date.now().toString());
            } else {
              setCustomers(transformedCustomers);
              saveToCache(transformedCustomers);
            }
          } else {
            setCustomers(transformedCustomers);
            saveToCache(transformedCustomers);
            console.log(`✅ Loaded ${transformedCustomers.length} customers from database (cleanup skipped - ran recently)`);
          }
        } else {
          setCustomers([]);
          saveToCache([]);
        }
      } catch (error) {
        console.error('Error fetching from DB:', error);
        if (!silent) {
          toast({
            title: 'Error',
            description: 'Failed to load customers',
            variant: 'destructive'
          });
        }
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchCustomers();
  }, []);
  
  // ✅ Shared cache save function
  const saveToCache = (customersList: Customer[]) => {
    try {
      memoryCache = { customers: customersList, timestamp: Date.now() };
      localStorage.setItem(CUSTOMERS_CACHE_KEY, JSON.stringify(customersList));
      localStorage.setItem(CUSTOMERS_CACHE_TIMESTAMP_KEY, Date.now().toString());
    } catch (error) {
      console.error('Error saving to cache:', error);
    }
  };
  
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
  
  // ✅ AUTOMATIC DUPLICATE CLEANUP: Merge duplicates (keep oldest, delete newer)
  const cleanupDuplicates = async (customersList: Customer[]): Promise<{ cleaned: number; merged: number }> => {
    try {
      const phoneMap = new Map<string, Customer[]>();
      const emailMap = new Map<string, Customer[]>();
      
      // Group by normalized phone
      customersList.forEach(customer => {
        const normalizedPhone = normalizePhoneNumber(customer.phone);
        if (!phoneMap.has(normalizedPhone)) {
          phoneMap.set(normalizedPhone, []);
        }
        phoneMap.get(normalizedPhone)!.push(customer);
      });
      
      // Group by normalized email (if exists)
      customersList.forEach(customer => {
        if (customer.email) {
          const normalizedEmail = customer.email.toLowerCase().trim();
          if (!emailMap.has(normalizedEmail)) {
            emailMap.set(normalizedEmail, []);
          }
          emailMap.get(normalizedEmail)!.push(customer);
        }
      });
      
      let cleaned = 0;
      let merged = 0;
      
      // Process phone duplicates
      for (const [phone, duplicates] of phoneMap.entries()) {
        if (duplicates.length > 1) {
          // Sort by created_at (oldest first)
          duplicates.sort((a, b) => 
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          );
          
          const keepCustomer = duplicates[0]; // Oldest
          const deleteCustomers = duplicates.slice(1); // Newer ones
          
          // Merge data: sum loyalty points, total spent, play time
          let mergedLoyaltyPoints = keepCustomer.loyaltyPoints;
          let mergedTotalSpent = keepCustomer.totalSpent;
          let mergedPlayTime = keepCustomer.totalPlayTime;
          let mergedIsMember = keepCustomer.isMember;
          let mergedMembershipPlan = keepCustomer.membershipPlan;
          let mergedMembershipHoursLeft = keepCustomer.membershipHoursLeft;
          let mergedMembershipExpiryDate = keepCustomer.membershipExpiryDate;
          let mergedMembershipStartDate = keepCustomer.membershipStartDate;
          let mergedEmail = keepCustomer.email || deleteCustomers.find(d => d.email)?.email;
          
          // Merge data from duplicates
          for (const dup of deleteCustomers) {
            mergedLoyaltyPoints += dup.loyaltyPoints;
            mergedTotalSpent += dup.totalSpent;
            mergedPlayTime += dup.totalPlayTime;
            
            // Keep membership if any has it
            if (dup.isMember && !mergedIsMember) {
              mergedIsMember = true;
              mergedMembershipPlan = dup.membershipPlan || mergedMembershipPlan;
              mergedMembershipHoursLeft = dup.membershipHoursLeft || mergedMembershipHoursLeft;
              mergedMembershipExpiryDate = dup.membershipExpiryDate || mergedMembershipExpiryDate;
              mergedMembershipStartDate = dup.membershipStartDate || mergedMembershipStartDate;
            }
            
            // Update related records to point to kept customer
            // Update bookings
            await supabase
              .from('bookings')
              .update({ customer_id: keepCustomer.id })
              .eq('customer_id', dup.id);
            
            // Update bills
            await supabase
              .from('bills')
              .update({ customer_id: keepCustomer.id })
              .eq('customer_id', dup.id);
            
            // Update sessions
            await supabase
              .from('sessions')
              .update({ customer_id: keepCustomer.id })
              .eq('customer_id', dup.id);
            
            // Delete duplicate customer
            await supabase
              .from('customers')
              .delete()
              .eq('id', dup.id);
            
            cleaned++;
          }
          
          // Update kept customer with merged data
          await supabase
            .from('customers')
            .update({
              loyalty_points: mergedLoyaltyPoints,
              total_spent: mergedTotalSpent,
              total_play_time: mergedPlayTime,
              is_member: mergedIsMember,
              membership_plan: mergedMembershipPlan,
              membership_hours_left: mergedMembershipHoursLeft,
              membership_expiry_date: mergedMembershipExpiryDate?.toISOString(),
              membership_start_date: mergedMembershipStartDate?.toISOString(),
              email: mergedEmail || null
            })
            .eq('id', keepCustomer.id);
          
          merged++;
        }
      }
      
      // Process email duplicates (only if not already handled by phone)
      for (const [email, duplicates] of emailMap.entries()) {
        if (duplicates.length > 1) {
          // Check if already processed by phone
          const normalizedPhones = duplicates.map(d => normalizePhoneNumber(d.phone));
          const uniquePhones = new Set(normalizedPhones);
          
          if (uniquePhones.size === duplicates.length) {
            // Different phones, same email - process separately
            duplicates.sort((a, b) => 
              new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
            );
            
            const keepCustomer = duplicates[0];
            const deleteCustomers = duplicates.slice(1);
            
            for (const dup of deleteCustomers) {
              // Update related records
              await supabase
                .from('bookings')
                .update({ customer_id: keepCustomer.id })
                .eq('customer_id', dup.id);
              
              await supabase
                .from('bills')
                .update({ customer_id: keepCustomer.id })
                .eq('customer_id', dup.id);
              
              await supabase
                .from('sessions')
                .update({ customer_id: keepCustomer.id })
                .eq('customer_id', dup.id);
              
              await supabase
                .from('customers')
                .delete()
                .eq('id', dup.id);
              
              cleaned++;
            }
            
            merged++;
          }
        }
      }
      
      if (cleaned > 0) {
        console.log(`✅ Cleaned up ${cleaned} duplicate customers, merged into ${merged} groups`);
      }
      
      return { cleaned, merged };
    } catch (error) {
      console.error('Error cleaning up duplicates:', error);
      return { cleaned: 0, merged: 0 };
    }
  };
  
  // ✅ UPDATED: Add customer with ID generation, phone normalization, and database duplicate check
  const addCustomer = async (customer: Omit<Customer, 'id' | 'createdAt'>) => {
    try {
      // Normalize phone
      const normalizedPhone = normalizePhoneNumber(customer.phone);
      
      // ✅ ENHANCED: Check database for duplicates before inserting
      const { data: existingByPhone } = await supabase
        .from('customers')
        .select('*')
        .eq('phone', normalizedPhone)
        .maybeSingle();
      
      if (existingByPhone) {
        const existingCustomer: Customer = {
          id: existingByPhone.id,
          customerId: (existingByPhone as any).customer_id || generateCustomerID(existingByPhone.phone),
          name: existingByPhone.name,
          phone: existingByPhone.phone,
          email: existingByPhone.email || undefined,
          isMember: existingByPhone.is_member,
          membershipExpiryDate: existingByPhone.membership_expiry_date ? new Date(existingByPhone.membership_expiry_date) : undefined,
          membershipStartDate: existingByPhone.membership_start_date ? new Date(existingByPhone.membership_start_date) : undefined,
          membershipPlan: existingByPhone.membership_plan || undefined,
          membershipHoursLeft: existingByPhone.membership_hours_left || undefined,
          membershipDuration: existingByPhone.membership_duration as 'weekly' | 'monthly' | undefined,
          loyaltyPoints: existingByPhone.loyalty_points,
          totalSpent: existingByPhone.total_spent,
          totalPlayTime: existingByPhone.total_play_time,
          createdAt: new Date(existingByPhone.created_at)
        };
        
        toast({
          title: 'Duplicate Customer',
          description: `Customer "${existingCustomer.name}" (${existingCustomer.customerId}) already exists with this phone number`,
          variant: 'destructive'
        });
        return existingCustomer;
      }
      
      // Check for duplicate email if provided
      if (customer.email && customer.email.trim() !== '') {
        const normalizedEmail = customer.email.toLowerCase().trim();
        const { data: existingByEmail } = await supabase
          .from('customers')
          .select('*')
          .eq('email', normalizedEmail)
          .maybeSingle();
        
        if (existingByEmail) {
          const existingCustomer: Customer = {
            id: existingByEmail.id,
            customerId: (existingByEmail as any).customer_id || generateCustomerID(existingByEmail.phone),
            name: existingByEmail.name,
            phone: existingByEmail.phone,
            email: existingByEmail.email || undefined,
            isMember: existingByEmail.is_member,
            membershipExpiryDate: existingByEmail.membership_expiry_date ? new Date(existingByEmail.membership_expiry_date) : undefined,
            membershipStartDate: existingByEmail.membership_start_date ? new Date(existingByEmail.membership_start_date) : undefined,
            membershipPlan: existingByEmail.membership_plan || undefined,
            membershipHoursLeft: existingByEmail.membership_hours_left || undefined,
            membershipDuration: existingByEmail.membership_duration as 'weekly' | 'monthly' | undefined,
            loyaltyPoints: existingByEmail.loyalty_points,
            totalSpent: existingByEmail.total_spent,
            totalPlayTime: existingByEmail.total_play_time,
            createdAt: new Date(existingByEmail.created_at)
          };
          
          toast({
            title: 'Duplicate Customer',
            description: `Customer "${existingCustomer.name}" (${existingCustomer.customerId}) already exists with this email`,
            variant: 'destructive'
          });
          return existingCustomer;
        }
      }
      
      // Check local state for duplicates (fallback)
      const { isDuplicate, existingCustomer } = isDuplicateCustomer(customer.phone, customer.email);
      
      if (isDuplicate && existingCustomer) {
        toast({
          title: 'Duplicate Customer',
          description: `Customer "${existingCustomer.name}" (${existingCustomer.customerId}) already exists`,
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
        // Handle duplicate key error
        if (error.code === '23505') {
          // Try to find existing customer
          const { data: existing } = await supabase
            .from('customers')
            .select('*')
            .eq('phone', normalizedPhone)
            .maybeSingle();
          
          if (existing) {
            const existingCustomer: Customer = {
              id: existing.id,
              customerId: (existing as any).customer_id || generateCustomerID(existing.phone),
              name: existing.name,
              phone: existing.phone,
              email: existing.email || undefined,
              isMember: existing.is_member,
              membershipExpiryDate: existing.membership_expiry_date ? new Date(existing.membership_expiry_date) : undefined,
              membershipStartDate: existing.membership_start_date ? new Date(existing.membership_start_date) : undefined,
              membershipPlan: existing.membership_plan || undefined,
              membershipHoursLeft: existing.membership_hours_left || undefined,
              membershipDuration: existing.membership_duration as 'weekly' | 'monthly' | undefined,
              loyaltyPoints: existing.loyalty_points,
              totalSpent: existing.total_spent,
              totalPlayTime: existing.total_play_time,
              createdAt: new Date(existing.created_at)
            };
            
            toast({
              title: 'Duplicate Customer',
              description: `Customer "${existingCustomer.name}" already exists with this phone number`,
              variant: 'destructive'
            });
            return existingCustomer;
          }
        }
        
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
          customerId: (data as any).customer_id, // ✅ Map customer_id
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

      // ✅ ENHANCED: Handle related data before deleting
      // Note: We don't delete bookings/bills/sessions as they are historical records
      // Instead, we set customer_id to null or keep them for historical purposes
      // But since bookings require customer_id (NOT NULL), we need to handle this
      
      // Check for bookings that would violate NOT NULL constraint
      const { data: bookings, error: bookingsError } = await supabase
        .from('bookings')
        .select('id')
        .eq('customer_id', id)
        .limit(1);
      
      if (bookingsError) {
        console.error('Error checking bookings:', bookingsError);
      } else if (bookings && bookings.length > 0) {
        toast({
          title: 'Cannot Delete Customer',
          description: 'This customer has bookings. Please delete or reassign bookings first.',
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
  
  // ✅ Cache invalidation helper
  const invalidateCache = () => {
    memoryCache = null;
    localStorage.removeItem(CUSTOMERS_CACHE_KEY);
    localStorage.removeItem(CUSTOMERS_CACHE_TIMESTAMP_KEY);
  };
  
  // ✅ Wrapper functions that invalidate cache on mutations
  const addCustomerWithCacheInvalidation = async (customer: Omit<Customer, 'id' | 'createdAt'>) => {
    const result = await addCustomer(customer);
    if (result) {
      invalidateCache();
      // Refresh customers in background
      setTimeout(() => {
        const fetchCustomers = async () => {
          const { data } = await supabase
            .from('customers')
            .select('id,customer_id,custom_id,name,phone,email,is_member,membership_expiry_date,membership_start_date,membership_plan,membership_hours_left,membership_duration,loyalty_points,total_spent,total_play_time,created_at')
            .order('created_at', { ascending: false })
            .limit(1);
          
          if (data && data.length > 0) {
            const newCustomer = {
              id: data[0].id,
              customerId: (data[0] as any).customer_id || generateCustomerID(data[0].phone),
              name: data[0].name,
              phone: data[0].phone,
              email: data[0].email || undefined,
              isMember: data[0].is_member,
              membershipExpiryDate: data[0].membership_expiry_date ? new Date(data[0].membership_expiry_date) : undefined,
              membershipStartDate: data[0].membership_start_date ? new Date(data[0].membership_start_date) : undefined,
              membershipPlan: data[0].membership_plan || undefined,
              membershipHoursLeft: data[0].membership_hours_left || undefined,
              membershipDuration: data[0].membership_duration as 'weekly' | 'monthly' | undefined,
              loyaltyPoints: data[0].loyalty_points,
              totalSpent: data[0].total_spent,
              totalPlayTime: data[0].total_play_time,
              createdAt: new Date(data[0].created_at)
            };
            setCustomers(prev => [newCustomer, ...prev]);
            saveToCache([newCustomer, ...customers]);
          }
        };
        fetchCustomers();
      }, 500);
    }
    return result;
  };
  
  const updateCustomerWithCacheInvalidation = async (customer: Customer) => {
    const result = await updateCustomer(customer);
    if (result) {
      invalidateCache();
      setCustomers(prev => prev.map(c => c.id === customer.id ? customer : c));
      saveToCache(customers.map(c => c.id === customer.id ? customer : c));
    }
    return result;
  };
  
  const deleteCustomerWithCacheInvalidation = async (id: string) => {
    await deleteCustomer(id);
    invalidateCache();
    const updatedCustomers = customers.filter(c => c.id !== id);
    saveToCache(updatedCustomers);
  };
  
  return {
    customers,
    setCustomers,
    selectedCustomer,
    setSelectedCustomer,
    addCustomer: addCustomerWithCacheInvalidation,
    updateCustomer: updateCustomerWithCacheInvalidation,
    updateCustomerMembership,
    deleteCustomer: deleteCustomerWithCacheInvalidation,
    selectCustomer,
    checkMembershipValidity,
    deductMembershipHours,
    isLoading,
    invalidateCache
  };
};
