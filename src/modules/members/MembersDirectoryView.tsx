import React, { useEffect, useMemo, useState } from 'react';
import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import {
  AlertCircle,
  Check,
  Plus,
  RefreshCw,
  Search,
  UserPlus,
  X,
} from 'lucide-react';
import { db, handleFirestoreError, OperationType } from '@/src/services/firebase';
import { useAuth } from '@/src/contexts/AuthContext';
import { enrollMemberRecord } from '@/src/services/clubServices';
import {
  addDaysToDateKey,
  calculateAgeYears,
  computeMemberExpiryStatus,
  formatInr,
  getDateKey,
  TIER_ENTITLEMENTS,
  VALIDATION_BOUNDS,
  type Booking,
  type Member,
  type MembershipTier,
  type MemberStatus,
  type PaymentMethod,
} from '@/src/types/club';

interface PrefillEnrollment {
  fullName: string;
  email: string;
  phone: string;
  tier: MembershipTier;
  sourceEnquiryId?: string;
}

interface MembersDirectoryViewProps {
  prefill?: PrefillEnrollment | null;
  onClearPrefill?: () => void;
}

export function MembersDirectoryView({ prefill, onClearPrefill }: MembersDirectoryViewProps) {
  const { firebaseUser } = useAuth();
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [tierFilter, setTierFilter] = useState<MembershipTier | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<MemberStatus | 'all'>('all');

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [memberBookings, setMemberBookings] = useState<Booking[]>([]);

  const [showEnrollModal, setShowEnrollModal] = useState(false);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [dob, setDob] = useState('');
  const [tier, setTier] = useState<MembershipTier>('gold');
  const [durationMonths, setDurationMonths] = useState<number>(1);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('upi');
  const [notes, setNotes] = useState('');
  const [sourceEnquiryId, setSourceEnquiryId] = useState<string | undefined>(undefined);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (prefill) {
      setFullName(prefill.fullName);
      setEmail(prefill.email);
      setPhone(prefill.phone);
      setTier(prefill.tier);
      setSourceEnquiryId(prefill.sourceEnquiryId);
      setShowEnrollModal(true);
    }
  }, [prefill]);

  useEffect(() => {
    const q = query(collection(db, 'members'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const list = snap.docs.map((d) => {
          const raw = d.data() as Omit<Member, 'id'>;
          const computed =
            raw.status === 'suspended' ? 'suspended' : computeMemberExpiryStatus(raw.expiryDate);
          return { id: d.id, ...raw, status: computed };
        });
        setMembers(list);
        setLoading(false);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'members')
    );
    return () => unsub();
  }, []);

  const selectedMember = useMemo(
    () => members.find((m) => m.id === selectedId) ?? null,
    [members, selectedId]
  );

  useEffect(() => {
    if (!selectedMember) {
      setMemberBookings([]);
      return;
    }
    const q = query(collection(db, 'bookings'), where('memberId', '==', selectedMember.id));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const list = snap.docs
          .map((d) => ({ id: d.id, ...(d.data() as Omit<Booking, 'id'>) }))
          .sort((a, b) => (b.date + b.startTime).localeCompare(a.date + a.startTime));
        setMemberBookings(list.slice(0, 8));
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'bookings')
    );
    return () => unsub();
  }, [selectedMember]);

  const filtered = useMemo(() => {
    const term = searchText.trim().toLowerCase();
    return members.filter((m) => {
      if (tierFilter !== 'all' && m.tier !== tierFilter) return false;
      if (statusFilter !== 'all' && m.status !== statusFilter) return false;
      if (!term) return true;
      return (
        m.fullName.toLowerCase().includes(term) ||
        m.memberCode.toLowerCase().includes(term) ||
        m.phone.toLowerCase().includes(term) ||
        m.email.toLowerCase().includes(term)
      );
    });
  }, [members, tierFilter, statusFilter, searchText]);

  const stats = useMemo(
    () => ({
      total: members.length,
      active: members.filter((m) => m.status === 'active').length,
      expiring: members.filter((m) => m.status === 'expiring_soon').length,
      expired: members.filter((m) => m.status === 'expired').length,
    }),
    [members]
  );

  const handleEnroll = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firebaseUser) return;
    setFormError(null);

    if (fullName.trim().length < 2) {
      setFormError('Enter member full name.');
      return;
    }
    if (!VALIDATION_BOUNDS.emailPattern.test(email.trim())) {
      setFormError('Enter a valid email address.');
      return;
    }
    if (phone.trim().length < 10 || !VALIDATION_BOUNDS.phonePattern.test(phone.trim())) {
      setFormError('Enter a valid 10-digit mobile number.');
      return;
    }
    if (tier === 'junior') {
      if (!dob) {
        setFormError('Date of birth is required to verify Junior (<18) membership eligibility.');
        return;
      }
      if (calculateAgeYears(dob) >= 18) {
        setFormError('Junior membership is strictly for athletes under 18. Choose Gold or Silver.');
        return;
      }
    }

    setSubmitting(true);
    try {
      const res = await enrollMemberRecord({
        fullName,
        email,
        phone,
        dob: dob || undefined,
        tier,
        durationMonths,
        paymentMethod,
        notes,
        recordedByUid: firebaseUser.uid,
        sourceEnquiryId,
      });
      setToast(`Enrolled ${fullName.trim()} (${res.memberCode}) and logged payment in ledger.`);
      setShowEnrollModal(false);
      setFullName('');
      setEmail('');
      setPhone('');
      setDob('');
      setNotes('');
      setSourceEnquiryId(undefined);
      onClearPrefill?.();
      setSelectedId(res.memberId);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Unable to enroll member.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRenewMember = async (member: Member, extraDays: number) => {
    const today = getDateKey(new Date());
    const baseDate = member.expiryDate > today ? member.expiryDate : today;
    const nextExpiry = addDaysToDateKey(baseDate, extraDays);
    try {
      await updateDoc(doc(db, 'members', member.id), {
        expiryDate: nextExpiry,
        status: 'active',
        updatedAt: serverTimestamp(),
      });
      setToast(`Renewed ${member.fullName} through ${nextExpiry}.`);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `members/${member.id}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & KPI Strip */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-3xl font-bold text-slate-900">
            Member Directory &amp; Front Desk Recognition
          </h2>
          <p className="text-sm text-slate-600">
            Instantly recognize members by code, name, or phone, inspect tier entitlements, and
            catch expiring plans automatically.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setFormError(null);
            setShowEnrollModal(true);
          }}
          className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors whitespace-nowrap self-start"
        >
          <UserPlus className="w-4 h-4" />
          Enroll New Member
        </button>
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

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="text-xs text-slate-500">Total Club Members</div>
          <div className="font-mono text-2xl font-semibold tabular-nums text-slate-900 mt-1">
            {stats.total}
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="text-xs text-slate-500">Active Memberships</div>
          <div className="font-mono text-2xl font-semibold tabular-nums text-emerald-700 mt-1">
            {stats.active}
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="text-xs text-slate-500">Expiring Within 14 Days</div>
          <div className="font-mono text-2xl font-semibold tabular-nums text-amber-700 mt-1">
            {stats.expiring}
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="text-xs text-slate-500">Expired (Renewal Needed)</div>
          <div className="font-mono text-2xl font-semibold tabular-nums text-red-600 mt-1">
            {stats.expired}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
            {(['all', 'gold', 'silver', 'junior'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTierFilter(t)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                  tierFilter === t
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {t === 'all' ? 'All Tiers' : TIER_ENTITLEMENTS[t].name}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
            {(
              [
                { id: 'all', label: 'All Status' },
                { id: 'active', label: 'Active' },
                { id: 'expiring_soon', label: 'Expiring Soon' },
                { id: 'expired', label: 'Expired' },
              ] as const
            ).map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setStatusFilter(s.id)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                  statusFilter === s.id
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        <div className="relative w-full lg:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder="Lookup code, name, or phone..."
            className="w-full pl-9 pr-3.5 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
          />
        </div>
      </div>

      {/* Master-Detail Split */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        <div className="xl:col-span-7 bg-white border border-slate-200 rounded-xl overflow-hidden">
          {loading ? (
            <div className="p-6 space-y-3">
              <div className="h-10 bg-slate-100 rounded animate-pulse" />
              <div className="h-10 bg-slate-100 rounded animate-pulse" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-10 text-center text-sm text-slate-500">
              No members match this filter. Enroll a new walk-in member or adjust your search.
            </div>
          ) : (
            <div>
              <div className="px-4 py-2.5 border-b border-slate-200 bg-slate-50/80 flex items-center justify-between text-xs text-slate-600">
                <span>
                  Showing <span className="font-mono font-semibold text-slate-900">{filtered.length}</span> of{' '}
                  <span className="font-mono font-semibold text-slate-900">{members.length}</span> members
                </span>
                <span className="text-[11px] text-slate-400">Click any row for card &amp; history</span>
              </div>
              <div className="overflow-x-auto max-h-[680px] overflow-y-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead className="sticky top-0 z-10">
                    <tr className="border-b border-slate-200 bg-slate-50 text-xs text-slate-500">
                      <th className="py-2.5 px-4 font-semibold">Member &amp; Code</th>
                      <th className="py-2.5 px-4 font-semibold">Plan</th>
                      <th className="py-2.5 px-4 font-semibold">Expiry Status</th>
                      <th className="py-2.5 px-4 font-semibold text-right">Total Spend</th>
                    </tr>
                  </thead>
                <tbody className="divide-y divide-slate-200">
                  {filtered.map((m) => {
                    const selected = m.id === selectedId;
                    return (
                      <tr
                        key={m.id}
                        onClick={() => setSelectedId(m.id)}
                        className={`cursor-pointer transition-colors ${
                          selected ? 'bg-blue-50/70' : 'hover:bg-slate-50'
                        }`}
                      >
                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-900">{m.fullName}</div>
                          <div className="text-xs font-mono text-slate-500">
                            {m.memberCode} · {m.phone}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-xs font-semibold text-slate-800">
                          {TIER_ENTITLEMENTS[m.tier].name}
                        </td>
                        <td className="py-3 px-4 text-xs">
                          <div
                            className={`font-semibold ${
                              m.status === 'active'
                                ? 'text-emerald-700'
                                : m.status === 'expiring_soon'
                                ? 'text-amber-700'
                                : 'text-red-600'
                            }`}
                          >
                            {m.status === 'active'
                              ? 'Active'
                              : m.status === 'expiring_soon'
                              ? 'Expiring Soon'
                              : 'Expired'}
                          </div>
                          <div className="font-mono text-[11px] text-slate-500 tabular-nums">
                            Ends {m.expiryDate}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-xs tabular-nums text-slate-900">
                          {formatInr(m.totalSpentInr)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Member Recognition Card & Club History */}
        <div className="xl:col-span-5 bg-white border border-slate-200 rounded-xl p-6">
          {!selectedMember ? (
            <div className="py-12 text-center text-sm text-slate-500">
              Select any member to view instant plan entitlements, expiry alerts, renewal actions,
              and club visit history.
            </div>
          ) : (
            <div className="space-y-5">
              <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-200">
                <div>
                  <div className="text-xs font-mono text-blue-700 font-semibold">
                    {selectedMember.memberCode} · {TIER_ENTITLEMENTS[selectedMember.tier].name} Member
                  </div>
                  <h3 className="font-display text-3xl font-bold text-slate-900 mt-0.5">
                    {selectedMember.fullName}
                  </h3>
                  <div className="text-xs text-slate-600 mt-1">
                    {selectedMember.email} · <span className="font-mono">{selectedMember.phone}</span>
                  </div>
                </div>
                <span
                  className={`text-xs font-semibold ${
                    selectedMember.status === 'active'
                      ? 'text-emerald-700'
                      : selectedMember.status === 'expiring_soon'
                      ? 'text-amber-700'
                      : 'text-red-600'
                  }`}
                >
                  {selectedMember.status === 'active'
                    ? 'Active'
                    : selectedMember.status === 'expiring_soon'
                    ? 'Expiring Soon'
                    : 'Expired'}
                </span>
              </div>

              {selectedMember.status !== 'active' && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3.5 text-xs text-amber-900 flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                  <div>
                    Membership {selectedMember.status === 'expired' ? 'expired on' : 'expires on'}{' '}
                    <span className="font-mono font-semibold">{selectedMember.expiryDate}</span>.
                    Renew below to preserve automatic court, shop, and bar discounts.
                  </div>
                </div>
              )}

              {/* Entitlements */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2 text-xs">
                <div className="font-semibold text-slate-900 mb-1">Active Plan Entitlements</div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Court Rate</span>
                  <span className="font-mono font-semibold text-slate-900">
                    {TIER_ENTITLEMENTS[selectedMember.tier].courtDiscountPercent === 100
                      ? '₹0 (Included)'
                      : `${TIER_ENTITLEMENTS[selectedMember.tier].courtDiscountPercent}% off`}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Gear Shop Discount</span>
                  <span className="font-mono font-semibold text-slate-900">
                    {TIER_ENTITLEMENTS[selectedMember.tier].shopDiscountPercent}% automatic
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Bar &amp; Cafeteria Discount</span>
                  <span className="font-mono font-semibold text-slate-900">
                    {TIER_ENTITLEMENTS[selectedMember.tier].barDiscountPercent}% automatic
                  </span>
                </div>
                <div className="flex justify-between pt-2 border-t border-slate-200">
                  <span className="text-slate-600">Club Visits / Lifetime Spend</span>
                  <span className="font-mono font-semibold text-slate-900 tabular-nums">
                    {selectedMember.visitsCount} visits · {formatInr(selectedMember.totalSpentInr)}
                  </span>
                </div>
              </div>

              {/* Quick Renewal */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => void handleRenewMember(selectedMember, 30)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Renew +30 Days
                </button>
                <button
                  type="button"
                  onClick={() => void handleRenewMember(selectedMember, 365)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-800 bg-white border border-slate-300 hover:border-slate-400 rounded-lg transition-colors"
                >
                  Renew +1 Year
                </button>
              </div>

              {selectedMember.notes && (
                <div className="text-xs text-slate-600">
                  <span className="font-semibold text-slate-800">Front Desk Notes: </span>
                  {selectedMember.notes}
                </div>
              )}

              {/* Recent Court Bookings History */}
              <div className="pt-4 border-t border-slate-200">
                <div className="text-xs font-semibold text-slate-900 mb-2">
                  Recent Court Reservations ({memberBookings.length})
                </div>
                {memberBookings.length === 0 ? (
                  <p className="text-xs text-slate-500">No court reservations recorded yet.</p>
                ) : (
                  <div className="space-y-2">
                    {memberBookings.map((b) => (
                      <div
                        key={b.id}
                        className="flex items-center justify-between text-xs border border-slate-200 rounded-lg px-3 py-2"
                      >
                        <div>
                          <div className="font-semibold text-slate-800">{b.courtName}</div>
                          <div className="font-mono text-[11px] text-slate-500">
                            {b.date} · {b.startTime}–{b.endTime}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-mono font-semibold text-slate-900">
                            {formatInr(b.finalAmountInr)}
                          </div>
                          <div className="text-[11px] text-slate-500 capitalize">{b.status}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Enroll New Member Modal */}
      {showEnrollModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg p-6 shadow-xl">
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-200">
              <div>
                <h3 className="font-display text-2xl font-bold text-slate-900">
                  {sourceEnquiryId ? 'Convert Lead to Club Member' : 'Enroll Walk-In Member'}
                </h3>
                <p className="text-xs text-slate-500">
                  Assigns member code, activates expiry tracking, and logs INR payment.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowEnrollModal(false);
                  onClearPrefill?.();
                }}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEnroll} className="space-y-4">
              {formError && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-xs px-3 py-2 rounded-lg">
                  {formError}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Phone *</label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 98140 11223"
                    className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Email *</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Date of Birth {tier === 'junior' ? '* (Under 18)' : '(Optional)'}
                  </label>
                  <input
                    type="date"
                    value={dob}
                    onChange={(e) => setDob(e.target.value)}
                    className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Plan Tier</label>
                  <select
                    value={tier}
                    onChange={(e) => setTier(e.target.value as MembershipTier)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="gold">Gold ({formatInr(4999)}/mo)</option>
                    <option value="silver">Silver ({formatInr(2499)}/mo)</option>
                    <option value="junior">Junior &lt;18 ({formatInr(1499)}/mo)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Duration</label>
                  <select
                    value={durationMonths}
                    onChange={(e) => setDurationMonths(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
                  >
                    <option value={1}>1 Month</option>
                    <option value={3}>3 Months</option>
                    <option value={6}>6 Months</option>
                    <option value={12}>12 Months (Annual)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Payment</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="upi">UPI</option>
                    <option value="card">Card</option>
                    <option value="cash">Cash</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Notes</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Preferred sport, guardian contact, coaching notes..."
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-200">
                <div className="text-xs text-slate-600">
                  Total incl. 18% GST:{' '}
                  <span className="font-mono font-semibold text-slate-900">
                    {formatInr(
                      Math.round(
                        (durationMonths === 12
                          ? TIER_ENTITLEMENTS[tier].annualPriceInr
                          : TIER_ENTITLEMENTS[tier].monthlyPriceInr * durationMonths) * 1.18
                      )
                    )}
                  </span>
                </div>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 disabled:opacity-60 rounded-lg"
                >
                  <Plus className="w-4 h-4" />
                  {submitting ? 'Enrolling...' : 'Confirm Enrollment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
