import { useEffect, useMemo, useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';
import { format } from 'date-fns';
import { downloadAdminPayslip } from '@/services/staff/payrollPdf';
import type { StaffProfile } from '@/types/staff.types';
import { staffProfileIds } from '@/services/staff/staffMappers';
import { fetchPayrollForMonth } from '@/services/staff/staffApi';
import {
  generateMonthlyPayroll,
  revertPayroll,
  addDeduction,
  addAllowance,
  approveAllPayroll,
} from '@/services/staff/staffRpc';

type UsePayrollOptions = {
  staffProfiles: StaffProfile[];
  onRefresh: () => void;
};

export function usePayroll({ staffProfiles, onRefresh }: UsePayrollOptions) {
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

  const scopedStaffIds = useMemo(() => staffProfileIds(staffProfiles), [staffProfiles]);

  const fetchPayrollRecordsScoped = useCallback(async () => {
    setIsLoadingPayroll(true);
    try {
      const data = await fetchPayrollForMonth(scopedStaffIds, selectedMonth, selectedYear);
      setPayrollRecords(data || []);
    } catch (error: unknown) {
      console.error('Error fetching payroll:', error);
      toast({ title: 'Error', description: 'Failed to load payroll records', variant: 'destructive' });
    } finally {
      setIsLoadingPayroll(false);
    }
  }, [selectedMonth, selectedYear, scopedStaffIds, toast]);

  useEffect(() => {
    void fetchPayrollRecordsScoped();
  }, [fetchPayrollRecordsScoped]);

  const handleGeneratePayroll = async (staffId: string) => {
    try {
      await generateMonthlyPayroll(staffId, selectedMonth, selectedYear, user?.username || 'admin');

      toast({
        title: 'Success',
        description: 'Payroll generated successfully'
      });

      fetchPayrollRecordsScoped();
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
      await generateMonthlyPayroll(regenerateStaffId, selectedMonth, selectedYear, 'admin');

      toast({
        title: 'Success',
        description: 'Payroll regenerated successfully'
      });

      setRegenerateStaffId(null);
      fetchPayrollRecordsScoped();
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
      await revertPayroll(revertPayrollId);

      toast({
        title: 'Success',
        description: 'Payroll reverted successfully'
      });

      setRevertPayrollId(null);
      fetchPayrollRecordsScoped();
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

  const resolveStaffLocationId = (staffId: string): string | null => {
    const profile = staffProfiles.find((p) => p.user_id === staffId);
    return profile?.location_id ?? null;
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
      const locationId = resolveStaffLocationId(selectedStaff.staff_id);
      if (!locationId) {
        toast({
          title: 'Validation Error',
          description: 'Staff member has no branch assigned. Update their profile in Settings.',
          variant: 'destructive',
        });
        return;
      }

      await addDeduction({
        staffId: selectedStaff.staff_id,
        locationId,
        deductionType: deductionForm.type,
        amount: parseFloat(deductionForm.amount),
        reason: deductionForm.reason,
        markedBy: user?.username || 'admin',
        month: selectedMonth,
        year: selectedYear,
        deductionDate: new Date().toISOString().split('T')[0],
      });

      toast({
        title: 'Success',
        description: 'Deduction added successfully. Please regenerate payroll to apply changes.'
      });

      setShowDeductionDialog(false);
      setDeductionForm({ type: 'lop', amount: '', reason: '' });
      setSelectedStaff(null);
      fetchPayrollRecordsScoped();
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
      const locationId = resolveStaffLocationId(selectedStaff.staff_id);
      if (!locationId) {
        toast({
          title: 'Validation Error',
          description: 'Staff member has no branch assigned. Update their profile in Settings.',
          variant: 'destructive',
        });
        return;
      }

      await addAllowance({
        staffId: selectedStaff.staff_id,
        locationId,
        allowanceType: allowanceForm.type,
        amount: parseFloat(allowanceForm.amount),
        reason: allowanceForm.reason,
        approvedBy: user?.username || 'admin',
        month: selectedMonth,
        year: selectedYear,
      });

      toast({
        title: 'Success',
        description: 'Allowance added successfully. Please regenerate payroll to apply changes.'
      });

      setShowAllowanceDialog(false);
      setAllowanceForm({ type: 'bonus', amount: '', reason: '' });
      setSelectedStaff(null);
      fetchPayrollRecordsScoped();
    } catch (error: any) {
      console.error('Error adding allowance:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to add allowance',
        variant: 'destructive'
      });
    }
  };


  const handleApproveAll = async () => {
    setIsApprovingAll(true);
    try {
      await approveAllPayroll(scopedStaffIds, selectedMonth, selectedYear);

      toast({
        title: 'Approved',
        description: `Marked payroll as paid for ${format(new Date(selectedYear, selectedMonth - 1, 1), 'MMMM yyyy')}.`,
      });

      setShowApproveAllDialog(false);
      await fetchPayrollRecordsScoped();
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


  const handleDownloadPayslip = useCallback(
    (payroll: Record<string, unknown>) => downloadAdminPayslip(payroll, toast),
    [toast],
  );

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
    details.forEach((a: { type?: string; amount?: number }) => {
      const key = String(a?.type || 'other');
      acc[key] = (acc[key] || 0) + (Number(a?.amount) || 0);
    });
    return acc;
  }, {});
  const topAllowanceTypes = Object.entries(allowanceTotals).sort((a, b) => b[1] - a[1]).slice(0, 3);
  const topAllowanceMax = topAllowanceTypes[0]?.[1] || 0;
  const deductionTotals = payrollRecords.reduce<Record<string, number>>((acc, p) => {
    const details = Array.isArray(p.deductions_detail) ? p.deductions_detail : [];
    details.forEach((d: { type?: string; amount?: number }) => {
      const key = String(d?.type || 'other');
      acc[key] = (acc[key] || 0) + (Number(d?.amount) || 0);
    });
    return acc;
  }, {});
  const topDeductionTypes = Object.entries(deductionTotals).sort((a, b) => b[1] - a[1]).slice(0, 3);
  const topDeductionMax = topDeductionTypes[0]?.[1] || 0;

  return {
    selectedMonth, setSelectedMonth, selectedYear, setSelectedYear,
    payrollRecords, isLoadingPayroll, payoutThreshold, setPayoutThreshold,
    showApproveAllDialog, setShowApproveAllDialog, isApprovingAll,
    showDeductionDialog, setShowDeductionDialog, showAllowanceDialog, setShowAllowanceDialog,
    revertPayrollId, setRevertPayrollId, regenerateStaffId, setRegenerateStaffId,
    selectedStaff, setSelectedStaff, deductionForm, setDeductionForm,
    allowanceForm, setAllowanceForm,
    INR, formatLabel,
    handleGeneratePayroll, handleRegeneratePayroll, handleRevertPayroll,
    handleAddDeduction, handleAddAllowance, handleDownloadPayslip, handleApproveAll,
    fetchPayrollRecords: fetchPayrollRecordsScoped,
    activeStaff, activeCount, generatedCount, coveragePct,
    totalNet, totalAllowances, totalDeductions, totalGross, totalHours, avgNet,
    paidCount, pendingCount, thresholdValue, utilizationPct, thresholdDelta,
    topEarner, topAllowanceTypes, topAllowanceMax, topDeductionTypes, topDeductionMax,
  };
}
