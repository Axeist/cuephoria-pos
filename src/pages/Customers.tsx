import React, { useState, useEffect } from 'react';
import { Plus, User, Search, Download, Users, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { usePOS, Customer } from '@/context/POSContext';
import CustomerCard from '@/components/CustomerCard';
import { useToast } from '@/hooks/use-toast';

const Customers = () => {
  console.log('Customers component rendering');

  // Local state to handle errors
  const [error, setError] = useState<string | null>(null);
  const [customersData, setCustomersData] = useState<Customer[]>([]);
  const [isContextLoaded, setIsContextLoaded] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [emailError, setEmailError] = useState('');

  // Form state
  const [formState, setFormState] = useState({
    name: '',
    phone: '',
    email: '',
    isMember: false,
    membershipExpiryDate: '',
    membershipHoursLeft: ''
  });
  const {
    toast
  } = useToast();

  // Use a try-catch when getting the context - but only once, not on every render
  let posContext;
  try {
    posContext = usePOS();
  } catch (e) {
    console.error('Error using POS context:', e);
    const errorMessage = e instanceof Error ? e.message : 'Unknown error';

    // Only set the error if it's not already set
    if (error !== errorMessage) {
      setError(errorMessage);
    }
    posContext = null;
  }

  // If we have the context, extract what we need
  const {
    customers = [],
    addCustomer = () => {},
    updateCustomer = () => {},
    deleteCustomer = () => {},
    exportCustomers = () => {}
  } = posContext || {};

  // Update local state when context data changes
  useEffect(() => {
    if (posContext && customers) {
      console.log('Setting customer data:', customers);
      setCustomersData(customers);
      setIsContextLoaded(true);
    }
  }, [posContext, customers]);

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
    console.log('Editing customer:', customer);
    setIsEditMode(true);
    setSelectedCustomer(customer);

    // Format date for input field
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
      description: 'The customer has been removed successfully.',
      variant: 'success',
    });
  };

  // Check for duplicate phone and email
  const checkForDuplicates = (): boolean => {
    setPhoneError('');
    setEmailError('');
    let hasDuplicates = false;
    
    // Skip checking current customer in edit mode
    const currentId = isEditMode && selectedCustomer ? selectedCustomer.id : null;
    
    // Check for duplicate phone (required field)
    const duplicatePhone = customersData.find(
      c => c.phone === formState.phone && c.id !== currentId
    );
    
    if (duplicatePhone) {
      setPhoneError('This phone number is already registered');
      hasDuplicates = true;
    }
    
    // Check for duplicate email (if provided)
    if (formState.email) {
      const duplicateEmail = customersData.find(
        c => c.email === formState.email && c.id !== currentId
      );
      
      if (duplicateEmail) {
        setEmailError('This email is already registered');
        hasDuplicates = true;
      }
    }
    
    return hasDuplicates;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const {
      name,
      phone,
      email,
      isMember,
      membershipExpiryDate,
      membershipHoursLeft
    } = formState;
    
    if (!name || !phone) {
      toast({
        title: 'Error',
        description: 'Name and phone are required',
        variant: 'destructive'
      });
      return;
    }

    // Validate Indian phone number
    const phoneRegex = /^[6-9]\d{9}$/;
    if (!phoneRegex.test(phone)) {
      setPhoneError('Please enter a valid 10-digit Indian phone number');
      return;
    }
    
    // Check for duplicates
    if (checkForDuplicates()) {
      return; // Don't proceed if duplicates found
    }

    // Create the customer data object
    const customerData: Partial<Customer> = {
      name,
      phone,
      email: email || undefined,
      isMember,
      loyaltyPoints: isEditMode && selectedCustomer ? selectedCustomer.loyaltyPoints : 0,
      totalSpent: isEditMode && selectedCustomer ? selectedCustomer.totalSpent : 0,
      totalPlayTime: isEditMode && selectedCustomer ? selectedCustomer.totalPlayTime : 0
    };

    // Add membership details if customer is a member
    if (isMember) {
      // Keep existing membership plan if editing
      if (isEditMode && selectedCustomer && selectedCustomer.membershipPlan) {
        customerData.membershipPlan = selectedCustomer.membershipPlan;
        customerData.membershipDuration = selectedCustomer.membershipDuration;
      }
      
      if (membershipExpiryDate) {
        customerData.membershipExpiryDate = new Date(membershipExpiryDate);
      }
      
      if (membershipHoursLeft) {
        customerData.membershipHoursLeft = parseInt(membershipHoursLeft, 10);
      }
    }
    console.log('Submitting customer data:', customerData);
    if (isEditMode && selectedCustomer) {
      updateCustomer({
        ...customerData,
        id: selectedCustomer.id,
        createdAt: selectedCustomer.createdAt
      } as Customer);
      toast({
        title: 'Customer Updated',
        description: 'The customer has been updated successfully.',
        variant: 'success',
      });
    } else {
      addCustomer(customerData as Omit<Customer, 'id' | 'createdAt'>);
      toast({
        title: 'Customer Added',
        description: 'The customer has been added successfully.',
        variant: 'success',
      });
    }
    setIsDialogOpen(false);
    resetForm();
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormState(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear validation errors when input changes
    if (name === 'phone') setPhoneError('');
    if (name === 'email') setEmailError('');
  };

  const handleSwitchChange = (checked: boolean) => {
    setFormState(prev => ({
      ...prev,
      isMember: checked
    }));
  };

  // Filter customers based on search query
  const filteredCustomers = searchQuery.trim() === '' ? customersData : customersData.filter(customer => 
    customer.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    customer.phone.includes(searchQuery) || 
    customer.email && customer.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // If we have an error, display it
  if (error) {
    return (
      <div className="min-h-screen circuit-pattern">
        <div className="flex-1 space-y-4 p-8 pt-6">
          <div className="flex items-center justify-between">
            <h2 className="text-3xl font-bold holographic-text font-orbitron">Customers</h2>
          </div>
          <div className="cyber-card rounded-lg p-6 border-red-500/50" role="alert">
            <strong className="font-bold text-red-400">Error: </strong>
            <span className="block sm:inline text-gray-300">{error}</span>
            <p className="mt-2 text-gray-400">Please try refreshing the page or contact support if the issue persists.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen circuit-pattern">
      <div className="flex-1 space-y-6 p-8 pt-6">
        <div className="flex items-center justify-between animate-slide-in-top">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-cyber-purple to-neon-blue flex items-center justify-center animate-cyber-pulse">
              <Users className="h-6 w-6 text-white" />
            </div>
            <h2 className="text-4xl font-bold holographic-text font-orbitron">Customers</h2>
            <Zap className="h-6 w-6 text-neon-orange animate-pulse" />
          </div>
          
          <div className="flex space-x-3 animate-slide-in-right">
            <Button 
              variant="outline" 
              onClick={exportCustomers}
              className="gaming-button font-rajdhani"
            >
              <Download className="h-4 w-4 mr-2" /> Export
            </Button>
            <Button 
              onClick={handleOpenDialog}
              className="gaming-button bg-gradient-to-r from-cyber-purple to-neon-blue hover:opacity-90 font-rajdhani"
            >
              <Plus className="h-4 w-4 mr-2" /> Add Customer
            </Button>
          </div>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="gaming-sidebar max-w-md">
            <DialogHeader>
              <DialogTitle className="font-orbitron text-white">
                {isEditMode ? 'Edit Customer' : 'Add New Customer'}
              </DialogTitle>
              <DialogDescription className="font-rajdhani text-gray-300">
                Enter customer details and membership information if applicable.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="grid gap-4 py-4">
                {/* Basic Information */}
                <div className="grid gap-2">
                  <Label htmlFor="name" className="font-rajdhani text-white">Full Name</Label>
                  <Input 
                    id="name" 
                    name="name" 
                    value={formState.name} 
                    onChange={handleChange} 
                    placeholder="Enter customer name" 
                    className="gaming-input font-rajdhani"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="phone" className="font-rajdhani text-white">Phone Number</Label>
                  <Input 
                    id="phone" 
                    name="phone" 
                    value={formState.phone} 
                    onChange={handleChange} 
                    placeholder="10-digit mobile number" 
                    className={`gaming-input font-rajdhani ${phoneError ? "border-red-500" : ""}`}
                  />
                  {phoneError && <p className="text-sm text-red-400 font-rajdhani">{phoneError}</p>}
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="email" className="font-rajdhani text-white">Email (Optional)</Label>
                  <Input 
                    id="email" 
                    name="email" 
                    type="email" 
                    value={formState.email} 
                    onChange={handleChange} 
                    placeholder="Enter email address" 
                    className={`gaming-input font-rajdhani ${emailError ? "border-red-500" : ""}`}
                  />
                  {emailError && <p className="text-sm text-red-400 font-rajdhani">{emailError}</p>}
                </div>
                
                {/* Membership Section */}
                <div className="flex items-center space-x-2 pt-2">
                  <Switch 
                    id="member" 
                    checked={formState.isMember} 
                    onCheckedChange={handleSwitchChange} 
                  />
                  <Label htmlFor="member" className="font-rajdhani text-white">Is Member</Label>
                </div>
                
                {/* Conditional Membership Fields */}
                {formState.isMember && (
                  <div className="space-y-4 cyber-card rounded-md p-4">
                    {isEditMode && selectedCustomer && selectedCustomer.membershipPlan && (
                      <div className="grid gap-2">
                        <Label htmlFor="membershipPlan" className="font-rajdhani text-white">Current Membership</Label>
                        <Input 
                          id="membershipPlan" 
                          value={selectedCustomer.membershipPlan} 
                          readOnly 
                          className="gaming-input bg-muted font-rajdhani"
                        />
                        <p className="text-xs text-gray-400 mt-1 font-rajdhani">
                          Membership can only be changed through purchase at checkout.
                        </p>
                      </div>
                    )}
                    
                    <div className="grid gap-2">
                      <Label htmlFor="membershipExpiryDate" className="font-rajdhani text-white">Expiry Date</Label>
                      <Input 
                        id="membershipExpiryDate" 
                        name="membershipExpiryDate" 
                        type="date" 
                        value={formState.membershipExpiryDate} 
                        onChange={handleChange} 
                        className="gaming-input font-rajdhani"
                      />
                    </div>
                    
                    <div className="grid gap-2">
                      <Label htmlFor="membershipHoursLeft" className="font-rajdhani text-white">Hours Left</Label>
                      <Input 
                        id="membershipHoursLeft" 
                        name="membershipHoursLeft" 
                        type="number" 
                        min="0" 
                        value={formState.membershipHoursLeft} 
                        onChange={handleChange} 
                        placeholder="Available hours" 
                        className="gaming-input font-rajdhani"
                      />
                    </div>
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsDialogOpen(false)}
                  className="gaming-button font-rajdhani"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit"
                  className="gaming-button bg-gradient-to-r from-cyber-purple to-neon-blue hover:opacity-90 font-rajdhani"
                >
                  {isEditMode ? 'Update Customer' : 'Add Customer'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        <div className="flex items-center space-x-2 animate-slide-in-left">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input 
              placeholder="Search customers by name, phone or email..." 
              className="gaming-input pl-10 font-rajdhani" 
              value={searchQuery} 
              onChange={e => setSearchQuery(e.target.value)} 
            />
          </div>
        </div>
        
        {filteredCustomers.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 animate-fade-in-scale">
            {filteredCustomers.map((customer, index) => (
              <div 
                key={customer.id}
                className="animate-slide-in-bottom"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <CustomerCard 
                  customer={customer} 
                  onEdit={handleEditCustomer} 
                  onDelete={handleDeleteCustomer} 
                />
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-64 animate-fade-in-scale">
            <div className="h-16 w-16 rounded-full bg-gradient-to-br from-cyber-purple to-neon-blue flex items-center justify-center mb-4 animate-cyber-pulse">
              <User className="h-8 w-8 text-white" />
            </div>
            <h3 className="text-xl font-medium font-orbitron text-white">No Customers Found</h3>
            <p className="text-gray-400 mt-2 font-rajdhani">
              {searchQuery ? "No customers match your search criteria." : "You haven't added any customers yet."}
            </p>
            <Button 
              className="mt-4 gaming-button bg-gradient-to-r from-cyber-purple to-neon-blue hover:opacity-90 font-rajdhani" 
              onClick={handleOpenDialog}
            >
              <Plus className="h-4 w-4 mr-2" /> Add Customer
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Customers;
