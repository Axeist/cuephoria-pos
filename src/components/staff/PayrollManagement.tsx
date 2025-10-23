// src/components/staff/PayrollManagement.tsx
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface PayrollManagementProps {
  staffProfiles: any[];
  isLoading: boolean;
  onRefresh: () => void;
}

const PayrollManagement: React.FC<PayrollManagementProps> = ({
  staffProfiles,
  isLoading,
  onRefresh
}) => {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-8 w-8 rounded-full border-4 border-cuephoria-lightpurple border-t-transparent"></div>
      </div>
    );
  }

  return (
    <Card className="bg-cuephoria-dark border-cuephoria-purple/20">
      <CardHeader>
        <CardTitle className="text-white">Payroll Management</CardTitle>
        <CardDescription>Generate payroll and manage salaries</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="text-center py-12 text-muted-foreground">
          Payroll management features coming soon
        </div>
      </CardContent>
    </Card>
  );
};

export default PayrollManagement;
