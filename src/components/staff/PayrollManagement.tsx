// src/components/staff/PayrollManagement.tsx
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { DollarSign, Download, Plus, Minus, FileText, TrendingUp } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import jsPDF from 'jspdf';

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
  const { toast } = useToast();
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [payrollRecords, setPayrollRecords] = useState<any[]>([]);
  const [isLoadingPayroll, setIsLoadingPayroll] = useState(false);
  const [showDeductionDialog, setShowDeductionDialog] = useState(false);
  const [showAllowanceDialog, setShowAllowanceDialog] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<any>(null);
  const [deductionForm, setDeductionForm] = useState({
    type: 'lop',
    amount: '',
    reason: ''
  });
  const [allowanceForm, setAllowanceForm] = useState({
    type: 'bonus',
    amount: '',
    reason: ''
  });

  useEffect(() => {
    fetchPayrollRecords();
  }, [selectedMonth, selectedYear]);

  const fetchPayrollRecords = async () => {
    setIsLoadingPayroll(true);
    try {
      const { data, error } = await supabase
        .from('staff_payslip_view')
        .select('*')
        .eq('month', selectedMonth)
        .eq('year', selectedYear);

      if (error) throw error;
      setPayrollRecords(data || []);
    } catch (error: any) {
      console.error('Error fetching payroll:', error);
      toast({
        title: 'Error',
        description: 'Failed to load payroll records',
        variant: 'destructive'
      });
    } finally {
      setIsLoadingPayroll(false);
    }
  };

  const handleGeneratePayroll = async (staffId: string) => {
    try {
      const { data, error } = await supabase.rpc('generate_monthly_payroll', {
        p_staff_id: staffId,
        p_month: selectedMonth,
        p_year: selectedYear,
        p_admin_username: 'admin'
      });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Payroll generated successfully'
      });

      fetchPayrollRecords();
    } catch (error: any) {
      console.error('Error generating payroll:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to generate payroll',
        variant: 'destructive'
      });
    }
  };

  const handleAddDeduction = async () => {
    if (!selectedStaff || !deductionForm.amount || !deductionForm.reason) {
      toast({
        title: 'Validation Error',
        description: 'Please fill all required fields',
        variant: 'destructive'
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('staff_deductions')
        .insert({
          staff_id: selectedStaff.staff_id,
          deduction_type: deductionForm.type,
          amount: parseFloat(deductionForm.amount),
          reason: deductionForm.reason,
          marked_by: 'admin',
          month: selectedMonth,
          year: selectedYear,
          deduction_date: new Date().toISOString().split('T')[0]
        });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Deduction added successfully'
      });

      setShowDeductionDialog(false);
      setDeductionForm({ type: 'lop', amount: '', reason: '' });
      setSelectedStaff(null);
      fetchPayrollRecords();
    } catch (error: any) {
      console.error('Error adding deduction:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to add deduction',
        variant: 'destructive'
      });
    }
  };

  const handleAddAllowance = async () => {
    if (!selectedStaff || !allowanceForm.amount || !allowanceForm.reason) {
      toast({
        title: 'Validation Error',
        description: 'Please fill all required fields',
        variant: 'destructive'
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('staff_allowances')
        .insert({
          staff_id: selectedStaff.staff_id,
          allowance_type: allowanceForm.type,
          amount: parseFloat(allowanceForm.amount),
          reason: allowanceForm.reason,
          approved_by: 'admin',
          month: selectedMonth,
          year: selectedYear
        });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Allowance added successfully'
      });

      setShowAllowanceDialog(false);
      setAllowanceForm({ type: 'bonus', amount: '', reason: '' });
      setSelectedStaff(null);
      fetchPayrollRecords();
    } catch (error: any) {
      console.error('Error adding allowance:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to add allowance',
        variant: 'destructive'
      });
    }
  };

  const handleDownloadPayslip = async (payroll: any) => {
    try {
      const doc = new jsPDF();
      
      // Header
      doc.setFillColor(155, 135, 245);
      doc.rect(0, 0, 210, 40, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(24);
      doc.text('Cuephoria', 105, 20, { align: 'center' } as any);
      doc.setFontSize(12);
      doc.text('Payslip', 105, 30, { align: 'center' } as any);
      
      // Employee Details
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(10);
      doc.text(`Employee: ${payroll.staff_name}`, 20, 55);
      doc.text(`Designation: ${payroll.designation}`, 20, 62);
      doc.text(`Month: ${format(new Date(payroll.year, payroll.month - 1), 'MMMM yyyy')}`, 20, 69);
      doc.text(`Generated: ${format(new Date(payroll.generated_at), 'MMM dd, yyyy')}`, 20, 76);
      
      // Earnings Section
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('Earnings', 20, 90);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      
      let yPos = 100;
      doc.text(`Base Salary (${payroll.total_working_days} days)`, 20, yPos);
      doc.text(`₹${payroll.gross_earnings?.toFixed(2)}`, 180, yPos, { align: 'right' } as any);
      
      if (payroll.allowances_detail && payroll.allowances_detail.length > 0) {
        yPos += 7;
        doc.setFont('helvetica', 'bold');
        doc.text('Allowances:', 20, yPos);
        doc.setFont('helvetica', 'normal');
        
        payroll.allowances_detail.forEach((allowance: any) => {
          yPos += 7;
          doc.text(`  ${allowance.type}`, 25, yPos);
          doc.text(`₹${allowance.amount?.toFixed(2)}`, 180, yPos, { align: 'right' } as any);
        });
      }
      
      yPos += 10;
      doc.setFont('helvetica', 'bold');
      doc.text('Total Earnings:', 20, yPos);
      doc.text(`₹${(payroll.gross_earnings + payroll.total_allowances)?.toFixed(2)}`, 180, yPos, { align: 'right' } as any);
      
      // Deductions Section
      yPos += 15;
      doc.setFontSize(12);
      doc.text('Deductions', 20, yPos);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      
      if (payroll.deductions_detail && payroll.deductions_detail.length > 0) {
        payroll.deductions_detail.forEach((deduction: any) => {
          yPos += 7;
          doc.text(`  ${deduction.type}`, 25, yPos);
          doc.text(`₹${deduction.amount?.toFixed(2)}`, 180, yPos, { align: 'right' } as any);
        });
      } else {
        yPos += 7;
        doc.text('  No deductions', 25, yPos);
      }
      
      yPos += 10;
      doc.setFont('helvetica', 'bold');
      doc.text('Total Deductions:', 20, yPos);
      doc.text(`₹${payroll.total_deductions?.toFixed(2)}`, 180, yPos, { align: 'right' } as any);
      
      // Net Salary
      yPos += 15;
      doc.setFillColor(155, 135, 245);
      doc.rect(15, yPos - 5, 180, 12, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(14);
      doc.text('NET SALARY:', 20, yPos + 3);
      doc.text(`₹${payroll.net_salary?.toFixed(2)}`, 185, yPos + 3, { align: 'right' } as any);
      
      // Footer
      doc.setTextColor(100, 100, 100);
      doc.setFontSize(8);
      doc.text('This is a computer-generated payslip and does not require a signature.', 105, 280, { align: 'center' } as any);
      
      doc.save(`Payslip_${payroll.staff_name}_${format(new Date(payroll.year, payroll.month - 1), 'MMM_yyyy')}.pdf`);
      
      toast({
        title: 'Success',
        description: 'Payslip downloaded successfully'
      });
    } catch (error: any) {
      console.error('Error generating PDF:', error);
      toast({
        title: 'Error',
        description: 'Failed to generate payslip',
        variant: 'destructive'
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-8 w-8 rounded-full border-4 border-cuephoria-lightpurple border-t-transparent"></div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        <Card className="bg-cuephoria-dark border-cuephoria-purple/20">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-white">Payroll Management</CardTitle>
                <CardDescription>Generate and manage staff payroll</CardDescription>
              </div>
              <div className="flex gap-2">
                <Select
                  value={String(selectedMonth)}
                  onValueChange={(v) => setSelectedMonth(parseInt(v))}
                >
                  <SelectTrigger className="w-[140px] bg-cuephoria-darker border-cuephoria-purple/20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-cuephoria-dark border-cuephoria-purple/20">
                    {Array.from({ length: 12 }, (_, i) => (
                      <SelectItem key={i + 1} value={String(i + 1)}>
                        {format(new Date(2025, i, 1), 'MMMM')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={String(selectedYear)}
                  onValueChange={(v) => setSelectedYear(parseInt(v))}
                >
                  <SelectTrigger className="w-[100px] bg-cuephoria-darker border-cuephoria-purple/20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-cuephoria-dark border-cuephoria-purple/20">
                    {Array.from({ length: 3 }, (_, i) => (
                      <SelectItem key={i} value={String(2025 - i)}>
                        {2025 - i}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoadingPayroll ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin h-8 w-8 rounded-full border-4 border-cuephoria-lightpurple border-t-transparent"></div>
              </div>
            ) : (
              <div className="space-y-4">
                {staffProfiles.filter(s => s.is_active).map((staff) => {
                  const payroll = payrollRecords.find(p => p.staff_id === staff.user_id);
                  
                  return (
                    <Card
                      key={staff.user_id}
                      className="bg-cuephoria-darker border-cuephoria-purple/10"
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="h-12 w-12 rounded-full bg-cuephoria-purple/20 flex items-center justify-center">
                              <span className="text-xl font-bold text-cuephoria-lightpurple">
                                {staff.username?.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div>
                              <p className="font-semibold text-white">{staff.username}</p>
                              <p className="text-sm text-muted-foreground">{staff.designation}</p>
                              {payroll && (
                                <div className="flex items-center gap-3 mt-2">
                                  <Badge variant="outline" className="text-green-500 border-green-500">
                                    {payroll.total_working_days} days
                                  </Badge>
                                  <span className="text-sm text-muted-foreground">
                                    {payroll.total_working_hours?.toFixed(1)} hrs
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="text-right space-y-2">
                            {payroll ? (
                              <>
                                <div className="space-y-1">
                                  <p className="text-2xl font-bold text-white">
                                    ₹{payroll.net_salary?.toFixed(2)}
                                  </p>
                                  <div className="flex items-center gap-2 text-sm justify-end">
                                    <span className="text-green-500">+₹{payroll.total_allowances?.toFixed(2)}</span>
                                    <span className="text-red-500">-₹{payroll.total_deductions?.toFixed(2)}</span>
                                  </div>
                                  <Badge
                                    variant={payroll.payment_status === 'paid' ? 'default' : 'secondary'}
                                    className={payroll.payment_status === 'paid' ? 'bg-green-500' : ''}
                                  >
                                    {payroll.payment_status?.toUpperCase()}
                                  </Badge>
                                </div>
                                <div className="flex gap-2 mt-3">
                                  <Button
                                    onClick={() => {
                                      setSelectedStaff(payroll);
                                      setShowDeductionDialog(true);
                                    }}
                                    variant="outline"
                                    size="sm"
                                    className="border-red-500 text-red-500 hover:bg-red-500 hover:text-white"
                                  >
                                    <Minus className="h-3 w-3 mr-1" />
                                    Deduction
                                  </Button>
                                  <Button
                                    onClick={() => {
                                      setSelectedStaff(payroll);
                                      setShowAllowanceDialog(true);
                                    }}
                                    variant="outline"
                                    size="sm"
                                    className="border-green-500 text-green-500 hover:bg-green-500 hover:text-white"
                                  >
                                    <Plus className="h-3 w-3 mr-1" />
                                    Allowance
                                  </Button>
                                  <Button
                                    onClick={() => handleDownloadPayslip(payroll)}
                                    variant="outline"
                                    size="sm"
                                    className="border-cuephoria-purple/20"
                                  >
                                    <Download className="h-3 w-3 mr-1" />
                                    Payslip
                                  </Button>
                                </div>
                              </>
                            ) : (
                              <Button
                                onClick={() => handleGeneratePayroll(staff.user_id)}
                                className="bg-cuephoria-purple hover:bg-cuephoria-lightpurple"
                                size="sm"
                              >
                                <TrendingUp className="h-4 w-4 mr-2" />
                                Generate Payroll
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Deduction Dialog */}
      <Dialog open={showDeductionDialog} onOpenChange={setShowDeductionDialog}>
        <DialogContent className="bg-cuephoria-dark border-cuephoria-purple/20 text-white">
          <DialogHeader>
            <DialogTitle>Add Deduction</DialogTitle>
            <DialogDescription>
              Add deduction for {selectedStaff?.staff_name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Deduction Type</Label>
              <Select
                value={deductionForm.type}
                onValueChange={(v) => setDeductionForm({...deductionForm, type: v})}
              >
                <SelectTrigger className="bg-cuephoria-darker border-cuephoria-purple/20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-cuephoria-dark border-cuephoria-purple/20">
                  <SelectItem value="lop">Loss of Pay (LOP)</SelectItem>
                  <SelectItem value="late_arrival">Late Arrival</SelectItem>
                  <SelectItem value="early_departure">Early Departure</SelectItem>
                  <SelectItem value="unpaid_leave">Unpaid Leave</SelectItem>
                  <SelectItem value="penalty">Penalty</SelectItem>
                  <SelectItem value="advance_deduction">Advance Deduction</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Amount (₹)</Label>
              <Input
                type="number"
                step="0.01"
                value={deductionForm.amount}
                onChange={(e) => setDeductionForm({...deductionForm, amount: e.target.value})}
                className="bg-cuephoria-darker border-cuephoria-purple/20"
              />
            </div>
            <div className="space-y-2">
              <Label>Reason</Label>
              <Textarea
                value={deductionForm.reason}
                onChange={(e) => setDeductionForm({...deductionForm, reason: e.target.value})}
                className="bg-cuephoria-darker border-cuephoria-purple/20"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowDeductionDialog(false);
                setDeductionForm({ type: 'lop', amount: '', reason: '' });
              }}
              className="border-cuephoria-purple/20"
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddDeduction}
              className="bg-red-600 hover:bg-red-700"
            >
              Add Deduction
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Allowance Dialog */}
      <Dialog open={showAllowanceDialog} onOpenChange={setShowAllowanceDialog}>
        <DialogContent className="bg-cuephoria-dark border-cuephoria-purple/20 text-white">
          <DialogHeader>
            <DialogTitle>Add Allowance</DialogTitle>
            <DialogDescription>
              Add allowance for {selectedStaff?.staff_name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Allowance Type</Label>
              <Select
                value={allowanceForm.type}
                onValueChange={(v) => setAllowanceForm({...allowanceForm, type: v})}
              >
                <SelectTrigger className="bg-cuephoria-darker border-cuephoria-purple/20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-cuephoria-dark border-cuephoria-purple/20">
                  <SelectItem value="bonus">Bonus</SelectItem>
                  <SelectItem value="incentive">Incentive</SelectItem>
                  <SelectItem value="overtime">Overtime</SelectItem>
                  <SelectItem value="festival_bonus">Festival Bonus</SelectItem>
                  <SelectItem value="performance_bonus">Performance Bonus</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Amount (₹)</Label>
              <Input
                type="number"
                step="0.01"
                value={allowanceForm.amount}
                onChange={(e) => setAllowanceForm({...allowanceForm, amount: e.target.value})}
                className="bg-cuephoria-darker border-cuephoria-purple/20"
              />
            </div>
            <div className="space-y-2">
              <Label>Reason</Label>
              <Textarea
                value={allowanceForm.reason}
                onChange={(e) => setAllowanceForm({...allowanceForm, reason: e.target.value})}
                className="bg-cuephoria-darker border-cuephoria-purple/20"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowAllowanceDialog(false);
                setAllowanceForm({ type: 'bonus', amount: '', reason: '' });
              }}
              className="border-cuephoria-purple/20"
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddAllowance}
              className="bg-green-600 hover:bg-green-700"
            >
              Add Allowance
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default PayrollManagement;
