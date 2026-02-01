// src/components/staff/PayrollManagement.tsx
import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { format } from 'date-fns';
import { DollarSign, Download, Plus, Minus, FileText, TrendingUp, RefreshCw, Trash2, Users, CheckCircle2, AlertCircle, Check } from 'lucide-react';
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
  const { user } = useAuth();
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [payrollRecords, setPayrollRecords] = useState<any[]>([]);
  const [isLoadingPayroll, setIsLoadingPayroll] = useState(false);
  const [payoutThreshold, setPayoutThreshold] = useState<string>('15000');
  const [showApproveAllDialog, setShowApproveAllDialog] = useState(false);
  const [isApprovingAll, setIsApprovingAll] = useState(false);
  const [showDeductionDialog, setShowDeductionDialog] = useState(false);
  const [showAllowanceDialog, setShowAllowanceDialog] = useState(false);
  const [revertPayrollId, setRevertPayrollId] = useState<string | null>(null);
  const [regenerateStaffId, setRegenerateStaffId] = useState<string | null>(null);
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

  const INR = (n: number) =>
    `₹${(Number.isFinite(n) ? n : 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const formatLabel = (raw: any) => {
    const s = String(raw ?? '').trim();
    if (!s) return 'Other';
    return s
      .replace(/_/g, ' ')
      .replace(/\s+/g, ' ')
      .replace(/\b\w/g, (m) => m.toUpperCase());
  };

  useEffect(() => {
    try {
      const raw = localStorage.getItem('cuephoria_payroll_threshold_v1');
      if (raw) setPayoutThreshold(raw);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('cuephoria_payroll_threshold_v1', payoutThreshold);
    } catch {
      // ignore
    }
  }, [payoutThreshold]);

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

  const handleRegeneratePayroll = async () => {
    if (!regenerateStaffId) return;

    try {
      const { data, error } = await supabase.rpc('generate_monthly_payroll', {
        p_staff_id: regenerateStaffId,
        p_month: selectedMonth,
        p_year: selectedYear,
        p_admin_username: 'admin'
      });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Payroll regenerated successfully'
      });

      setRegenerateStaffId(null);
      fetchPayrollRecords();
    } catch (error: any) {
      console.error('Error regenerating payroll:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to regenerate payroll',
        variant: 'destructive'
      });
    }
  };

  const handleRevertPayroll = async () => {
    if (!revertPayrollId) return;

    try {
      const { error } = await supabase
        .from('staff_payroll')
        .delete()
        .eq('id', revertPayrollId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Payroll reverted successfully'
      });

      setRevertPayrollId(null);
      fetchPayrollRecords();
      onRefresh();
    } catch (error: any) {
      console.error('Error reverting payroll:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to revert payroll',
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
          marked_by: user?.username || 'admin',
          month: selectedMonth,
          year: selectedYear,
          deduction_date: new Date().toISOString().split('T')[0]
        });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Deduction added successfully. Please regenerate payroll to apply changes.'
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
          approved_by: user?.username || 'admin',
          month: selectedMonth,
          year: selectedYear
        });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Allowance added successfully. Please regenerate payroll to apply changes.'
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
      
      doc.setFillColor(155, 135, 245);
      doc.rect(0, 0, 210, 40, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(24);
      doc.text('Cuephoria', 105, 20, { align: 'center' } as any);
      doc.setFontSize(12);
      doc.text('Payslip', 105, 30, { align: 'center' } as any);
      
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(10);
      doc.text(`Employee: ${payroll.staff_name}`, 20, 55);
      doc.text(`Designation: ${payroll.designation}`, 20, 62);
      doc.text(`Month: ${format(new Date(payroll.year, payroll.month - 1), 'MMMM yyyy')}`, 20, 69);
      doc.text(`Generated: ${format(new Date(payroll.generated_at), 'MMM dd, yyyy')}`, 20, 76);
      
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('Earnings', 20, 90);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      
      let yPos = 100;
      doc.text(`Base Salary (${payroll.total_working_days} days)`, 20, yPos);
      doc.text(`₹${(payroll.gross_earnings || 0).toFixed(2)}`, 180, yPos, { align: 'right' } as any);
      
      if (payroll.allowances_detail && payroll.allowances_detail.length > 0) {
        yPos += 7;
        doc.setFont('helvetica', 'bold');
        doc.text('Allowances:', 20, yPos);
        doc.setFont('helvetica', 'normal');
        
        payroll.allowances_detail.forEach((allowance: any) => {
          yPos += 7;
          doc.text(`  ${formatLabel(allowance.type)}`, 25, yPos);
          doc.text(`₹${(Number(allowance.amount) || 0).toFixed(2)}`, 180, yPos, { align: 'right' } as any);
        });
      }
      
      yPos += 10;
      doc.setFont('helvetica', 'bold');
      doc.text('Total Earnings:', 20, yPos);
      doc.text(`₹${((payroll.gross_earnings || 0) + (payroll.total_allowances || 0)).toFixed(2)}`, 180, yPos, { align: 'right' } as any);
      
      yPos += 15;
      doc.setFontSize(12);
      doc.text('Deductions', 20, yPos);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      
      if (payroll.deductions_detail && payroll.deductions_detail.length > 0) {
        payroll.deductions_detail.forEach((deduction: any) => {
          yPos += 7;
          doc.text(`  ${formatLabel(deduction.type)}`, 25, yPos);
          doc.text(`₹${(Number(deduction.amount) || 0).toFixed(2)}`, 180, yPos, { align: 'right' } as any);
        });
      } else {
        yPos += 7;
        doc.text('  No deductions', 25, yPos);
      }
      
      yPos += 10;
      doc.setFont('helvetica', 'bold');
      doc.text('Total Deductions:', 20, yPos);
      doc.text(`₹${(payroll.total_deductions || 0).toFixed(2)}`, 180, yPos, { align: 'right' } as any);
      
      yPos += 15;
      doc.setFillColor(155, 135, 245);
      doc.rect(15, yPos - 5, 180, 12, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(14);
      doc.text('NET SALARY:', 20, yPos + 3);
      doc.text(`₹${(payroll.net_salary || 0).toFixed(2)}`, 185, yPos + 3, { align: 'right' } as any);
      
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

  const handleApproveAll = async () => {
    setIsApprovingAll(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const { error } = await supabase
        .from('staff_payroll')
        .update({
          payment_status: 'paid',
          payment_date: today,
          payment_method: 'manual',
        })
        .eq('month', selectedMonth)
        .eq('year', selectedYear);

      if (error) throw error;

      toast({
        title: 'Approved',
        description: `Marked payroll as paid for ${format(new Date(selectedYear, selectedMonth - 1, 1), 'MMMM yyyy')}.`,
      });

      setShowApproveAllDialog(false);
      await fetchPayrollRecords();
      onRefresh();
    } catch (error: any) {
      console.error('Error approving payroll:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to approve payroll',
        variant: 'destructive',
      });
    } finally {
      setIsApprovingAll(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-8 w-8 rounded-full border-4 border-cuephoria-lightpurple border-t-transparent"></div>
      </div>
    );
  }

  const activeStaff = staffProfiles.filter((s) => s.is_active);
  const activeCount = activeStaff.length;
  const generatedCount = payrollRecords.length;
  const coveragePct = activeCount > 0 ? Math.round((generatedCount / activeCount) * 100) : 0;

  const totalNet = payrollRecords.reduce((sum, p) => sum + (Number(p.net_salary) || 0), 0);
  const totalAllowances = payrollRecords.reduce((sum, p) => sum + (Number(p.total_allowances) || 0), 0);
  const totalDeductions = payrollRecords.reduce((sum, p) => sum + (Number(p.total_deductions) || 0), 0);
  const totalGross = payrollRecords.reduce((sum, p) => sum + (Number(p.gross_earnings) || 0), 0);
  const totalHours = payrollRecords.reduce((sum, p) => sum + (Number(p.total_working_hours) || 0), 0);
  const avgNet = generatedCount > 0 ? totalNet / generatedCount : 0;

  const paidCount = payrollRecords.filter((p) => String(p.payment_status || '').toLowerCase() === 'paid').length;
  const pendingCount = payrollRecords.filter((p) => String(p.payment_status || '').toLowerCase() !== 'paid').length;

  const thresholdValue = useMemo(() => {
    const n = Number(String(payoutThreshold).replace(/[^\d.]/g, ''));
    return Number.isFinite(n) ? n : 0;
  }, [payoutThreshold]);
  const utilizationPct = thresholdValue > 0 ? Math.round((totalNet / thresholdValue) * 100) : 0;
  const thresholdDelta = thresholdValue - totalNet;

  const topEarner = payrollRecords.reduce<{ staff_name?: string; net_salary?: number } | null>((best, p) => {
    const net = Number(p.net_salary) || 0;
    if (!best || net > (best.net_salary || 0)) return { staff_name: p.staff_name, net_salary: net };
    return best;
  }, null);

  const allowanceTotals = payrollRecords.reduce<Record<string, number>>((acc, p) => {
    const details = Array.isArray(p.allowances_detail) ? p.allowances_detail : [];
    details.forEach((a: any) => {
      const key = String(a?.type || 'other');
      const amt = Number(a?.amount) || 0;
      acc[key] = (acc[key] || 0) + amt;
    });
    return acc;
  }, {});

  const topAllowanceTypes = Object.entries(allowanceTotals)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);
  const topAllowanceMax = topAllowanceTypes[0]?.[1] || 0;

  const deductionTotals = payrollRecords.reduce<Record<string, number>>((acc, p) => {
    const details = Array.isArray(p.deductions_detail) ? p.deductions_detail : [];
    details.forEach((d: any) => {
      const key = String(d?.type || 'other');
      const amt = Number(d?.amount) || 0;
      acc[key] = (acc[key] || 0) + amt;
    });
    return acc;
  }, {});

  const topDeductionTypes = Object.entries(deductionTotals)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);
  const topDeductionMax = topDeductionTypes[0]?.[1] || 0;

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
              <div className="flex gap-2 items-center">
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
                        {format(new Date(selectedYear, i, 1), 'MMMM')}
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
                        {Array.from({ length: 5 }, (_, i) => {
                          const year = new Date().getFullYear() - i;
                          return (
                            <SelectItem key={year} value={String(year)}>
                              {year}
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                </Select>

                <Button
                  onClick={() => setShowApproveAllDialog(true)}
                  variant="outline"
                  className="border-green-500/40 text-green-400 hover:bg-green-500/10 hover:text-green-300"
                  disabled={generatedCount === 0 || pendingCount === 0}
                  title={generatedCount === 0 ? 'No payroll generated' : pendingCount === 0 ? 'Everything already paid' : 'Mark all as paid'}
                >
                  <Check className="h-4 w-4 mr-2" />
                  Approve All
                </Button>
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
                {/* Insight widgets */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  <Card className="bg-cuephoria-darker border-cuephoria-purple/15 overflow-hidden relative">
                    <div className="absolute -top-16 -right-16 h-40 w-40 rounded-full bg-cuephoria-purple/20 blur-3xl" />
                    <CardContent className="p-4 relative">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-xs text-muted-foreground">Total payout (Net)</p>
                          <p className="text-2xl font-bold text-white mt-1">{INR(totalNet)}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Avg {INR(avgNet)} / staff
                          </p>
                        </div>
                        <div className="h-10 w-10 rounded-xl bg-cuephoria-purple/15 ring-1 ring-white/10 flex items-center justify-center">
                          <DollarSign className="h-5 w-5 text-cuephoria-lightpurple" />
                        </div>
                      </div>
                      <div className="mt-3 h-1.5 rounded-full bg-white/5 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-cuephoria-purple to-cuephoria-lightpurple"
                          style={{ width: `${coveragePct}%` }}
                        />
                      </div>
                      <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
                        <span>Coverage</span>
                        <span className="text-gray-200">{coveragePct}%</span>
                      </div>

                      <div className="mt-3 rounded-xl border border-white/10 bg-black/20 p-2">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[11px] text-muted-foreground">Payout threshold</span>
                          <div className="flex items-center gap-1">
                            <span className="text-[11px] text-muted-foreground">₹</span>
                            <Input
                              value={payoutThreshold}
                              onChange={(e) => setPayoutThreshold(e.target.value)}
                              inputMode="numeric"
                              className="h-7 w-[92px] bg-cuephoria-dark border-white/10 text-xs text-gray-100"
                              placeholder="15000"
                            />
                          </div>
                        </div>
                        <div className="mt-2 flex items-center justify-between text-[11px]">
                          <span className="text-muted-foreground">
                            Utilization <span className="text-gray-200">{thresholdValue > 0 ? `${utilizationPct}%` : '—'}</span>
                          </span>
                          {thresholdValue > 0 ? (
                            thresholdDelta >= 0 ? (
                              <span className="text-green-400">Saving {INR(thresholdDelta)}</span>
                            ) : (
                              <span className="text-red-400">Over by {INR(Math.abs(thresholdDelta))}</span>
                            )
                          ) : (
                            <span className="text-muted-foreground">Set a threshold</span>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-cuephoria-darker border-cuephoria-purple/15 overflow-hidden relative">
                    <div className="absolute -top-16 -left-16 h-40 w-40 rounded-full bg-green-500/10 blur-3xl" />
                    <CardContent className="p-4 relative">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-xs text-muted-foreground">Total allowances</p>
                          <p className="text-2xl font-bold text-white mt-1">{INR(totalAllowances)}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {totalAllowances > 0 && totalGross > 0
                              ? `${Math.round((totalAllowances / (totalGross + totalAllowances)) * 100)}% of earnings`
                              : '—'}
                          </p>
                        </div>
                        <div className="h-10 w-10 rounded-xl bg-green-500/10 ring-1 ring-white/10 flex items-center justify-center">
                          <Plus className="h-5 w-5 text-green-400" />
                        </div>
                      </div>

                      <div className="mt-3 space-y-2">
                        {topAllowanceTypes.length === 0 ? (
                          <div className="text-xs text-muted-foreground">No allowances this month.</div>
                        ) : (
                          topAllowanceTypes.map(([k, v]) => (
                            <div key={k} className="space-y-1">
                              <div className="flex items-center justify-between text-[11px]">
                                <span className="text-gray-200 capitalize">{k.replace(/_/g, ' ')}</span>
                                <span className="text-muted-foreground">{INR(v)}</span>
                              </div>
                              <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                                <div
                                  className="h-full rounded-full bg-gradient-to-r from-green-400/70 to-cuephoria-lightpurple/70"
                                  style={{ width: `${topAllowanceMax > 0 ? Math.max(8, Math.round((v / topAllowanceMax) * 100)) : 0}%` }}
                                />
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-cuephoria-darker border-cuephoria-purple/15 overflow-hidden relative">
                    <div className="absolute -bottom-16 -right-16 h-40 w-40 rounded-full bg-red-500/10 blur-3xl" />
                    <CardContent className="p-4 relative">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-xs text-muted-foreground">Total deductions</p>
                          <p className="text-2xl font-bold text-white mt-1">{INR(totalDeductions)}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Net after adj. {INR(totalGross + totalAllowances - totalDeductions)}
                          </p>
                        </div>
                        <div className="h-10 w-10 rounded-xl bg-red-500/10 ring-1 ring-white/10 flex items-center justify-center">
                          <Minus className="h-5 w-5 text-red-400" />
                        </div>
                      </div>

                      <div className="mt-3 space-y-2">
                        {topDeductionTypes.length === 0 ? (
                          <div className="text-xs text-muted-foreground">No deductions this month.</div>
                        ) : (
                          topDeductionTypes.map(([k, v]) => (
                            <div key={k} className="space-y-1">
                              <div className="flex items-center justify-between text-[11px]">
                                <span className="text-gray-200">{formatLabel(k)}</span>
                                <span className="text-muted-foreground">{INR(v)}</span>
                              </div>
                              <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                                <div
                                  className="h-full rounded-full bg-gradient-to-r from-red-400/70 to-orange-400/70"
                                  style={{ width: `${topDeductionMax > 0 ? Math.max(8, Math.round((v / topDeductionMax) * 100)) : 0}%` }}
                                />
                              </div>
                            </div>
                          ))
                        )}
                      </div>

                      <div className="mt-3 flex items-center gap-2 text-[11px] text-muted-foreground">
                        <FileText className="h-3.5 w-3.5" />
                        <span>Review & regenerate to apply edits</span>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-cuephoria-darker border-cuephoria-purple/15 overflow-hidden relative">
                    <div className="absolute -bottom-16 -left-16 h-40 w-40 rounded-full bg-cuephoria-blue/15 blur-3xl" />
                    <CardContent className="p-4 relative">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-xs text-muted-foreground">Payroll health</p>
                          <p className="text-2xl font-bold text-white mt-1">{paidCount}/{generatedCount}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            paid • {pendingCount} pending
                          </p>
                        </div>
                        <div className="h-10 w-10 rounded-xl bg-cuephoria-blue/10 ring-1 ring-white/10 flex items-center justify-center">
                          {pendingCount > 0 ? (
                            <AlertCircle className="h-5 w-5 text-cuephoria-blue" />
                          ) : (
                            <CheckCircle2 className="h-5 w-5 text-green-400" />
                          )}
                        </div>
                      </div>
                      <div className="mt-3 h-2 rounded-full bg-white/5 overflow-hidden flex">
                        <div
                          className="h-full bg-green-500/70"
                          style={{ width: `${generatedCount > 0 ? (paidCount / generatedCount) * 100 : 0}%` }}
                        />
                        <div
                          className="h-full bg-orange-500/50"
                          style={{ width: `${generatedCount > 0 ? (pendingCount / generatedCount) * 100 : 0}%` }}
                        />
                      </div>
                      <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
                        <span className="inline-flex items-center gap-1">
                          <Users className="h-3.5 w-3.5" />
                          {activeCount} active staff
                        </span>
                        <span>{Math.round(totalHours)} hrs tracked</span>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {staffProfiles.filter(s => s.is_active).map((staff) => {
                  const payroll = payrollRecords.find(p => p.staff_id === staff.user_id || p.staff_id === staff.staff_id);
                  
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
                                    {INR(Number(payroll.net_salary) || 0)}
                                  </p>
                                  <div className="flex items-center gap-2 text-sm justify-end">
                                    <span className="text-green-500">+{INR(Number(payroll.total_allowances) || 0)}</span>
                                    <span className="text-red-500">-{INR(Number(payroll.total_deductions) || 0)}</span>
                                  </div>
                                  <Badge
                                    variant={String(payroll.payment_status || '').toLowerCase() === 'paid' ? 'default' : 'secondary'}
                                    className={String(payroll.payment_status || '').toLowerCase() === 'paid' ? 'bg-green-500' : ''}
                                  >
                                    {payroll.payment_status?.toUpperCase()}
                                  </Badge>
                                </div>
                                <div className="flex gap-2 mt-3">
                                  <Button
                                    onClick={() => {
                                      setSelectedStaff({ ...staff, staff_id: staff.user_id || staff.staff_id });
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
                                      setSelectedStaff({ ...staff, staff_id: staff.user_id || staff.staff_id });
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
                                    onClick={() => setRegenerateStaffId(staff.user_id)}
                                    variant="outline"
                                    size="sm"
                                    className="border-cuephoria-purple text-cuephoria-purple hover:bg-cuephoria-purple hover:text-white"
                                  >
                                    <RefreshCw className="h-3 w-3 mr-1" />
                                    Regenerate
                                  </Button>
                                  <Button
                                    onClick={() => setRevertPayrollId(payroll.payroll_id)}
                                    variant="outline"
                                    size="sm"
                                    className="border-orange-500 text-orange-500 hover:bg-orange-500 hover:text-white"
                                  >
                                    <Trash2 className="h-3 w-3 mr-1" />
                                    Revert
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
              Add a deduction for {selectedStaff?.username || selectedStaff?.staff_name}
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
                  <SelectItem value="penalty">Penalty</SelectItem>
                  <SelectItem value="advance">Advance Deduction</SelectItem>
                  <SelectItem value="credit_bills">Credit Bills</SelectItem>
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
                placeholder="0.00"
                className="bg-cuephoria-darker border-cuephoria-purple/20"
              />
            </div>
            <div className="space-y-2">
              <Label>Reason</Label>
              <Textarea
                value={deductionForm.reason}
                onChange={(e) => setDeductionForm({...deductionForm, reason: e.target.value})}
                placeholder="Enter reason for deduction"
                className="bg-cuephoria-darker border-cuephoria-purple/20"
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
              Add an allowance for {selectedStaff?.username || selectedStaff?.staff_name}
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
                placeholder="0.00"
                className="bg-cuephoria-darker border-cuephoria-purple/20"
              />
            </div>
            <div className="space-y-2">
              <Label>Reason</Label>
              <Textarea
                value={allowanceForm.reason}
                onChange={(e) => setAllowanceForm({...allowanceForm, reason: e.target.value})}
                placeholder="Enter reason for allowance"
                className="bg-cuephoria-darker border-cuephoria-purple/20"
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

      {/* Regenerate Confirmation */}
      <AlertDialog open={!!regenerateStaffId} onOpenChange={() => setRegenerateStaffId(null)}>
        <AlertDialogContent className="bg-cuephoria-dark border-cuephoria-purple/20 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Regenerate Payroll?</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              This will recalculate the payroll based on current attendance, deductions, and allowances. Previous data will be overwritten.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-cuephoria-purple/20">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRegeneratePayroll}
              className="bg-cuephoria-purple hover:bg-cuephoria-lightpurple"
            >
              Regenerate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Revert Confirmation */}
      <AlertDialog open={!!revertPayrollId} onOpenChange={() => setRevertPayrollId(null)}>
        <AlertDialogContent className="bg-cuephoria-dark border-cuephoria-purple/20 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Revert Payroll?</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              This action cannot be undone. This will permanently delete this payroll record. You can regenerate it later if needed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-cuephoria-purple/20">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRevertPayroll}
              className="bg-orange-600 hover:bg-orange-700"
            >
              Revert
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Approve All Confirmation */}
      <AlertDialog open={showApproveAllDialog} onOpenChange={setShowApproveAllDialog}>
        <AlertDialogContent className="bg-cuephoria-dark border-cuephoria-purple/20 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Approve Payroll for this month?</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              This will mark <span className="text-white font-semibold">all generated payrolls</span> as{' '}
              <span className="text-green-400 font-semibold">PAID</span> for{' '}
              <span className="text-white font-semibold">
                {format(new Date(selectedYear, selectedMonth - 1, 1), 'MMMM yyyy')}
              </span>
              . You can revert individual payrolls if needed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-cuephoria-purple/20">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleApproveAll}
              disabled={isApprovingAll}
              className="bg-green-600 hover:bg-green-700"
            >
              {isApprovingAll ? 'Approving...' : 'Approve All'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default PayrollManagement;
