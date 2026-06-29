import { useState, useEffect, useRef } from 'react';
import { Customer } from '@/types/pos.types';
import { supabase } from "@/integrations/supabase/client";
import { useToast } from '@/hooks/use-toast';
import { useLocation } from '@/context/LocationContext';
import { usePOSHydration } from '@/context/POSHydrationContext';
import {
  clearAllCustomerCaches,
  registerCustomerMemoryCacheClear,
} from '@/utils/tenantIsolation';
import { scopedTable } from '@/services/coreOpsClient';
import { computeMembershipExpiry } from '@/utils/membershipValidity.utils';

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

// ✅ CACHE CONFIGURATION — keys are per-location to prevent cross-branch cache hits
const customersCacheKey = (locationId: string | null) =>
  `cuephoria_customers_cache_${locationId ?? 'global'}`;
const customersTimestampKey = (locationId: string | null) =>
  `cuephoria_customers_cache_ts_${locationId ?? 'global'}`;
const CACHE_DURATION_MS = 10 * 60 * 1000; // 10 minutes cache (aligned with dataCache.ts)
const DUPLICATE_CLEANUP_INTERVAL_MS = 24 * 60 * 60 * 1000; // Run cleanup once per day
const LAST_DUPLICATE_CLEANUP_KEY = 'cuephoria_last_duplicate_cleanup';

type CustomerPageResult = {
  data: Record<string, unknown>[] | null;
  error: { message?: string; code?: string } | null;
};

/** Supabase read first (no Vercel CPU); server ops proxy as fallback. */
async function fetchCustomerPage(
  locationId: string,
  page: number,
  pageSize: number,
): Promise<CustomerPageResult> {
  const rangeFrom = page * pageSize;
  const rangeTo = (page + 1) * pageSize - 1;

  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .eq('location_id', locationId)
    .order('created_at', { ascending: false })
    .range(rangeFrom, rangeTo);

  if (!error) {
    return { data: (data ?? null) as Record<string, unknown>[] | null, error: null };
  }

  const opts = {
    order: { column: 'created_at', ascending: false },
    range: [rangeFrom, rangeTo] as [number, number],
  };

  const viaOps = await scopedTable('customers', locationId).select('*', opts);
  if (!viaOps.error) {
    const rows = viaOps.data;
    if (rows == null) return { data: [], error: null };
    return {
      data: (Array.isArray(rows) ? rows : [rows]) as Record<string, unknown>[],
      error: null,
    };
  }

  console.warn(
    '[customers] fetch failed (supabase + coreOps):',
    error.message,
    viaOps.error?.message,
  );

  return { data: null, error: { message: error.message } };
}

function mapCustomerRow(item: Record<string, unknown>): Customer {
  return {
    id: item.id as string,
    customerId:
      (item.customer_id as string) ||
      (item.custom_id as string) ||
      generateCustomerID(item.phone as string),
    name: item.name as string,
    phone: item.phone as string,
    email: (item.email as string) || undefined,
    isMember: Boolean(item.membership_tier_id) || Boolean(item.is_member),
    membershipTierId: (item.membership_tier_id as string) || undefined,
    cardBalance: Number(item.card_balance ?? 0),
    membershipExpiryDate: item.membership_expiry_date
      ? new Date(item.membership_expiry_date as string)
      : undefined,
    membershipStartDate: item.membership_start_date
      ? new Date(item.membership_start_date as string)
      : undefined,
    membershipPlan: (item.membership_plan as string) || undefined,
    membershipHoursLeft: (item.membership_hours_left as number) || undefined,
    membershipDuration: item.membership_duration as 'weekly' | 'monthly' | undefined,
    loyaltyPoints: item.loyalty_points as number,
    totalSpent: item.total_spent as number,
    totalPlayTime: item.total_play_time as number,
    createdAt: new Date(item.created_at as string),
  };
}

// ✅ MEMORY CACHE (per-location for current session)
const memoryCacheByLocation: Record<string, { customers: Customer[]; timestamp: number }> = {};

registerCustomerMemoryCacheClear(() => {
  for (const key of Object.keys(memoryCacheByLocation)) {
    delete memoryCacheByLocation[key];
  }
});

