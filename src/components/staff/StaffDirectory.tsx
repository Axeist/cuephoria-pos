// src/components/staff/StaffDirectory.tsx
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Mail, Phone, DollarSign } from 'lucide-react';
import { format } from 'date-fns';

interface StaffDirectoryProps {
  staffProfiles: any[];
  isLoading: boolean;
  onRefresh: () => void;
}

const StaffDirectory: React.FC<StaffDirectoryProps> = ({
  staffProfiles,
  isLoading,
  onRefresh
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredStaff = staffProfiles.filter(staff =>
    staff.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    staff.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    staff.designation?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-8 w-8 rounded-full border-4 border-cuephoria-lightpurple border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="bg-cuephoria-dark border-cuephoria-purple/20">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-white">Staff Directory</CardTitle>
            <Button
              onClick={onRefresh}
              variant="outline"
              size="sm"
              className="border-cuephoria-purple/20"
            >
              Refresh
            </Button>
          </div>
          <div className="relative mt-4">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or designation..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-cuephoria-darker border-cuephoria-purple/20"
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredStaff.map((staff) => (
              <Card
                key={staff.user_id}
                className="bg-cuephoria-darker border-cuephoria-purple/10 hover:border-cuephoria-purple/40 transition-all"
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 rounded-full bg-cuephoria-purple/20 flex items-center justify-center">
                        <span className="text-xl font-bold text-cuephoria-lightpurple">
                          {staff.username?.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="font-semibold text-white">{staff.username}</p>
                        <p className="text-sm text-muted-foreground">{staff.full_name}</p>
                      </div>
                    </div>
                    <Badge
                      variant={staff.is_active ? "default" : "secondary"}
                      className={staff.is_active ? "bg-green-500" : "bg-gray-500"}
                    >
                      {staff.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <span className="font-medium text-white">Role:</span>
                      {staff.designation}
                    </div>
                    
                    {staff.phone && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Phone className="h-3 w-3" />
                        {staff.phone}
                      </div>
                    )}
                    
                    {staff.email && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Mail className="h-3 w-3" />
                        {staff.email}
                      </div>
                    )}
                    
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <DollarSign className="h-3 w-3" />
                      ₹{staff.monthly_salary?.toLocaleString()}/month
                    </div>
                    
                    <div className="text-xs text-muted-foreground mt-2 pt-2 border-t border-cuephoria-purple/10">
                      Joined: {format(new Date(staff.created_at), 'MMM dd, yyyy')}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {filteredStaff.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              No staff members found
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default StaffDirectory;
