import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { DollarSign, Download, Plus, Minus, FileText, TrendingUp, RefreshCw, Trash2, Users, CheckCircle2, AlertCircle, Check } from 'lucide-react';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { ResponsiveDialog, ResponsiveDialogContent } from '@/components/ui/responsive-dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { StaffProfile } from '@/types/staff.types';
import { usePayroll } from '@/hooks/staff/usePayroll';

type Props = {
  staffProfiles: StaffProfile[];
  isLoading: boolean;
  onRefresh: () => void;
};

const PayrollPanel: React.FC<Props> = ({ staffProfiles, isLoading, onRefresh }) => {
  const p = usePayroll({ staffProfiles, onRefresh });
  const {
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
    activeStaff, activeCount, generatedCount, coveragePct,
    totalNet, totalAllowances, totalDeductions, totalGross, totalHours, avgNet,
    paidCount, pendingCount, thresholdValue, utilizationPct, thresholdDelta,
    topEarner, topAllowanceTypes, topAllowanceMax, topDeductionTypes, topDeductionMax,
  } = p;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-8 w-8 rounded-full border-4 border-primary/40 border-t-transparent"></div>
      </div>
    );
  }


  return (
    <>
      <div className="space-y-6">
        <Card className="bg-card/30 border-border/50 border-border/50">
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
                  <SelectTrigger className="w-[140px] bg-card/30 border-border/50 border-border/50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-card/30 border-border/50 border-border/50">
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
                  <SelectTrigger className="w-[100px] bg-card/30 border-border/50 border-border/50">
                    <SelectValue />
                  </SelectTrigger>
                      <SelectContent className="bg-card/30 border-border/50 border-border/50">
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
                <div className="animate-spin h-8 w-8 rounded-full border-4 border-primary/40 border-t-transparent"></div>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Insight widgets */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  <Card className="bg-card/30 border-border/50 border-border/40 overflow-hidden relative">
                    <div className="absolute -top-16 -right-16 h-40 w-40 rounded-full bg-primary/15 blur-3xl" />
                    <CardContent className="p-4 relative">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-xs text-muted-foreground">Total payout (Net)</p>
                          <p className="text-2xl font-bold text-white mt-1">{INR(totalNet)}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Avg {INR(avgNet)} / staff
                          </p>
                        </div>
                        <div className="h-10 w-10 rounded-xl bg-primary/10 ring-1 ring-white/10 flex items-center justify-center">
                          <DollarSign className="h-5 w-5 text-primary" />
                        </div>
                      </div>
                      <div className="mt-3 h-1.5 rounded-full bg-white/5 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-primary to-primary/70"
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
                              className="h-7 w-[92px] bg-card/30 border-border/50 border-white/10 text-xs text-gray-100"
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

                  <Card className="bg-card/30 border-border/50 border-border/40 overflow-hidden relative">
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
                                  className="h-full rounded-full bg-gradient-to-r from-green-400/70 to-primary/70/70"
                                  style={{ width: `${topAllowanceMax > 0 ? Math.max(8, Math.round((v / topAllowanceMax) * 100)) : 0}%` }}
                                />
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-card/30 border-border/50 border-border/40 overflow-hidden relative">
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

                  <Card className="bg-card/30 border-border/50 border-border/40 overflow-hidden relative">
                    <div className="absolute -bottom-16 -left-16 h-40 w-40 rounded-full bg-blue-500/10 blur-3xl" />
                    <CardContent className="p-4 relative">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-xs text-muted-foreground">Payroll health</p>
                          <p className="text-2xl font-bold text-white mt-1">{paidCount}/{generatedCount}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            paid • {pendingCount} pending
                          </p>
                        </div>
                        <div className="h-10 w-10 rounded-xl bg-blue-500/10 ring-1 ring-white/10 flex items-center justify-center">
                          {pendingCount > 0 ? (
                            <AlertCircle className="h-5 w-5 text-blue-400" />
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
                      className="bg-card/30 border-border/50 border-border/40"
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="h-12 w-12 rounded-full bg-primary/15 flex items-center justify-center">
                              <span className="text-xl font-bold text-primary">
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
                                    className="border-primary/40 text-primary hover:bg-primary hover:text-white"
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
                                    className="border-border/50"
                                  >
                                    <Download className="h-3 w-3 mr-1" />
                                    Payslip
                                  </Button>
                                </div>
                              </>
                            ) : (
                              <Button
                                onClick={() => handleGeneratePayroll(staff.user_id)}
                                className="btn-gradient border-0"
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
      <ResponsiveDialog open={showDeductionDialog} onOpenChange={setShowDeductionDialog} mobileVariant="sheet-bottom">
        <ResponsiveDialogContent className="bg-card/30 border-border/50 border-border/50 text-white" mobileClassName="px-4 pt-3">
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
                <SelectTrigger className="bg-card/30 border-border/50 border-border/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-card/30 border-border/50 border-border/50">
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
                className="bg-card/30 border-border/50 border-border/50"
              />
            </div>
            <div className="space-y-2">
              <Label>Reason</Label>
              <Textarea
                value={deductionForm.reason}
                onChange={(e) => setDeductionForm({...deductionForm, reason: e.target.value})}
                placeholder="Enter reason for deduction"
                className="bg-card/30 border-border/50 border-border/50"
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
              className="border-border/50"
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
        </ResponsiveDialogContent>
      </ResponsiveDialog>

      {/* Allowance Dialog */}
      <ResponsiveDialog open={showAllowanceDialog} onOpenChange={setShowAllowanceDialog} mobileVariant="sheet-bottom">
        <ResponsiveDialogContent className="bg-card/30 border-border/50 border-border/50 text-white" mobileClassName="px-4 pt-3">
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
                <SelectTrigger className="bg-card/30 border-border/50 border-border/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-card/30 border-border/50 border-border/50">
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
                className="bg-card/30 border-border/50 border-border/50"
              />
            </div>
            <div className="space-y-2">
              <Label>Reason</Label>
              <Textarea
                value={allowanceForm.reason}
                onChange={(e) => setAllowanceForm({...allowanceForm, reason: e.target.value})}
                placeholder="Enter reason for allowance"
                className="bg-card/30 border-border/50 border-border/50"
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
              className="border-border/50"
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
        </ResponsiveDialogContent>
      </ResponsiveDialog>

      {/* Regenerate Confirmation */}
      <AlertDialog open={!!regenerateStaffId} onOpenChange={() => setRegenerateStaffId(null)}>
        <AlertDialogContent className="bg-card/30 border-border/50 border-border/50 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Regenerate Payroll?</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              This will recalculate the payroll based on current attendance, deductions, and allowances. Previous data will be overwritten.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-border/50">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRegeneratePayroll}
              className="btn-gradient border-0"
            >
              Regenerate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Revert Confirmation */}
      <AlertDialog open={!!revertPayrollId} onOpenChange={() => setRevertPayrollId(null)}>
        <AlertDialogContent className="bg-card/30 border-border/50 border-border/50 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Revert Payroll?</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              This action cannot be undone. This will permanently delete this payroll record. You can regenerate it later if needed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-border/50">Cancel</AlertDialogCancel>
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
        <AlertDialogContent className="bg-card/30 border-border/50 border-border/50 text-white">
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
            <AlertDialogCancel className="border-border/50">Cancel</AlertDialogCancel>
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

export default PayrollPanel;