export function clearCustomerSessionCache(): void {
  clearAllCustomerCaches();
}

export const useCustomers = (initialCustomers: Customer[]) => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const { toast } = useToast();
  const { activeLocationId, loading: locationsLoading, locationResolved } = useLocation();
  const { loadCustomers: hydrateCustomers } = usePOSHydration();
  
  // Stable ref so the realtime handler can always call the latest fetchCustomersFromDB
  // without creating a circular dependency on useCallback deps.
  const fetchFromDBRef = useRef<((silent: boolean) => Promise<void>) | null>(null);
  const activeBranchRef = useRef<string | null>(null);
  activeBranchRef.current = activeLocationId;

  useEffect(() => {
    if (locationsLoading || !locationResolved) {
      setCustomers([]);
      setSelectedCustomer(null);
      setIsLoading(locationsLoading || !locationResolved);
      return;
    }

    if (!hydrateCustomers) {
      setCustomers([]);
      setIsLoading(false);
      return;
    }

    if (!activeLocationId) {
      setCustomers([]);
      setIsLoading(false);
      return;
    }

    // Clear customers when branch changes so stale data is never shown
    setCustomers([]);
    setSelectedCustomer(null);

    const fetchCustomers = async () => {
      try {
        setIsLoading(true);

        const locKey = activeLocationId;
        const memCache = memoryCacheByLocation[locKey];

        // ✅ STEP 1: Check memory cache first (fastest)
        if (memCache && Date.now() - memCache.timestamp < CACHE_DURATION_MS) {
          console.log('📦 Using memory cache for customers');
          setCustomers(memCache.customers);
          setIsLoading(false);
          return;
        }
        
        // ✅ STEP 2: Check localStorage cache
        const cachedTimestamp = localStorage.getItem(customersTimestampKey(activeLocationId));
        const cachedData = localStorage.getItem(customersCacheKey(activeLocationId));
        
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
            memoryCacheByLocation[locKey] = { customers: customersWithDates, timestamp: Date.now() };
            setIsLoading(false);
            
            // ✅ Background refresh if cache is older than 2 minutes
            if (cacheAge > 2 * 60 * 1000) {
              fetchCustomersFromDB(true); // Silent background refresh
            }
            return;
          }
        }

        // ✅ Fetch from database (legacy unscoped localStorage removed — cross-tenant risk)
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

        if (!activeLocationId) {
          setCustomers([]);
          setIsLoading(false);
          return;
        }
        
        const fetchCustomersPage = (page: number, pageSize: number) =>
          fetchCustomerPage(activeLocationId, page, pageSize);

        // Fetch all customers using parallel page batches
        let page = 0;
        const pageSize = 1000;
        const PARALLEL_PAGES = 1;
        let allCustomersData: any[] = [];
        let finished = false;
        let firstBatchPainted = false;

        while (!finished) {
          const pagesToFetch: number[] = [];
          for (let i = 0; i < PARALLEL_PAGES; i++) {
            pagesToFetch.push(page + i);
          }

          const results = await Promise.all(pagesToFetch.map(p => fetchCustomersPage(p, pageSize)));
          const batchError = results.find(r => r.error)?.error;
          if (batchError) {
            console.error('Error fetching customers:', batchError);
            if (!silent) {
              toast({
                title: 'Database Error',
                description: 'Failed to fetch customers from database',
                variant: 'destructive'
              });
            }
            return;
          }

          let batchRows: any[] = [];
          for (let i = 0; i < results.length; i++) {
            const data = results[i].data;
            if (!data || data.length === 0) {
              finished = true;
              break;
            }
            batchRows = batchRows.concat(data);
            if (data.length < pageSize) {
              finished = true;
              break;
            }
          }

          if (batchRows.length === 0) {
            finished = true;
            break;
          }

          allCustomersData = allCustomersData.concat(batchRows);

          // Progressive paint: show first batch immediately so Stations/POS aren't blocked.
          if (!firstBatchPainted) {
            firstBatchPainted = true;
            if (activeBranchRef.current !== activeLocationId) return;
            setCustomers(batchRows.map(mapCustomerRow));
            if (!silent) setIsLoading(false);
          }

          page += pagesToFetch.length;
        }
        
        if (allCustomersData.length > 0) {
          if (activeBranchRef.current !== activeLocationId) return;
          const transformedCustomers = allCustomersData.map(mapCustomerRow);

          setCustomers(transformedCustomers);
          saveToCache(transformedCustomers);

          // ✅ Run duplicate cleanup at most once per day — never block first paint.
          // Cleanup does many sequential Supabase writes; awaiting it here left isLoading true
          // and froze shell routes until every merge finished.
          const lastCleanup = localStorage.getItem(LAST_DUPLICATE_CLEANUP_KEY);
          const shouldRunCleanup = !lastCleanup || (Date.now() - parseInt(lastCleanup, 10)) > DUPLICATE_CLEANUP_INTERVAL_MS;

          if (shouldRunCleanup) {
            const branchWhenCleanupStarted = activeLocationId;
            void (async () => {
              try {
                console.log('🔧 Running scheduled duplicate cleanup…');
                const { cleaned, merged } = await cleanupDuplicates(transformedCustomers);

                if (cleaned <= 0) return;

                if (branchWhenCleanupStarted !== activeBranchRef.current) {
                  console.warn('[customers] skipped post-cleanup refresh (branch changed)');
                  return;
                }

                let p = 0;
                let refetchRows: any[] = [];
                let done = false;
                while (!done) {
                  const { data, error } = await fetchCustomerPage(
                    branchWhenCleanupStarted,
                    p,
                    pageSize,
                  );

                  if (error) {
                    console.error('Error re-fetching customers after cleanup:', error);
                    break;
                  }

                  if (data && data.length > 0) {
                    refetchRows = [...refetchRows, ...data];
                    if (data.length < pageSize) {
                      done = true;
                    } else {
                      p++;
                    }
                  } else {
                    done = true;
                  }
                }

                const cleanedCustomers = refetchRows.map((item) =>
                  mapCustomerRow(item as Record<string, unknown>),
                );

                if (branchWhenCleanupStarted !== activeBranchRef.current) return;

                setCustomers(cleanedCustomers);
                saveToCache(cleanedCustomers);

                if (!silent) {
                  toast({
                    title: 'Duplicates Cleaned',
                    description: `Automatically merged ${cleaned} duplicate customer(s) into ${merged} account(s).`,
                    duration: 5000
                  });
                }
              } catch (cleanupErr) {
                console.error('Scheduled duplicate cleanup failed:', cleanupErr);
              } finally {
                try {
                  localStorage.setItem(LAST_DUPLICATE_CLEANUP_KEY, Date.now().toString());
                } catch {
                  /* ignore quota / private mode */
                }
              }
            })();
          } else {
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
    
    // Expose the latest fetchCustomersFromDB for the realtime subscriber below
    fetchFromDBRef.current = fetchCustomersFromDB;

    fetchCustomers();
  }, [activeLocationId, hydrateCustomers, locationsLoading, locationResolved]);
  
  // ✅ Shared cache save function (per-location)
  const saveToCache = (customersList: Customer[]) => {
    if (!activeLocationId) return;
    try {
      memoryCacheByLocation[activeLocationId] = { customers: customersList, timestamp: Date.now() };
      localStorage.setItem(customersCacheKey(activeLocationId), JSON.stringify(customersList));
      localStorage.setItem(customersTimestampKey(activeLocationId), Date.now().toString());
    } catch (error) {
      console.error('Error saving to cache:', error);
    }
  };
  
  // ✅ REALTIME: subscribe to customer changes for the active location.
  // When any INSERT / UPDATE / DELETE lands in the DB for this location_id, bust
  // the local caches and silently re-fetch so every device stays in sync.
  useEffect(() => {
    if (!activeLocationId || !hydrateCustomers) return;

    const locKey = activeLocationId;

    let refreshTimeout: ReturnType<typeof setTimeout> | null = null;

    const channel = supabase
      .channel(`customers-realtime-${locKey}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'customers',
          filter: `location_id=eq.${locKey}`,
        },
        () => {
          if (refreshTimeout) clearTimeout(refreshTimeout);
          refreshTimeout = setTimeout(() => {
            delete memoryCacheByLocation[locKey];
            localStorage.removeItem(customersCacheKey(locKey));
            localStorage.removeItem(customersTimestampKey(locKey));
            fetchFromDBRef.current?.(true);
          }, 2000);
        }
      )
      .subscribe();

    return () => {
      if (refreshTimeout) clearTimeout(refreshTimeout);
      supabase.removeChannel(channel);
    };
  }, [activeLocationId, hydrateCustomers]);

  // Membership expiry — clear tier only for customers whose period just ended (not all non-members).
  const expirySyncedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!customers.length) return;

    const now = new Date();
    const toExpire: string[] = [];

    for (const customer of customers) {
      if (!customer.isMember || !customer.membershipExpiryDate) continue;
      if (new Date(customer.membershipExpiryDate) >= now) continue;
      if (expirySyncedRef.current.has(customer.id)) continue;
      toExpire.push(customer.id);
    }

    if (toExpire.length === 0) return;

    setCustomers((prev) =>
      prev.map((c) =>
        toExpire.includes(c.id)
          ? { ...c, isMember: false, membershipTierId: undefined }
          : c,
      ),
    );

    void (async () => {
      for (const id of toExpire) {
        expirySyncedRef.current.add(id);
        const { error } = await supabase
          .from('customers')
          .update({
            membership_tier_id: null,
            membership_expiry_date: null,
          })
          .eq('id', id);
        if (error) {
          expirySyncedRef.current.delete(id);
          console.warn(`[customers] expiry sync failed for ${id}:`, error.message);
        }
      }
    })();
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
          let mergedTierId = keepCustomer.membershipTierId;
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
              mergedTierId = dup.membershipTierId || mergedTierId;
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
              membership_tier_id: mergedTierId ?? null,
              membership_hours_left: mergedMembershipHoursLeft,
              membership_expiry_date: mergedMembershipExpiryDate?.toISOString(),
              membership_start_date: mergedMembershipStartDate?.toISOString(),
              email: mergedEmail || null,
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
      
      // ✅ ENHANCED: Check database for duplicates before inserting (scoped to this branch)
      const { data: existingByPhone } = await supabase
        .from('customers')
        .select('*')
        .eq('phone', normalizedPhone)
        .eq('location_id', activeLocationId)
        .maybeSingle();
      
      if (existingByPhone) {
        const existingCustomer = mapCustomerRow(existingByPhone as Record<string, unknown>);
        
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
          .eq('location_id', activeLocationId)
          .maybeSingle();
        
        if (existingByEmail) {
          const existingCustomer = mapCustomerRow(existingByEmail as Record<string, unknown>);
          
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
          custom_id: customerID,
          customer_id: customerID,
          name: customer.name,
          phone: normalizedPhone,
          email: customer.email,
          membership_tier_id: customer.membershipTierId ?? null,
          membership_expiry_date: customer.membershipExpiryDate?.toISOString(),
          membership_start_date: customer.membershipStartDate?.toISOString(),
          membership_hours_left: customer.membershipHoursLeft,
          membership_duration: customer.membershipDuration,
          loyalty_points: customer.loyaltyPoints || 0,
          total_spent: customer.totalSpent || 0,
          total_play_time: customer.totalPlayTime || 0,
          location_id: activeLocationId,
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
            .eq('location_id', activeLocationId)
            .maybeSingle();
          
          if (existing) {
            const existingCustomer = mapCustomerRow(existing as Record<string, unknown>);
            
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
        const newCustomer = mapCustomerRow(data as Record<string, unknown>);
        
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
  
  const updateCustomerMembership = async (
    customerId: string,
    membershipData: {
      membershipPlan?: string;
      membershipDuration?: string;
      membershipHoursLeft?: number;
      membershipTierId?: string;
      membershipExpiryDate?: string | null;
      membershipStartDate?: string;
      validityOverride?: import('@/utils/membershipValidity.utils').MembershipValidityOverride;
      tier?: import('@/types/membership.types').MembershipTier;
    },
  ) => {
    const customer = customers.find((c) => c.id === customerId);
    if (!customer) return null;

    const now = new Date();
    const membershipStartDate = membershipData.membershipStartDate
      ? new Date(membershipData.membershipStartDate)
      : now;

    let membershipExpiryDate: Date | null | undefined = membershipData.membershipExpiryDate
      ? new Date(membershipData.membershipExpiryDate)
      : undefined;
    let membershipDuration = membershipData.membershipDuration;

    if (membershipData.membershipTierId && membershipData.tier) {
      const { expiryDate, durationLabel } = computeMembershipExpiry(
        membershipStartDate,
        membershipData.tier,
        membershipData.validityOverride ?? { mode: 'tier_default' },
      );
      if (membershipExpiryDate === undefined) {
        membershipExpiryDate = expiryDate;
      }
      membershipDuration = membershipDuration ?? durationLabel;
    } else if (membershipExpiryDate === undefined) {
      membershipExpiryDate = new Date(membershipStartDate);
      if (membershipData.membershipDuration === 'weekly') {
        membershipExpiryDate.setDate(membershipExpiryDate.getDate() + 7);
      } else if (membershipData.membershipDuration === 'monthly') {
        membershipExpiryDate.setMonth(membershipExpiryDate.getMonth() + 1);
      }
    }

    if (membershipData.membershipTierId) {
      try {
        const { assignMembershipTier } = await import('@/services/membershipService');
        await assignMembershipTier({
          customerId,
          tierId: membershipData.membershipTierId,
          membershipStartDate: membershipStartDate.toISOString(),
          membershipExpiryDate: membershipExpiryDate?.toISOString() ?? null,
          membershipDuration: membershipDuration ?? membershipData.membershipDuration ?? null,
          membershipHoursLeft: membershipData.membershipHoursLeft ?? null,
        });
      } catch (err) {
        console.error('assignMembershipTier failed:', err);
      }
    }

    const updatedCustomer: Customer = {
      ...customer,
      isMember: true,
      membershipTierId: membershipData.membershipTierId || customer.membershipTierId,
      membershipTierName: membershipData.membershipPlan || customer.membershipTierName,
      membershipDuration: membershipDuration || customer.membershipDuration,
      membershipHoursLeft:
        membershipData.membershipHoursLeft !== undefined
          ? membershipData.membershipHoursLeft
          : customer.membershipHoursLeft,
      membershipStartDate,
      membershipExpiryDate: membershipExpiryDate ?? undefined,
    };

    const result = await updateCustomer(updatedCustomer);

    toast({
      title: 'Membership Updated',
      description: `${customer.name}'s membership has been updated successfully.`,
      variant: 'default',
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
        membership_tier_id: customer.membershipTierId ?? null,
        card_balance: customer.cardBalance ?? 0,
        membership_expiry_date: customer.membershipExpiryDate?.toISOString(),
        membership_start_date: customer.membershipStartDate?.toISOString(),
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
  
  // ✅ Cache invalidation helper (current location only)
  const invalidateCache = () => {
    const locKey = activeLocationId ?? 'global';
    delete memoryCacheByLocation[locKey];
    localStorage.removeItem(customersCacheKey(activeLocationId));
    localStorage.removeItem(customersTimestampKey(activeLocationId));
  };
  
  // ✅ Wrapper functions that invalidate cache on mutations
  const addCustomerWithCacheInvalidation = async (customer: Omit<Customer, 'id' | 'createdAt'>) => {
    const result = await addCustomer(customer);
    if (result) {
      invalidateCache();
      // Refresh customers in background
      setTimeout(() => {
        const fetchLatest = async () => {
          if (!activeLocationId) return;
          const { data, error } = await fetchCustomerPage(activeLocationId, 0, 1);
          if (error || !data?.length) return;

          const newCustomer = mapCustomerRow(data[0]);
          setCustomers(prev => [newCustomer, ...prev]);
          saveToCache([newCustomer, ...customers]);
        };
        fetchLatest();
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
