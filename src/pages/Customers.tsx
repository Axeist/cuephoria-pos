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

  // State for component functionality
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
      description: 'The customer has been removed successfully.'
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
        description: 'The customer has been updated successfully.'
      });
    } else {
      addCustomer(customerData as Omit<Customer, 'id' | 'createdAt'>);
      toast({
        title: 'Customer Added',
        description: 'The customer has been added successfully.'
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
      <div className="flex-1 space-y-4 p-8 pt-6 bg-gradient-to-br from-cuephoria-darker via-cuephoria-dark to-cuephoria-darker min-h-screen">
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-bold tracking-tight hologram-text">Neural Customers</h2>
        </div>
        <div className="cyber-card border-red-500/30 text-red-400 px-6 py-4 bg-red-500/10" role="alert">
          <strong className="font-bold">System Error: </strong>
          <span className="block sm:inline">{error}</span>
          <p className="mt-2 font-mono text-sm">Please reinitialize the system or contact technical support.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-6 p-8 pt-6 bg-gradient-to-br from-cuephoria-darker via-cuephoria-dark to-cuephoria-darker min-h-screen relative">
      {/* Futuristic background effects */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full bg-cyber-grid bg-cyber-grid opacity-20"></div>
        <div className="absolute top-1/3 left-1/4 w-80 h-80 bg-cuephoria-neon-cyan/3 rounded-full blur-3xl animate-float"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cuephoria-neon-purple/3 rounded-full blur-3xl animate-breathe"></div>
      </div>

      <div className="relative z-10">
        <div className="flex items-center justify-between mb-8 animate-slide-up">
          <div className="relative">
            <h2 className="text-4xl font-bold tracking-tight hologram-text animate-cyber-glow">
              <Users className="inline-block w-10 h-10 mr-3 text-cuephoria-neon-cyan animate-pulse" />
              Neural Customer Database
            </h2>
            <div className="h-1 w-56 bg-gradient-to-r from-cuephoria-neon-cyan via-cuephoria-neon-purple to-cuephoria-neon-pink mt-3 rounded-full animate-shimmer"></div>
          </div>
          <div className="flex space-x-3">
            <Button variant="outline" onClick={exportCustomers} className="cyber-button border-cuephoria-neon-green/30">
              <Download className="h-4 w-4 mr-2" /> 
              <span className="font-mono">EXPORT</span>
            </Button>
            <Button onClick={handleOpenDialog} className="bg-gradient-to-r from-cuephoria-neon-purple/20 to-cuephoria-neon-cyan/20 border border-cuephoria-neon-purple/40 hover:from-cuephoria-neon-purple/30 hover:to-cuephoria-neon-cyan/30 transition-all duration-300 animate-pulse-cyber">
              <Plus className="h-4 w-4 mr-2" /> 
              <span className="font-mono">ADD CUSTOMER</span>
            </Button>
          </div>
        </div>

        {/* Enhanced Customer Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="cyber-card border-cuephoria-neon-purple/40 animate-scale-in">
            <DialogHeader>
              <DialogTitle className="hologram-text text-xl">
                {isEditMode ? 'Modify Customer Profile' : 'Initialize New Customer'}
              </DialogTitle>
              <DialogDescription className="text-cuephoria-neon-purple/70 font-mono">
                Enter customer data and membership protocols.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="grid gap-6 py-4 data-grid">
                <div className="grid gap-3">
                  <Label htmlFor="name" className="text-cuephoria-neon-cyan">Neural ID Name</Label>
                  <Input 
                    id="name" 
                    name="name" 
                    value={formState.name} 
                    onChange={handleChange} 
                    placeholder="Enter customer designation" 
                    className="cyber-input"
                  />
                </div>
                <div className="grid gap-3">
                  <Label htmlFor="phone" className="text-cuephoria-neon-cyan">Communication Channel</Label>
                  <Input 
                    id="phone" 
                    name="phone" 
                    value={formState.phone} 
                    onChange={handleChange} 
                    placeholder="10-digit access code" 
                    className={`cyber-input ${phoneError ? "border-red-500" : ""}`}
                  />
                  {phoneError && <p className="text-sm text-red-400 font-mono">{phoneError}</p>}
                </div>
                <div className="grid gap-3">
                  <Label htmlFor="email" className="text-cuephoria-neon-cyan">Secondary Channel (Optional)</Label>
                  <Input 
                    id="email" 
                    name="email" 
                    type="email" 
                    value={formState.email} 
                    onChange={handleChange} 
                    placeholder="Enter quantum mail address" 
                    className={`cyber-input ${emailError ? "border-red-500" : ""}`}
                  />
                  {emailError && <p className="text-sm text-red-400 font-mono">{emailError}</p>}
                </div>
                
                <div className="flex items-center space-x-3 pt-3 cyber-card p-4">
                  <Switch 
                    id="member" 
                    checked={formState.isMember} 
                    onCheckedChange={handleSwitchChange}
                    className="data-[state=checked]:bg-cuephoria-neon-purple"
                  />
                  <Label htmlFor="member" className="text-cuephoria-neon-purple font-mono">
                    <Zap className="inline w-4 h-4 mr-2" />
                    Premium Member Status
                  </Label>
                </div>
                
                {formState.isMember && (
                  <div className="space-y-6 cyber-card p-6 bg-cuephoria-neon-purple/5 scanner-line">
                    {isEditMode && selectedCustomer && selectedCustomer.membershipPlan && (
                      <div className="grid gap-3">
                        <Label htmlFor="membershipPlan" className="text-cuephoria-neon-cyan">Current Protocol</Label>
                        <Input 
                          id="membershipPlan" 
                          value={selectedCustomer.membershipPlan} 
                          readOnly 
                          className="cyber-input bg-black/50" 
                        />
                        <p className="text-xs text-cuephoria-neon-purple/70 mt-1 font-mono">
                          Protocol modification requires checkout procedure.
                        </p>
                      </div>
                    )}
                    
                    <div className="grid gap-3">
                      <Label htmlFor="membershipExpiryDate" className="text-cuephoria-neon-cyan">Protocol Expiry</Label>
                      <Input 
                        id="membershipExpiryDate" 
                        name="membershipExpiryDate" 
                        type="date" 
                        value={formState.membershipExpiryDate} 
                        onChange={handleChange}
                        className="cyber-input"
                      />
                    </div>
                    
                    <div className="grid gap-3">
                      <Label htmlFor="membershipHoursLeft" className="text-cuephoria-neon-cyan">Quantum Hours</Label>
                      <Input 
                        id="membershipHoursLeft" 
                        name="membershipHoursLeft" 
                        type="number" 
                        min="0" 
                        value={formState.membershipHoursLeft} 
                        onChange={handleChange} 
                        placeholder="Available temporal units"
                        className="cyber-input"
                      />
                    </div>
                  </div>
                )}
              </div>
              <DialogFooter className="gap-3">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsDialogOpen(false)}
                  className="cyber-button border-gray-500/30"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit"
                  className="bg-gradient-to-r from-cuephoria-neon-purple/30 to-cuephoria-neon-cyan/30 border border-cuephoria-neon-purple/50"
                >
                  {isEditMode ? 'Update Profile' : 'Initialize Customer'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Enhanced Search */}
        <div className="flex items-center space-x-2 mb-8 animate-slide-up" style={{animationDelay: '0.1s'}}>
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-cuephoria-neon-purple/60" />
            <Input 
              placeholder="Search neural database by name, communication channel, or quantum mail..." 
              className="pl-8 cyber-input" 
              value={searchQuery} 
              onChange={(e) => setSearchQuery(e.target.value)} 
            />
          </div>
        </div>
        
        {/* Enhanced Customer List */}
        {filteredCustomers.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 animate-slide-up" style={{animationDelay: '0.2s'}}>
            {filteredCustomers.map((customer, index) => (
              <div 
                key={customer.id} 
                className="animate-scale-in hover-lift"
                style={{animationDelay: `${index * 50}ms`}}
              >
                <CustomerCard 
                  customer={customer} 
                  onEdit={handleEditCustomer} 
                  onDelete={handleDeleteCustomer} 
                  className="cyber-card circuit-border"
                />
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-64 cyber-card animate-fade-in">
            <User className="h-16 w-16 text-cuephoria-neon-purple/50 mb-6 animate-hologram-flicker" />
            <h3 className="text-xl font-medium hologram-text">No Neural Profiles Found</h3>
            <p className="text-cuephoria-neon-purple/70 mt-3 font-mono text-center">
              {searchQuery ? "Search parameters yielded no matches." : "Customer database is empty."}
            </p>
            <Button className="mt-6 cyber-button" onClick={handleOpenDialog}>
              <Plus className="h-4 w-4 mr-2" /> Initialize Customer
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Customers;
