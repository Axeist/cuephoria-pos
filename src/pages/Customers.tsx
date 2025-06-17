
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { usePOS } from '@/context/POSContext';
import CustomerCard from '@/components/CustomerCard';
import { Customer } from '@/types/pos.types';
import { Plus, Search, Users, UserCheck, UserX, Download } from 'lucide-react';
import { CustomerForm } from '@/components/forms/CustomerForm';
import LoyaltyPointsMigration from '@/components/customer/LoyaltyPointsMigration';

const Customers: React.FC = () => {
  console.log('Customers component rendering');
  
  const { customers, addCustomer, updateCustomer, deleteCustomer, exportCustomers } = usePOS();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'members' | 'non-members'>('all');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

  const filteredCustomers = customers
    .filter(customer => {
      const matchesSearch = customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           customer.phone.includes(searchTerm) ||
                           (customer.email && customer.email.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const matchesFilter = filterType === 'all' || 
                           (filterType === 'members' && customer.isMember) ||
                           (filterType === 'non-members' && !customer.isMember);
      
      return matchesSearch && matchesFilter;
    })
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  const handleAddCustomer = async (customerData: Omit<Customer, 'id' | 'createdAt'>) => {
    const newCustomer = await addCustomer(customerData);
    if (newCustomer) {
      setIsAddDialogOpen(false);
    }
  };

  const handleEditCustomer = async (customerData: Omit<Customer, 'id' | 'createdAt'>) => {
    if (editingCustomer) {
      const updatedCustomer = await updateCustomer({
        ...editingCustomer,
        ...customerData
      });
      if (updatedCustomer) {
        setEditingCustomer(null);
      }
    }
  };

  const handleDeleteCustomer = (id: string) => {
    deleteCustomer(id);
  };

  const totalCustomers = customers.length;
  const totalMembers = customers.filter(c => c.isMember).length;
  const totalNonMembers = totalCustomers - totalMembers;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">Customers</h1>
          <p className="text-gray-400 mt-1">Manage your customer database</p>
        </div>
        <div className="flex gap-2">
          <LoyaltyPointsMigration />
          <Button 
            variant="outline" 
            onClick={exportCustomers}
            className="gap-2"
          >
            <Download className="h-4 w-4" />
            Export
          </Button>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-cuephoria-purple hover:bg-cuephoria-purple/80 gap-2">
                <Plus className="h-4 w-4" />
                Add Customer
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Add New Customer</DialogTitle>
              </DialogHeader>
              <CustomerForm onSubmit={handleAddCustomer} />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gray-800/50 border-gray-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">Total Customers</CardTitle>
            <Users className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{totalCustomers}</div>
          </CardContent>
        </Card>
        
        <Card className="bg-gray-800/50 border-gray-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">Members</CardTitle>
            <UserCheck className="h-4 w-4 text-green-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-400">{totalMembers}</div>
          </CardContent>
        </Card>
        
        <Card className="bg-gray-800/50 border-gray-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">Non-Members</CardTitle>
            <UserX className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-400">{totalNonMembers}</div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filter */}
      <Card className="bg-gray-800/50 border-gray-700">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search by name, phone, or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-gray-700 border-gray-600 text-white placeholder-gray-400"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant={filterType === 'all' ? 'default' : 'outline'}
                onClick={() => setFilterType('all')}
                size="sm"
                className={filterType === 'all' ? 'bg-cuephoria-purple hover:bg-cuephoria-purple/80' : ''}
              >
                All
              </Button>
              <Button
                variant={filterType === 'members' ? 'default' : 'outline'}
                onClick={() => setFilterType('members')}
                size="sm"
                className={filterType === 'members' ? 'bg-cuephoria-purple hover:bg-cuephoria-purple/80' : ''}
              >
                Members
              </Button>
              <Button
                variant={filterType === 'non-members' ? 'default' : 'outline'}
                onClick={() => setFilterType('non-members')}
                size="sm"
                className={filterType === 'non-members' ? 'bg-cuephoria-purple hover:bg-cuephoria-purple/80' : ''}
              >
                Non-Members
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Customer Grid */}
      {filteredCustomers.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredCustomers.map((customer) => (
            <CustomerCard
              key={customer.id}
              customer={customer}
              onEdit={setEditingCustomer}
              onDelete={handleDeleteCustomer}
            />
          ))}
        </div>
      ) : (
        <Card className="bg-gray-800/50 border-gray-700">
          <CardContent className="py-12 text-center">
            <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-white mb-2">
              {searchTerm || filterType !== 'all' ? 'No customers found' : 'No customers yet'}
            </h3>
            <p className="text-gray-400 mb-4">
              {searchTerm || filterType !== 'all' 
                ? 'Try adjusting your search or filter criteria'
                : 'Add your first customer to get started'
              }
            </p>
            {(!searchTerm && filterType === 'all') && (
              <Button 
                onClick={() => setIsAddDialogOpen(true)}
                className="bg-cuephoria-purple hover:bg-cuephoria-purple/80"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Customer
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Edit Customer Dialog */}
      <Dialog open={!!editingCustomer} onOpenChange={() => setEditingCustomer(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Customer</DialogTitle>
          </DialogHeader>
          {editingCustomer && (
            <CustomerForm 
              onSubmit={handleEditCustomer}
              initialData={editingCustomer}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Customers;
