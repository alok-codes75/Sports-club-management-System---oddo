import React, { useEffect, useMemo, useState } from 'react';
import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch,
} from 'firebase/firestore';
import {
  Check,
  Download,
  FileText,
  Plus,
  Printer,
  Search,
  Users,
  X,
} from 'lucide-react';
import { db, handleFirestoreError, OperationType } from '@/src/services/firebase';
import { useAuth } from '@/src/contexts/AuthContext';
import { markInvoicePaid } from '@/src/services/clubServices';
import {
  addDaysToDateKey,
  DEPARTMENT_LABELS,
  formatInr,
  getDateKey,
  type ClubTransaction,
  type Invoice,
  type LeaveRequest,
  type PaymentMethod,
  type StaffDepartment,
  type StaffRecord,
  type TransactionSource,
} from '@/src/types/club';

type PeriodRange = 'today' | 'week' | 'month';

export function OwnerFinanceHrView() {
  const { firebaseUser, profile } = useAuth();
  const [subTab, setSubTab] = useState<'overview' | 'invoices' | 'payroll' | 'leave'>('overview');
  const [period, setPeriod] = useState<PeriodRange>('month');

  const [transactions, setTransactions] = useState<ClubTransaction[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [staff, setStaff] = useState<StaffRecord[]>([]);
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const [showAllLedger, setShowAllLedger] = useState(false);
  const [staffDeptFilter, setStaffDeptFilter] = useState<StaffDepartment | 'all'>('all');
  const [staffSearch, setStaffSearch] = useState('');

  // New Invoice Modal
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [invClientType, setInvClientType] = useState<'corporate' | 'member'>('corporate');
  const [invName, setInvName] = useState('');
  const [invEmail, setInvEmail] = useState('');
  const [invGstin, setInvGstin] = useState('');
  const [invDesc, setInvDesc] = useState('');
  const [invSubtotal, setInvSubtotal] = useState('25000');

  // New Staff Modal
  const [showStaffModal, setShowStaffModal] = useState(false);
  const [stName, setStName] = useState('');
  const [stEmail, setStEmail] = useState('');
  const [stDept, setStDept] = useState<StaffDepartment>('front_desk');
  const [stShift, setStShift] = useState('Morning · 06:00–14:00');
  const [stSalary, setStSalary] = useState('42000');

  // New Leave Request Form
  const [leaveStart, setLeaveStart] = useState(addDaysToDateKey(getDateKey(), 2));
  const [leaveEnd, setLeaveEnd] = useState(addDaysToDateKey(getDateKey(), 3));
  const [leaveReason, setLeaveReason] = useState('');

  useEffect(() => {
    const unsubTx = onSnapshot(
      query(collection(db, 'transactions'), orderBy('createdAt', 'desc')),
      (snap) => setTransactions(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<ClubTransaction, 'id'>) }))),
      (err) => handleFirestoreError(err, OperationType.LIST, 'transactions')
    );

    const unsubInv = onSnapshot(
      query(collection(db, 'invoices'), orderBy('createdAt', 'desc')),
      (snap) => setInvoices(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Invoice, 'id'>) }))),
      (err) => handleFirestoreError(err, OperationType.LIST, 'invoices')
    );

    const unsubStaff = onSnapshot(
      query(collection(db, 'staffRecords'), orderBy('createdAt', 'desc')),
      (snap) => setStaff(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<StaffRecord, 'id'>) }))),
      (err) => handleFirestoreError(err, OperationType.LIST, 'staffRecords')
    );

    const unsubLeave = onSnapshot(
      query(collection(db, 'leaveRequests'), orderBy('createdAt', 'desc')),
      (snap) => setLeaves(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<LeaveRequest, 'id'>) }))),
      (err) => handleFirestoreError(err, OperationType.LIST, 'leaveRequests')
    );

    return () => {
      unsubTx();
      unsubInv();
      unsubStaff();
      unsubLeave();
    };
  }, []);

  const today = getDateKey(new Date());
  const weekStart = addDaysToDateKey(today, -6);
  const monthStart = `${today.slice(0, 7)}-01`;

  const filteredTx = useMemo(() => {
    return transactions.filter((t) => {
      if (period === 'today') return t.dateKey === today;
      if (period === 'week') return t.dateKey >= weekStart;
      return t.dateKey >= monthStart;
    });
  }, [transactions, period, today, weekStart, monthStart]);

  const analytics = useMemo(() => {
    const totalRevenue = filteredTx.reduce((s, t) => s + t.totalInr, 0);
    const totalGst = filteredTx.reduce((s, t) => s + t.gstInr, 0);
    const totalDiscounts = filteredTx.reduce((s, t) => s + t.discountInr, 0);

    const bySource: Record<TransactionSource, number> = {
      court: 0,
      shop: 0,
      bar: 0,
      membership: 0,
      corporate: 0,
    };
    const byPayment: Record<'upi' | 'card' | 'cash' | 'bank_transfer', number> = {
      upi: 0,
      card: 0,
      cash: 0,
      bank_transfer: 0,
    };

    for (const t of filteredTx) {
      bySource[t.source] = (bySource[t.source] || 0) + t.totalInr;
      byPayment[t.paymentMethod] = (byPayment[t.paymentMethod] || 0) + t.totalInr;
    }

    const monthlyPayrollObligation = staff
      .filter((s) => s.status !== 'inactive')
      .reduce((sum, s) => sum + s.monthlySalaryInr, 0);

    const receivables = invoices
      .filter((i) => i.status !== 'paid')
      .reduce((sum, i) => sum + i.totalInr, 0);

    const byDepartment = (
      Object.keys(DEPARTMENT_LABELS) as StaffDepartment[]
    ).map((dept) => {
      const deptStaff = staff.filter((s) => s.department === dept && s.status !== 'inactive');
      return {
        dept,
        label: DEPARTMENT_LABELS[dept],
        count: deptStaff.length,
        monthlyTotal: deptStaff.reduce((sum, s) => sum + s.monthlySalaryInr, 0),
      };
    });

    return {
      totalRevenue,
      totalGst,
      totalDiscounts,
      bySource,
      byPayment,
      monthlyPayrollObligation,
      receivables,
      byDepartment,
    };
  }, [filteredTx, staff, invoices]);

  const filteredStaff = useMemo(() => {
    const q = staffSearch.trim().toLowerCase();
    return staff
      .filter((s) => {
        if (staffDeptFilter !== 'all' && s.department !== staffDeptFilter) return false;
        if (!q) return true;
        return (
          s.fullName.toLowerCase().includes(q) ||
          s.email.toLowerCase().includes(q) ||
          s.shiftSlot.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => b.monthlySalaryInr - a.monthlySalaryInr);
  }, [staff, staffDeptFilter, staffSearch]);

  const filteredStaffPayroll = useMemo(
    () =>
      filteredStaff
        .filter((s) => s.status !== 'inactive')
        .reduce((sum, s) => sum + s.monthlySalaryInr, 0),
    [filteredStaff]
  );

  const handleExportCsv = () => {
    const headers = ['Date', 'Source', 'Reference', 'Description', 'Payment', 'Subtotal_INR', 'Discount_INR', 'GST_INR', 'Total_INR'];
    const rows = filteredTx.map((t) => [
      t.dateKey,
      t.source,
      t.referenceId,
      `"${t.description.replace(/"/g, '""')}"`,
      t.paymentMethod,
      t.subtotalInr,
      t.discountInr,
      t.gstInr,
      t.totalInr,
    ]);
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `udaan-sports-club-finance-${period}-${today}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setToast(`Exported ${filteredTx.length} transactions (${period}) to CSV.`);
  };

  const handleCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    const sub = Number(invSubtotal) || 0;
    const gst = Math.round(sub * 0.18);
    const total = sub + gst;
    const num = `INV-${today.slice(0, 4)}-${Math.floor(1000 + Math.random() * 8999)}`;
    const id = `inv-${Date.now()}`;
    try {
      const payload: Record<string, unknown> = {
        invoiceNumber: num,
        clientType: invClientType,
        clientName: invName.trim().slice(0, 120),
        clientEmail: invEmail.trim().slice(0, 160),
        description: invDesc.trim().slice(0, 240),
        subtotalInr: sub,
        gstRatePercent: 18,
        gstInr: gst,
        totalInr: total,
        dueDate: addDaysToDateKey(today, 14),
        status: 'sent',
        paymentMethod: 'unpaid',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      if (invGstin.trim()) payload.gstin = invGstin.trim().slice(0, 20);
      await setDoc(doc(db, 'invoices', id), payload);
      setShowInvoiceModal(false);
      setInvName('');
      setInvEmail('');
      setInvGstin('');
      setInvDesc('');
      setToast(`Issued GST invoice ${num} for ${formatInr(total)}.`);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `invoices/${id}`);
    }
  };

  const handlePayInvoice = async (inv: Invoice, pm: PaymentMethod | 'bank_transfer') => {
    if (!firebaseUser) return;
    await markInvoicePaid(inv, pm, firebaseUser.uid);
    setToast(`Marked ${inv.invoiceNumber} paid via ${pm.toUpperCase()} and recorded in ledger.`);
  };

  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    const id = `staff-${Date.now()}`;
    try {
      await setDoc(doc(db, 'staffRecords', id), {
        fullName: stName.trim().slice(0, 100),
        email: stEmail.trim().slice(0, 160),
        department: stDept,
        shiftSlot: stShift.trim().slice(0, 60),
        monthlySalaryInr: Number(stSalary) || 25000,
        status: 'active',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      setShowStaffModal(false);
      setStName('');
      setStEmail('');
      setToast(`Added ${stName.trim()} to staff shift & payroll roster.`);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `staffRecords/${id}`);
    }
  };

  const handleRunMonthlyPayroll = async () => {
    const monthKey = today.slice(0, 7);
    const activeStaff = staff.filter((s) => s.status !== 'inactive');
    if (activeStaff.length === 0) return;
    try {
      const batch = writeBatch(db);
      for (const s of activeStaff) {
        batch.update(doc(db, 'staffRecords', s.id), {
          lastPaidMonth: monthKey,
          updatedAt: serverTimestamp(),
        });
      }
      await batch.commit();
      setToast(
        `Processed ${monthKey} payroll for ${activeStaff.length} staff (${formatInr(
          analytics.monthlyPayrollObligation
        )}).`
      );
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, 'staffRecords');
    }
  };

  const handleSubmitLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firebaseUser || leaveReason.trim().length < 3) return;
    const id = `leave-${Date.now()}`;
    try {
      await setDoc(doc(db, 'leaveRequests', id), {
        staffUid: firebaseUser.uid,
        staffName: profile?.displayName ?? 'Club Staff',
        startDate: leaveStart,
        endDate: leaveEnd,
        daysCount: 2,
        reason: leaveReason.trim().slice(0, 300),
        status: 'pending',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      setLeaveReason('');
      setToast('Leave application submitted for approval.');
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `leaveRequests/${id}`);
    }
  };

  const handleLeaveDecision = async (leave: LeaveRequest, decision: 'approved' | 'rejected') => {
    try {
      await updateDoc(doc(db, 'leaveRequests', leave.id), {
        status: decision,
        reviewerNotes: decision === 'approved' ? 'Approved by Club Owner.' : 'Unable to approve due to peak shift cover.',
        updatedAt: serverTimestamp(),
      });
      setToast(`Leave request for ${leave.staffName} marked ${decision}.`);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `leaveRequests/${leave.id}`);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-3xl font-bold text-slate-900">
            Owner Finance, Invoicing, HR &amp; Tax Command Center
          </h2>
          <p className="text-sm text-slate-600">
            Every rupee across Courts, Gear Shop, Bar, Memberships, and Corporate Invoices — plus
            staff payroll, leave approvals, and GST tax reporting.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-lg self-start">
          {(
            [
              { id: 'overview', label: 'Revenue & GST' },
              { id: 'invoices', label: `Invoices (${invoices.length})` },
              { id: 'payroll', label: `Staff & Payroll (${staff.length})` },
              { id: 'leave', label: `Leave (${leaves.filter((l) => l.status === 'pending').length})` },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setSubTab(t.id)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md whitespace-nowrap ${
                subTab === t.id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {toast && (
        <div className="flex items-center justify-between gap-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold px-4 py-3 rounded-lg">
          <span className="inline-flex items-center gap-2">
            <Check className="w-4 h-4" />
            {toast}
          </span>
          <button type="button" onClick={() => setToast(null)} className="underline">
            Dismiss
          </button>
        </div>
      )}

      {subTab === 'overview' && (
        <div className="space-y-6">
          {/* Period Switcher + Shareable Reports */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
              {(
                [
                  { id: 'today', label: 'Today' },
                  { id: 'week', label: 'This Week' },
                  { id: 'month', label: 'This Month' },
                ] as const
              ).map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPeriod(p.id)}
                  className={`px-3.5 py-1.5 text-xs font-semibold rounded-md ${
                    period === p.id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleExportCsv}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg"
              >
                <Download className="w-3.5 h-3.5" />
                Download CSV Report
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-800 bg-white border border-slate-300 hover:border-slate-400 rounded-lg"
              >
                <Printer className="w-3.5 h-3.5" />
                Print Summary
              </button>
            </div>
          </div>

          {/* 4-Column Executive KPI Row */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <div className="text-xs text-slate-500">Total Club Revenue ({period})</div>
              <div className="font-mono text-2xl font-semibold tabular-nums text-blue-700 mt-1">
                {formatInr(analytics.totalRevenue)}
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                {filteredTx.length} transactions · {formatInr(analytics.totalDiscounts)} member savings
              </div>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <div className="text-xs text-slate-500">GST Tax Liability ({period})</div>
              <div className="font-mono text-2xl font-semibold tabular-nums text-slate-900 mt-1">
                {formatInr(analytics.totalGst)}
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                18% Courts/Shop/Plans · 5% Bar F&amp;B
              </div>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <div className="text-xs text-slate-500">Monthly Staff Payroll Owed</div>
              <div className="font-mono text-2xl font-semibold tabular-nums text-amber-700 mt-1">
                {formatInr(analytics.monthlyPayrollObligation)}
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                Across {staff.filter((s) => s.status !== 'inactive').length} active employees
              </div>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <div className="text-xs text-slate-500">Unpaid Client Receivables</div>
              <div className="font-mono text-2xl font-semibold tabular-nums text-emerald-700 mt-1">
                {formatInr(analytics.receivables)}
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                {invoices.filter((i) => i.status !== 'paid').length} open invoices
              </div>
            </div>
          </div>

          {/* Revenue by Stream & Payment Method Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
              <h3 className="font-display text-2xl font-bold text-slate-900">
                Where Did We Earn From? (By Stream)
              </h3>
              {(
                [
                  { key: 'court', label: 'Court Bookings & Social Play' },
                  { key: 'shop', label: 'Gear Shop (Counter + Online)' },
                  { key: 'bar', label: 'Bar & Cafeteria' },
                  { key: 'membership', label: 'Memberships' },
                  { key: 'corporate', label: 'Corporate & Business Clients' },
                ] as const
              ).map((item) => {
                const val = analytics.bySource[item.key];
                const pct =
                  analytics.totalRevenue > 0 ? Math.round((val / analytics.totalRevenue) * 100) : 0;
                return (
                  <div key={item.key} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="font-medium text-slate-700">{item.label}</span>
                      <span className="font-mono font-semibold tabular-nums text-slate-900">
                        {formatInr(val)} ({pct}%)
                      </span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-700 rounded-full transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
              <h3 className="font-display text-2xl font-bold text-slate-900">
                Payment Mode Split (UPI, Card, Cash &amp; Bank)
              </h3>
              {(
                [
                  { key: 'upi', label: 'UPI Digital Payments' },
                  { key: 'card', label: 'Credit & Debit Cards' },
                  { key: 'cash', label: 'Cash Register' },
                  { key: 'bank_transfer', label: 'Corporate Bank Transfer (NEFT/RTGS)' },
                ] as const
              ).map((pm) => {
                const val = analytics.byPayment[pm.key];
                const pct =
                  analytics.totalRevenue > 0 ? Math.round((val / analytics.totalRevenue) * 100) : 0;
                return (
                  <div key={pm.key} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="font-medium text-slate-700">{pm.label}</span>
                      <span className="font-mono font-semibold tabular-nums text-slate-900">
                        {formatInr(val)} ({pct}%)
                      </span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-lime-500 rounded-full transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Unified Ledger Table */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-x-auto">
            <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between gap-3">
              <div className="font-display text-xl font-bold text-slate-900">
                Unified Financial Ledger ({filteredTx.length} Entries)
              </div>
              {filteredTx.length > 20 && (
                <button
                  type="button"
                  onClick={() => setShowAllLedger((prev) => !prev)}
                  className="text-xs font-semibold text-blue-700 hover:underline whitespace-nowrap"
                >
                  {showAllLedger ? 'Show Latest 20' : `View All ${filteredTx.length} Entries`}
                </button>
              )}
            </div>
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs text-slate-500">
                  <th className="py-2.5 px-4 font-semibold">Date &amp; Ref</th>
                  <th className="py-2.5 px-4 font-semibold">Stream &amp; Description</th>
                  <th className="py-2.5 px-4 font-semibold">Payment</th>
                  <th className="py-2.5 px-4 font-semibold text-right">GST</th>
                  <th className="py-2.5 px-4 font-semibold text-right">Total (INR)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {(showAllLedger ? filteredTx : filteredTx.slice(0, 20)).map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50">
                    <td className="py-2.5 px-4 font-mono text-xs text-slate-600">
                      <div>{t.dateKey}</div>
                      <div className="text-[11px] text-slate-400">{t.referenceId}</div>
                    </td>
                    <td className="py-2.5 px-4">
                      <div className="text-xs font-semibold capitalize text-blue-700">{t.source}</div>
                      <div className="text-xs text-slate-800">{t.description}</div>
                    </td>
                    <td className="py-2.5 px-4 text-xs font-mono uppercase text-slate-600">
                      {t.paymentMethod.replace('_', ' ')}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono text-xs text-slate-600 tabular-nums">
                      {formatInr(t.gstInr)}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono text-xs font-semibold text-slate-900 tabular-nums">
                      {formatInr(t.totalInr)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {subTab === 'invoices' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => setShowInvoiceModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg"
            >
              <FileText className="w-4 h-4" />
              New Membership / Corporate Invoice
            </button>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs text-slate-500">
                  <th className="py-3 px-4 font-semibold">Invoice &amp; Client</th>
                  <th className="py-3 px-4 font-semibold">Description</th>
                  <th className="py-3 px-4 font-semibold text-right">Total (Incl. 18% GST)</th>
                  <th className="py-3 px-4 font-semibold">Status</th>
                  <th className="py-3 px-4 font-semibold text-right">Settle</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50">
                    <td className="py-3 px-4">
                      <div className="font-mono text-xs font-semibold text-blue-700">
                        {inv.invoiceNumber} · <span className="uppercase">{inv.clientType}</span>
                      </div>
                      <div className="font-semibold text-slate-900">{inv.clientName}</div>
                      {inv.gstin && <div className="font-mono text-[11px] text-slate-500">GSTIN: {inv.gstin}</div>}
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-700">
                      <div>{inv.description}</div>
                      <div className="font-mono text-[11px] text-slate-500">Due {inv.dueDate}</div>
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-xs tabular-nums">
                      <div className="font-semibold text-slate-900">{formatInr(inv.totalInr)}</div>
                      <div className="text-slate-500">GST {formatInr(inv.gstInr)}</div>
                    </td>
                    <td className="py-3 px-4 text-xs font-semibold capitalize">
                      <span className={inv.status === 'paid' ? 'text-emerald-700' : 'text-amber-700'}>
                        {inv.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right space-x-2">
                      {inv.status !== 'paid' && (
                        <>
                          <button
                            type="button"
                            onClick={() => void handlePayInvoice(inv, 'upi')}
                            className="text-xs font-semibold text-blue-700 hover:underline"
                          >
                            Paid UPI
                          </button>
                          <button
                            type="button"
                            onClick={() => void handlePayInvoice(inv, 'bank_transfer')}
                            className="text-xs font-semibold text-emerald-700 hover:underline"
                          >
                            Paid Bank
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {subTab === 'payroll' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white border border-slate-200 rounded-xl p-5">
            <div>
              <div className="text-xs text-slate-500">
                Monthly Active Payroll Total ({staff.filter((s) => s.status !== 'inactive').length} Employees)
              </div>
              <div className="font-mono text-2xl font-semibold text-slate-900 tabular-nums mt-0.5">
                {formatInr(analytics.monthlyPayrollObligation)}
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                Annualized Payroll Run-Rate:{' '}
                <span className="font-mono font-semibold text-slate-700">
                  {formatInr(analytics.monthlyPayrollObligation * 12)}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowStaffModal(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-800 bg-white border border-slate-300 hover:border-slate-400 rounded-lg"
              >
                <Plus className="w-4 h-4" />
                Add Employee
              </button>
              <button
                type="button"
                onClick={() => void handleRunMonthlyPayroll()}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg"
              >
                <Users className="w-4 h-4" />
                Run {today.slice(0, 7)} Payroll
              </button>
            </div>
          </div>

          {/* Department Payroll Summary Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {analytics.byDepartment.map((d) => {
              const selected = staffDeptFilter === d.dept;
              return (
                <button
                  key={d.dept}
                  type="button"
                  onClick={() => setStaffDeptFilter(selected ? 'all' : d.dept)}
                  className={`text-left rounded-xl p-3.5 border transition-colors ${
                    selected
                      ? 'bg-blue-50 border-blue-400 ring-1 ring-blue-400'
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="text-[11px] font-semibold text-slate-500 truncate">{d.label}</div>
                  <div className="font-mono text-base font-semibold text-slate-900 tabular-nums mt-1">
                    {formatInr(d.monthlyTotal)}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    {d.count} {d.count === 1 ? 'employee' : 'employees'}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Department Filter & Employee Search */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-lg w-fit">
              <button
                type="button"
                onClick={() => setStaffDeptFilter('all')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md whitespace-nowrap ${
                  staffDeptFilter === 'all' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
                }`}
              >
                All ({staff.length})
              </button>
              {(Object.keys(DEPARTMENT_LABELS) as StaffDepartment[]).map((dept) => (
                <button
                  key={dept}
                  type="button"
                  onClick={() => setStaffDeptFilter(dept)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md whitespace-nowrap ${
                    staffDeptFilter === dept ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
                  }`}
                >
                  {DEPARTMENT_LABELS[dept]}
                </button>
              ))}
            </div>

            <div className="relative w-full lg:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={staffSearch}
                onChange={(e) => setStaffSearch(e.target.value)}
                placeholder="Search employee name, email, role..."
                className="w-full pl-9 pr-3.5 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="px-4 py-2.5 border-b border-slate-200 bg-slate-50/80 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
              <span>
                Showing <span className="font-mono font-semibold text-slate-900">{filteredStaff.length}</span> of{' '}
                <span className="font-mono font-semibold text-slate-900">{staff.length}</span> employees
              </span>
              <span>
                Filtered Monthly Payroll:{' '}
                <span className="font-mono font-semibold text-blue-700 tabular-nums">
                  {formatInr(filteredStaffPayroll)}
                </span>
              </span>
            </div>
            <div className="overflow-x-auto max-h-[640px] overflow-y-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead className="sticky top-0 z-10">
                  <tr className="border-b border-slate-200 bg-slate-50 text-xs text-slate-500">
                    <th className="py-3 px-4 font-semibold">Employee</th>
                    <th className="py-3 px-4 font-semibold">Department &amp; Designation / Shift</th>
                    <th className="py-3 px-4 font-semibold text-right">Monthly Salary</th>
                    <th className="py-3 px-4 font-semibold">Last Paid Month</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredStaff.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900">{s.fullName}</div>
                        <div className="font-mono text-xs text-slate-500">{s.email}</div>
                      </td>
                      <td className="py-3 px-4 text-xs">
                        <div className="font-semibold text-slate-800">{DEPARTMENT_LABELS[s.department]}</div>
                        <div className="text-slate-500">{s.shiftSlot}</div>
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-xs font-semibold tabular-nums text-slate-900">
                        {formatInr(s.monthlySalaryInr)}
                      </td>
                      <td className="py-3 px-4 font-mono text-xs">
                        <span
                          className={
                            s.lastPaidMonth === today.slice(0, 7)
                              ? 'text-emerald-700 font-semibold'
                              : 'text-amber-700 font-semibold'
                          }
                        >
                          {s.lastPaidMonth || 'Pending'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {subTab === 'leave' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-200 font-display text-xl font-bold text-slate-900">
              Staff Leave Requests
            </div>
            <div className="divide-y divide-slate-200">
              {leaves.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-500">No leave applications yet.</div>
              ) : (
                leaves.map((l) => (
                  <div key={l.id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <div className="font-semibold text-slate-900 text-sm">{l.staffName}</div>
                      <div className="font-mono text-xs text-slate-500">
                        {l.startDate} → {l.endDate} ({l.daysCount} days)
                      </div>
                      <p className="text-xs text-slate-600 mt-1">{l.reason}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {l.status === 'pending' ? (
                        <>
                          <button
                            type="button"
                            onClick={() => void handleLeaveDecision(l, 'approved')}
                            className="px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg"
                          >
                            Approve
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleLeaveDecision(l, 'rejected')}
                            className="px-3 py-1.5 text-xs font-semibold text-red-700 bg-red-50 hover:bg-red-100 rounded-lg"
                          >
                            Reject
                          </button>
                        </>
                      ) : (
                        <span
                          className={`text-xs font-semibold capitalize ${
                            l.status === 'approved' ? 'text-emerald-700' : 'text-red-600'
                          }`}
                        >
                          {l.status}
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <form
            onSubmit={handleSubmitLeave}
            className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-6 space-y-4"
          >
            <h3 className="font-display text-2xl font-bold text-slate-900">Log Leave Application</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Start Date</label>
                <input
                  type="date"
                  required
                  value={leaveStart}
                  onChange={(e) => setLeaveStart(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">End Date</label>
                <input
                  type="date"
                  required
                  value={leaveEnd}
                  onChange={(e) => setLeaveEnd(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Reason &amp; Cover Plan *</label>
              <textarea
                rows={3}
                required
                value={leaveReason}
                onChange={(e) => setLeaveReason(e.target.value)}
                placeholder="Reason and shift replacement details..."
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
              />
            </div>
            <button
              type="submit"
              className="w-full py-2 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg"
            >
              Submit Leave Request
            </button>
          </form>
        </div>
      )}

      {/* New Invoice Modal */}
      {showInvoiceModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md p-6 shadow-xl">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-200">
              <h3 className="font-display text-2xl font-bold text-slate-900">Create GST Invoice</h3>
              <button type="button" onClick={() => setShowInvoiceModal(false)}>
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>
            <form onSubmit={handleCreateInvoice} className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                {(['corporate', 'member'] as const).map((ct) => (
                  <button
                    key={ct}
                    type="button"
                    onClick={() => setInvClientType(ct)}
                    className={`py-2 text-xs font-semibold capitalize rounded-lg border ${
                      invClientType === ct
                        ? 'bg-blue-700 text-white border-blue-700'
                        : 'bg-white text-slate-700 border-slate-300'
                    }`}
                  >
                    {ct} Client
                  </button>
                ))}
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Client / Company Name *</label>
                <input
                  type="text"
                  required
                  value={invName}
                  onChange={(e) => setInvName(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Email *</label>
                  <input
                    type="email"
                    required
                    value={invEmail}
                    onChange={(e) => setInvEmail(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">GSTIN (Optional)</label>
                  <input
                    type="text"
                    value={invGstin}
                    onChange={(e) => setInvGstin(e.target.value)}
                    placeholder="04AABCU..."
                    className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Line Description *</label>
                <input
                  type="text"
                  required
                  value={invDesc}
                  onChange={(e) => setInvDesc(e.target.value)}
                  placeholder="Corporate box cricket league / Annual membership..."
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Subtotal Before 18% GST (INR) *
                </label>
                <input
                  type="number"
                  required
                  min={100}
                  value={invSubtotal}
                  onChange={(e) => setInvSubtotal(e.target.value)}
                  className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg"
                />
              </div>
              <button
                type="submit"
                className="w-full py-2.5 text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg"
              >
                Issue Invoice ({formatInr(Math.round((Number(invSubtotal) || 0) * 1.18))} incl. GST)
              </button>
            </form>
          </div>
        </div>
      )}

      {/* New Staff Modal */}
      {showStaffModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md p-6 shadow-xl">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-200">
              <h3 className="font-display text-2xl font-bold text-slate-900">Add Staff Member</h3>
              <button type="button" onClick={() => setShowStaffModal(false)}>
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>
            <form onSubmit={handleAddStaff} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={stName}
                  onChange={(e) => setStName(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Work Email *</label>
                <input
                  type="email"
                  required
                  value={stEmail}
                  onChange={(e) => setStEmail(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Department</label>
                  <select
                    value={stDept}
                    onChange={(e) => setStDept(e.target.value as StaffDepartment)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
                  >
                    {(Object.keys(DEPARTMENT_LABELS) as StaffDepartment[]).map((d) => (
                      <option key={d} value={d}>
                        {DEPARTMENT_LABELS[d]}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Monthly Salary (INR)</label>
                  <input
                    type="number"
                    required
                    min={5000}
                    value={stSalary}
                    onChange={(e) => setStSalary(e.target.value)}
                    className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Shift Schedule</label>
                <input
                  type="text"
                  required
                  value={stShift}
                  onChange={(e) => setStShift(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>
              <button
                type="submit"
                className="w-full py-2.5 text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg"
              >
                Save to Roster
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
