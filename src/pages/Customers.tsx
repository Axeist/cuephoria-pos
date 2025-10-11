import React, { useState, useEffect } from 'react';
import { Plus, User, Search, Download, ArrowUpDown, ArrowUp, ArrowDown, ChevronDown, Filter, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { usePOS, Customer } from '@/context/POSContext';
import CustomerCard from '@/components/CustomerCard';
import CustomerInsightWidgets from '@/components/customers/CustomerInsightWidgets';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

type SortField = 'joinDate' | 'totalSpent' | 'loyaltyPoints' | 'playTime';
type SortDirection = 'asc' | 'desc';

interface FilterState {
  membershipStatus: 'all' | 'member' | 'non-member' | 'active' | 'expired';
  loyaltyPointsMin: number;
  loyaltyPointsMax: number;
  joinDateFrom: string;
  joinDateTo: string;
}

const normalizePhoneNumber = (phone: string): string => {
  return phone.replace(/\D/g, '');
};

const generateCustomerID = (phone: string): string => {
  const normalized = normalizePhoneNumber(phone);
  const timestamp = Date.now().toString(36).slice(-4).toUpperCase();
  const phoneHash = normalized.slice(-4);
  return `CUE${phoneHash}${timestamp}`;
};

const Customers = () => {
  const [error, setError] = useState<string | null>(null);
  const [customersData, setCustomersData] = useState<Customer[]>([]);
  const [isContextLoaded, setIsContextLoaded] = useState(false);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [emailError, setEmailError] = useState('');

  const [sortField, setSortField] = useState<SortField>('joinDate');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const [filters, setFilters] = useState<FilterState>({
    membershipStatus: 'all',
    loyaltyPointsMin: 0,
    loyaltyPointsMax: 10000,
    joinDateFrom: '',
    joinDateTo: ''
  });
  const [showFilters, setShowFilters] = useState(false);

  const [showDuplicateDialog, setShowDuplicateDialog] = useState(false);
  const [duplicates, setDuplicates] = useState<Array<{ phone: string; customers: Customer[] }>>([]);

  const [formState, setFormState] = useState({
    name: '',
    phone: '',
    email: '',
    isMember: false,
    membershipExpiryDate: '',
    membershipHoursLeft: ''
  });
  
  const { toast } = useToast();

  let posContext;
  try {
    posContext = usePOS();
  } catch (e) {
    console.error('Error using POS context:', e);
    const errorMessage = e instanceof Error ? e.message : 'Unknown error';
    if (error !== errorMessage) {
      setError(errorMessage);
    }
    posContext = null;
  }

  const {
    customers = [],
    updateCustomer = () => {},
    deleteCustomer = () => {},
    exportCustomers = () => {}
  } = posContext || {};

  useEffect(() => {
    if (posContext && customers) {
      setCustomersData(customers);
      setIsContextLoaded(true);
    }
  }, [posContext, customers]);

  useEffect(() => {
    if (customersData.length > 0) {
      findDuplicates();
    }
  }, [customersData]);

  const resetForm = () => {
    setFormState({
      name: '',
      phone: '',
      email: '',
      isMember: false,
      membershipExpiryDate: '',
      membershipHoursLeft: ''
    });
    setPhoneError('');
    setEmailError('');
    setIsEditMode(false);
    setSelectedCustomer(null);
  };

  const handleOpenDialog = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const handleEditCustomer = (customer: Customer) => {
    setIsEditMode(true);
    setSelectedCustomer(customer);

    const expiryDate = customer.membershipExpiryDate ? new Date(customer.membershipExpiryDate).toISOString().split('T')[0] : '';
    setFormState({
      name: customer.name,
      phone: customer.phone,
      email: customer.email || '',
      isMember: customer.isMember,
      membershipExpiryDate: expiryDate,
      membershipHoursLeft: customer.membershipHoursLeft !== undefined ? customer.membershipHoursLeft.toString() : ''
    });
    setIsDialogOpen(true);
  };

  const handleDeleteCustomer = (id: string) => {
    deleteCustomer(id);
    toast({
      title: 'Customer Deleted',
      description: 'The customer has been removed successfully.'
    });
  };

  const checkForDuplicates = (): boolean => {
    setPhoneError('');
    setEmailError('');
    let hasDuplicates = false;
    
    const currentId = isEditMode && selectedCustomer ? selectedCustomer.id : null;
    const normalizedPhone = normalizePhoneNumber(formState.phone);
    
    const duplicatePhone = customersData.find(c => {
      const existingNormalizedPhone = normalizePhoneNumber(c.phone);
      return existingNormalizedPhone === normalizedPhone && c.id !== currentId;
    });
    
    if (duplicatePhone) {
      setPhoneError(`This phone number is already registered (Customer: ${duplicatePhone.name} - ${duplicatePhone.customerId})`);
      hasDuplicates = true;
    }
    
    if (formState.email && formState.email.trim() !== '') {
      const normalizedEmail = formState.email.toLowerCase().trim();
      const duplicateEmail = customersData.find(c => {
        const existingEmail = c.email?.toLowerCase().trim();
        return existingEmail === normalizedEmail && c.id !== currentId;
      });
      
      if (duplicateEmail) {
        setEmailError(`This email is already registered (Customer: ${duplicateEmail.name} - ${duplicateEmail.customerId})`);
        hasDuplicates = true;
      }
    }
    
    return hasDuplicates;
  };

  // ✅ FIXED: Using custom_id (not customer_id)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { name, phone, email, isMember, membershipExpiryDate, membershipHoursLeft } = formState;
    
    if (!name || !phone) {
      toast({
        title: 'Error',
        description: 'Name and phone are required',
        variant: 'destructive'
      });
      return;
    }

    const normalizedPhone = normalizePhoneNumber(phone);
    
    if (normalizedPhone.length !== 10) {
      setPhoneError('Phone number must be exactly 10 digits');
      return;
    }

    const phoneRegex = /^[6-9]\d{9}$/;
    if (!phoneRegex.test(normalizedPhone)) {
      setPhoneError('Please enter a valid Indian mobile number (starting with 6, 7, 8, or 9)');
      return;
    }
    
    if (checkForDuplicates()) {
      toast({
        title: 'Duplicate Entry Detected',
        description: 'A customer with this phone number or email already exists',
        variant: 'destructive'
      });
      return;
    }

    const customerID = isEditMode && selectedCustomer?.customerId 
      ? selectedCustomer.customerId 
      : generateCustomerID(normalizedPhone);

    try {
      if (isEditMode && selectedCustomer) {
        // ✅ Update with correct field name: custom_id
        const updateData: any = {
          name: name.trim(),
          phone: normalizedPhone,
          email: email?.trim() || null,
          custom_id: customerID,          // ✅ FIXED: custom_id
          is_member: isMember
        };

        if (isMember) {
          if (membershipExpiryDate) {
            updateData.membership_expiry_date = new Date(membershipExpiryDate).toISOString();
          }
          if (membershipHoursLeft) {
            updateData.membership_hours_left = parseInt(membershipHoursLeft, 10);
          }
        }

        const { error: updateError } = await supabase
          .from('customers')
          .update(updateData)
          .eq('id', selectedCustomer.id);

        if (updateError) {
          console.error('Supabase update error:', updateError);
          throw updateError;
        }

        toast({
          title: 'Customer Updated',
          description: `Customer ${customerID} has been updated successfully.`
        });

        window.location.reload();
      } else {
        // ✅ Insert with correct field name: custom_id
        const insertData: any = {
          name: name.trim(),
          phone: normalizedPhone,
          email: email?.trim() || null,
          custom_id: customerID,          // ✅ FIXED: custom_id
          is_member: isMember,
          loyalty_points: 0,
          total_spent: 0,
          total_play_time: 0
        };

        if (isMember) {
          if (membershipExpiryDate) {
            insertData.membership_expiry_date = new Date(membershipExpiryDate).toISOString();
          }
          if (membershipHoursLeft) {
            insertData.membership_hours_left = parseInt(membershipHoursLeft, 10);
          }
        }

        console.log('Inserting data:', insertData);

        const { data, error: insertError } = await supabase
          .from('customers')
          .insert([insertData])
          .select('*')
          .single();

        if (insertError) {
          console.error('Supabase insert error:', insertError);
          throw insertError;
        }

        toast({
          title: 'Customer Added',
          description: `Customer ${customerID} has been added successfully.`
        });

        window.location.reload();
      }
      
      setIsDialogOpen(false);
      resetForm();
    } catch (error: any) {
      console.error('Error saving customer:', error);
      toast({
        title: 'Database Error',
        description: error.message || 'Failed to save customer to database',
        variant: 'destructive'
      });
    }
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const normalized = normalizePhoneNumber(value);
    
    if (normalized.length <= 10) {
      setFormState(prev => ({
        ...prev,
        phone: normalized
      }));
    }
    
    setPhoneError('');
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormState(prev => ({
      ...prev,
      [name]: value
    }));
    
    if (name === 'email') setEmailError('');
  };

  const handleSwitchChange = (checked: boolean) => {
    setFormState(prev => ({
      ...prev,
      isMember: checked
    }));
  };

  const findDuplicates = () => {
    const phoneMap = new Map<string, Customer[]>();
    
    customersData.forEach(customer => {
      const normalizedPhone = normalizePhoneNumber(customer.phone);
      if (!phoneMap.has(normalizedPhone)) {
        phoneMap.set(normalizedPhone, []);
      }
      phoneMap.get(normalizedPhone)!.push(customer);
    });

    const duplicateGroups = Array.from(phoneMap.entries())
      .filter(([_, customers]) => customers.length > 1)
      .map(([phone, customers]) => ({
        phone,
        customers: customers.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      }));

    setDuplicates(duplicateGroups);
    
    if (duplicateGroups.length > 0) {
      console.log(`Found ${duplicateGroups.length} duplicate phone number groups`);
    }
  };

  const resolveDuplicate = (phoneGroup: { phone: string; customers: Customer[] }, keepCustomerId: string) => {
    const toDelete = phoneGroup.customers.filter(c => c.id !== keepCustomerId);
    
    toDelete.forEach(customer => {
      deleteCustomer(customer.id);
    });

    toast({
      title: 'Duplicates Removed',
      description: `Removed ${toDelete.length} duplicate customer(s) for phone ${phoneGroup.phone}`
    });

    findDuplicates();
  };

  const applyFilters = (customer: Customer): boolean => {
    if (filters.membershipStatus !== 'all') {
      const isActive = customer.isMember && customer.membershipExpiryDate && new Date(customer.membershipExpiryDate) > new Date();
      
      switch (filters.membershipStatus) {
        case 'member':
          if (!customer.isMember) return false;
          break;
        case 'non-member':
          if (customer.isMember) return false;
          break;
        case 'active':
          if (!isActive) return false;
          break;
        case 'expired':
          if (!customer.isMember || isActive) return false;
          break;
      }
    }

    if (customer.loyaltyPoints < filters.loyaltyPointsMin || customer.loyaltyPoints > filters.loyaltyPointsMax) {
      return false;
    }

    const joinDate = new Date(customer.createdAt);
    if (filters.joinDateFrom && new Date(filters.joinDateFrom) > joinDate) {
      return false;
    }
    if (filters.joinDateTo && new Date(filters.joinDateTo) < joinDate) {
      return false;
    }

    return true;
  };

  const resetFilters = () => {
    setFilters({
      membershipStatus: 'all',
      loyaltyPointsMin: 0,
      loyaltyPointsMax: 10000,
      joinDateFrom: '',
      joinDateTo: ''
    });
  };

  const getActiveFilterCount = (): number => {
    let count = 0;
    if (filters.membershipStatus !== 'all') count++;
    if (filters.loyaltyPointsMin > 0) count++;
    if (filters.loyaltyPointsMax < 10000) count++;
    if (filters.joinDateFrom) count++;
    if (filters.joinDateTo) count++;
    return count;
  };

  const sortCustomers = (customers: Customer[]) => {
    return [...customers].sort((a, b) => {
      let comparison = 0;
      
      switch (sortField) {
        case 'joinDate':
          comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
        case 'totalSpent':
          comparison = a.totalSpent - b.totalSpent;
          break;
        case 'loyaltyPoints':
          comparison = a.loyaltyPoints - b.loyaltyPoints;
          break;
        case 'playTime':
          comparison = a.totalPlayTime - b.totalPlayTime;
          break;
        default:
          return 0;
      }
      
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="h-4 w-4" />;
    }
    return sortDirection === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />;
  };

  const getCurrentSortLabel = () => {
    const fieldLabels = {
      joinDate: 'Join Date',
      totalSpent: 'Total Spent',
      loyaltyPoints: 'Loyalty Points',
      playTime: 'Play Time'
    };
    const directionLabel = sortDirection === 'asc' ? '↑' : '↓';
    return `${fieldLabels[sortField]} ${directionLabel}`;
  };

  const filteredAndSortedCustomers = sortCustomers(
    customersData
      .filter(customer => {
        if (searchQuery.trim() !== '') {
          const query = searchQuery.toLowerCase();
          const normalizedSearchPhone = normalizePhoneNumber(searchQuery);
          const normalizedCustomerPhone = normalizePhoneNumber(customer.phone);
          
          const matchesSearch = 
            customer.name.toLowerCase().includes(query) || 
            normalizedCustomerPhone.includes(normalizedSearchPhone) ||
            customer.email?.toLowerCase().includes(query) ||
            customer.customerId?.toLowerCase().includes(query);
          
          if (!matchesSearch) return false;
        }
        
        return applyFilters(customer);
      })
  );

  if (error) {
    return (
      <div className="flex-1 space-y-4 p-8 pt-6">
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-bold tracking-tight gradient-text font-heading">Customers</h2>
        </div>
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
          <strong className="font-bold">Error: </strong>
          <span className="block sm:inline">{error}</span>
          <p className="mt-2">Please try refreshing the page or contact support if the issue persists.</p>
        </div>
      </div>
    );
  }

  const activeFilterCount = getActiveFilterCount();

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight gradient-text font-heading">Customers</h2>
        <div className="flex space-x-2">
          {duplicates.length > 0 && (
            <Button 
              variant="outline" 
              onClick={() => setShowDuplicateDialog(true)}
              className="border-orange-500 text-orange-500 hover:bg-orange-500 hover:text-white"
            >
              <User className="h-4 w-4 mr-2" /> 
              Fix Duplicates ({duplicates.length})
            </Button>
          )}
          
          <Button variant="outline" onClick={exportCustomers}>
            <Download className="h-4 w-4 mr-2" /> Export
          </Button>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                Sort: {getCurrentSortLabel()}
                <ChevronDown className="h-4 w-4 ml-2" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => handleSort('joinDate')} className="flex items-center justify-between">
                <span>Join Date</span>
                {getSortIcon('joinDate')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleSort('totalSpent')} className="flex items-center justify-between">
                <span>Total Spent</span>
                {getSortIcon('totalSpent')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleSort('loyaltyPoints')} className="flex items-center justify-between">
                <span>Loyalty Points</span>
                {getSortIcon('loyaltyPoints')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleSort('playTime')} className="flex items-center justify-between">
                <span>Play Time</span>
                {getSortIcon('playTime')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          
          <Button onClick={handleOpenDialog}>
            <Plus className="h-4 w-4 mr-2" /> Add Customer
          </Button>
        </div>
      </div>

      <CustomerInsightWidgets customers={customersData} />

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isEditMode ? 'Edit Customer' : 'Add New Customer'}</DialogTitle>
            <DialogDescription>
              Enter customer details and membership information if applicable.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Full Name *</Label>
                <Input 
                  id="name" 
                  name="name" 
                  value={formState.name} 
                  onChange={handleChange} 
                  placeholder="Enter customer name"
                  required
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="phone">Phone Number * (10 digits)</Label>
                <Input 
                  id="phone" 
                  name="phone" 
                  value={formState.phone} 
                  onChange={handlePhoneChange} 
                  placeholder="Enter 10-digit mobile number" 
                  className={phoneError ? "border-red-500" : ""}
                  maxLength={10}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Indian mobile number (starts with 6, 7, 8, or 9)
                </p>
                {phoneError && <p className="text-sm text-red-500 font-medium">{phoneError}</p>}
              </div>

              <div className="grid gap-2">
                <Label htmlFor="email">Email (Optional)</Label>
                <Input 
                  id="email" 
                  name="email" 
                  type="email" 
                  value={formState.email} 
                  onChange={handleChange} 
                  placeholder="Enter email address" 
                  className={emailError ? "border-red-500" : ""}
                />
                {emailError && <p className="text-sm text-red-500 font-medium">{emailError}</p>}
              </div>
              
              <div className="flex items-center space-x-2 pt-2">
                <Switch 
                  id="member" 
                  checked={formState.isMember} 
                  onCheckedChange={handleSwitchChange} 
                />
                <Label htmlFor="member">Is Member</Label>
              </div>
              
              {formState.isMember && (
                <div className="space-y-4 border rounded-md p-4 bg-background">
                  {isEditMode && selectedCustomer && selectedCustomer.membershipPlan && (
                    <div className="grid gap-2">
                      <Label htmlFor="membershipPlan">Current Membership</Label>
                      <Input 
                        id="membershipPlan" 
                        value={selectedCustomer.membershipPlan} 
                        readOnly 
                        className="bg-muted" 
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Membership can only be changed through purchase at checkout.
                      </p>
                    </div>
                  )}
                  
                  <div className="grid gap-2">
                    <Label htmlFor="membershipExpiryDate">Expiry Date</Label>
                    <Input 
                      id="membershipExpiryDate" 
                      name="membershipExpiryDate" 
                      type="date" 
                      value={formState.membershipExpiryDate} 
                      onChange={handleChange} 
                    />
                  </div>
                  
                  <div className="grid gap-2">
                    <Label htmlFor="membershipHoursLeft">Hours Left</Label>
                    <Input 
                      id="membershipHoursLeft" 
                      name="membershipHoursLeft" 
                      type="number" 
                      min="0" 
                      value={formState.membershipHoursLeft} 
                      onChange={handleChange} 
                      placeholder="Available hours" 
                    />
                  </div>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">
                {isEditMode ? 'Update Customer' : 'Add Customer'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={showDuplicateDialog} onOpenChange={setShowDuplicateDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Duplicate Customers Found</DialogTitle>
            <DialogDescription>
              Found {duplicates.length} phone number(s) with duplicate entries. Select which customer to keep for each group.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            {duplicates.map((dupGroup, groupIndex) => (
              <div key={groupIndex} className="border rounded-lg p-4 bg-muted/50">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold">Phone: {dupGroup.phone}</h3>
                  <Badge variant="destructive">{dupGroup.customers.length} Duplicates</Badge>
                </div>
                
                <div className="grid gap-3">
                  {dupGroup.customers.map((customer) => (
                    <div 
                      key={customer.id} 
                      className="flex items-center justify-between p-3 bg-background rounded-md border"
                    >
                      <div className="flex-1">
                        <p className="font-medium">{customer.name}</p>
                        <p className="text-sm text-muted-foreground">
                          ID: {customer.customerId || 'N/A'} | 
                          Joined: {new Date(customer.createdAt).toLocaleDateString('en-IN')} | 
                          Points: {customer.loyaltyPoints} | 
                          Spent: ₹{customer.totalSpent}
                        </p>
                        {customer.email && (
                          <p className="text-sm text-muted-foreground">Email: {customer.email}</p>
                        )}
                      </div>
                      <Button
                        size="sm"
                        onClick={() => resolveDuplicate(dupGroup, customer.id)}
                        className="ml-4"
                      >
                        Keep This One
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDuplicateDialog(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search by phone number or Customer ID..." 
              className="pl-8" 
              value={searchQuery} 
              onChange={(e) => setSearchQuery(e.target.value)} 
            />
          </div>
          
          <Button
            variant={activeFilterCount > 0 ? "default" : "outline"}
            onClick={() => setShowFilters(!showFilters)}
            className="relative"
          >
            <Filter className="h-4 w-4 mr-2" />
            Filters
            {activeFilterCount > 0 && (
              <Badge className="ml-2 h-5 w-5 rounded-full p-0 flex items-center justify-center" variant="secondary">
                {activeFilterCount}
              </Badge>
            )}
          </Button>
        </div>

        {showFilters && (
          <div className="border rounded-lg p-4 bg-muted/50 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Filter Customers</h3>
              <Button variant="ghost" size="sm" onClick={resetFilters}>
                <X className="h-4 w-4 mr-1" />
                Reset Filters
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label htmlFor="membershipStatus">Membership Status</Label>
                <Select
                  value={filters.membershipStatus}
                  onValueChange={(value: any) => setFilters(prev => ({ ...prev, membershipStatus: value }))}
                >
                  <SelectTrigger id="membershipStatus">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Customers</SelectItem>
                    <SelectItem value="member">All Members</SelectItem>
                    <SelectItem value="non-member">Non-Members</SelectItem>
                    <SelectItem value="active">Active Members</SelectItem>
                    <SelectItem value="expired">Expired Members</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="loyaltyMin">Min Loyalty Points</Label>
                <Input
                  id="loyaltyMin"
                  type="number"
                  min="0"
                  value={filters.loyaltyPointsMin}
                  onChange={(e) => setFilters(prev => ({ ...prev, loyaltyPointsMin: parseInt(e.target.value) || 0 }))}
                  placeholder="0"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="loyaltyMax">Max Loyalty Points</Label>
                <Input
                  id="loyaltyMax"
                  type="number"
                  min="0"
                  value={filters.loyaltyPointsMax}
                  onChange={(e) => setFilters(prev => ({ ...prev, loyaltyPointsMax: parseInt(e.target.value) || 10000 }))}
                  placeholder="10000"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="joinFrom">Joined From</Label>
                <Input
                  id="joinFrom"
                  type="date"
                  value={filters.joinDateFrom}
                  onChange={(e) => setFilters(prev => ({ ...prev, joinDateFrom: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="joinTo">Joined To</Label>
                <Input
                  id="joinTo"
                  type="date"
                  value={filters.joinDateTo}
                  onChange={(e) => setFilters(prev => ({ ...prev, joinDateTo: e.target.value }))}
                />
              </div>
            </div>

            {activeFilterCount > 0 && (
              <div className="flex flex-wrap gap-2 pt-2">
                {filters.membershipStatus !== 'all' && (
                  <Badge variant="secondary">
                    Status: {filters.membershipStatus}
                    <X 
                      className="h-3 w-3 ml-1 cursor-pointer" 
                      onClick={() => setFilters(prev => ({ ...prev, membershipStatus: 'all' }))}
                    />
                  </Badge>
                )}
                {filters.loyaltyPointsMin > 0 && (
                  <Badge variant="secondary">
                    Min Points: {filters.loyaltyPointsMin}
                    <X 
                      className="h-3 w-3 ml-1 cursor-pointer" 
                      onClick={() => setFilters(prev => ({ ...prev, loyaltyPointsMin: 0 }))}
                    />
                  </Badge>
                )}
                {filters.loyaltyPointsMax < 10000 && (
                  <Badge variant="secondary">
                    Max Points: {filters.loyaltyPointsMax}
                    <X 
                      className="h-3 w-3 ml-1 cursor-pointer" 
                      onClick={() => setFilters(prev => ({ ...prev, loyaltyPointsMax: 10000 }))}
                    />
                  </Badge>
                )}
                {filters.joinDateFrom && (
                  <Badge variant="secondary">
                    From: {new Date(filters.joinDateFrom).toLocaleDateString('en-IN')}
                    <X 
                      className="h-3 w-3 ml-1 cursor-pointer" 
                      onClick={() => setFilters(prev => ({ ...prev, joinDateFrom: '' }))}
                    />
                  </Badge>
                )}
                {filters.joinDateTo && (
                  <Badge variant="secondary">
                    To: {new Date(filters.joinDateTo).toLocaleDateString('en-IN')}
                    <X 
                      className="h-3 w-3 ml-1 cursor-pointer" 
                      onClick={() => setFilters(prev => ({ ...prev, joinDateTo: '' }))}
                    />
                  </Badge>
                )}
              </div>
            )}
          </div>
        )}
      </div>
      
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Showing {filteredAndSortedCustomers.length} of {customersData.length} customers
        </p>
      </div>

      {filteredAndSortedCustomers.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredAndSortedCustomers.map((customer) => (
            <CustomerCard 
              key={customer.id} 
              customer={customer} 
              onEdit={handleEditCustomer} 
              onDelete={handleDeleteCustomer} 
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center h-64">
          <User className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-xl font-medium">No Customers Found</h3>
          <p className="text-muted-foreground mt-2">
            {searchQuery || activeFilterCount > 0 
              ? "No customers match your search or filter criteria." 
              : "You haven't added any customers yet."}
          </p>
          {(searchQuery || activeFilterCount > 0) && (
            <Button className="mt-4" variant="outline" onClick={() => {
              setSearchQuery('');
              resetFilters();
            }}>
              Clear Search & Filters
            </Button>
          )}
          <Button className="mt-4" onClick={handleOpenDialog}>
            <Plus className="h-4 w-4 mr-2" /> Add Customer
          </Button>
        </div>
      )}
    </div>
  );
};

export default Customers;
