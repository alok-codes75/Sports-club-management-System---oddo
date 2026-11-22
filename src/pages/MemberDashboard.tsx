import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { CalendarDays, CalendarX2, Check, CreditCard, Globe, LogOut, Shield, ShoppingBag, Sparkles, UserCheck, X } from 'lucide-react';
import { db, handleFirestoreError, OperationType } from '@/src/services/firebase';
import { useAuth } from '@/src/contexts/AuthContext';
import { ClubLogo } from '@/src/components/common/ClubLogo';
import { CancelBookingModal } from '@/src/components/bookings/CancelBookingModal';
import { cancelCourtBooking, enrollMemberRecord } from '@/src/services/clubServices';
import {
  calculateAgeYears,
  computeMemberExpiryStatus,
  formatInr,
  TIER_ENTITLEMENTS,
  type BarOrder,
  type Booking,
  type Member,
  type MembershipTier,
  type PaymentMethod,
  type ShopOrder,
} from '@/src/types/club';
import { CourtBookingView } from '@/src/modules/bookings/CourtBookingView';
import { GearShopView } from '@/src/modules/shop/GearShopView';

type MemberTab = 'courts' | 'shop' | 'history';

interface MemberDashboardProps {
  onViewPublicSite: () => void;
  onOpenAdminConsole?: () => void;
}

export function MemberDashboard({
  onViewPublicSite,
  onOpenAdminConsole,
}: MemberDashboardProps) {
  const { firebaseUser, profile, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState<MemberTab>('courts');

  const [linkedMember, setLinkedMember] = useState<Member | null>(null);
  const [myBookings, setMyBookings] = useState<Booking[]>([]);
  const [myOrders, setMyOrders] = useState<ShopOrder[]>([]);
  const [myBarTabs, setMyBarTabs] = useState<BarOrder[]>([]);

  // Self-enrollment modal state
  const [showActivate, setShowActivate] = useState(false);
  const [planTier, setPlanTier] = useState<MembershipTier>('gold');
  const [phone, setPhone] = useState('+91 ');
  const [dob, setDob] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('upi');
  const [formErr, setFormErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [cancelTarget, setCancelTarget] = useState<Booking | null>(null);
  const [cancelBusy, setCancelBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!firebaseUser) return;

    const unsubMem = onSnapshot(
      query(collection(db, 'members'), where('userId', '==', firebaseUser.uid)),
      (snap) => {
        if (snap.empty) {
          setLinkedMember(null);
        } else {
          const docSnap = snap.docs[0];
          const raw = docSnap.data() as Omit<Member, 'id'>;
          setLinkedMember({
            id: docSnap.id,
            ...raw,
            status: raw.status === 'suspended' ? 'suspended' : computeMemberExpiryStatus(raw.expiryDate),
          });
        }
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'members')
    );

    const unsubBookings = onSnapshot(
      query(collection(db, 'bookings'), where('userId', '==', firebaseUser.uid)),
      (snap) =>
        setMyBookings(
          snap.docs
            .map((d) => ({ id: d.id, ...(d.data() as Omit<Booking, 'id'>) }))
            .sort((a, b) => (b.date + b.startTime).localeCompare(a.date + a.startTime))
        ),
      (err) => handleFirestoreError(err, OperationType.LIST, 'bookings')
    );

    const unsubOrders = onSnapshot(
      query(collection(db, 'shopOrders'), where('userId', '==', firebaseUser.uid)),
      (snap) => setMyOrders(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<ShopOrder, 'id'>) }))),
      (err) => handleFirestoreError(err, OperationType.LIST, 'shopOrders')
    );

    const unsubBar = onSnapshot(
      query(collection(db, 'barOrders'), where('userId', '==', firebaseUser.uid)),
      (snap) => setMyBarTabs(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<BarOrder, 'id'>) }))),
      (err) => handleFirestoreError(err, OperationType.LIST, 'barOrders')
    );

    return () => {
      unsubMem();
      unsubBookings();
      unsubOrders();
      unsubBar();
    };
  }, [firebaseUser]);

  const handleActivateMembership = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firebaseUser || !profile) return;
    setFormErr(null);

    if (phone.trim().length < 10) {
      setFormErr('Enter a valid 10-digit mobile number.');
      return;
    }
    if (planTier === 'junior') {
      if (!dob || calculateAgeYears(dob) >= 18) {
        setFormErr('Junior plan requires DOB proving player is under 18.');
        return;
      }
    }

    setBusy(true);
    try {
      const res = await enrollMemberRecord({
        fullName: profile.displayName,
        email: profile.email,
        phone: phone.trim(),
        dob: dob || undefined,
        tier: planTier,
        durationMonths: 1,
        paymentMethod,
        userId: firebaseUser.uid,
        recordedByUid: firebaseUser.uid,
      });
      setShowActivate(false);
      setToast(`Activated ${TIER_ENTITLEMENTS[planTier].name} Membership (${res.memberCode})! Automatic court, shop, and bar perks are now live.`);
    } catch (err) {
      setFormErr(err instanceof Error ? err.message : 'Activation failed.');
    } finally {
      setBusy(false);
    }
  };

  const handleConfirmCancelBooking = async (reason: string) => {
    if (!cancelTarget) return;
    const target = cancelTarget;
    setCancelBusy(true);
    try {
      await cancelCourtBooking(target, reason);
      setCancelTarget(null);
      setToast(
        `Cancelled ${target.courtName} (${target.date} ${target.startTime}–${target.endTime}). The court is now free for other players to book.`
      );
    } catch (err) {
      setToast(err instanceof Error ? err.message : 'Unable to cancel booking.');
    } finally {
      setCancelBusy(false);
    }
  };

  const isStaffAccount =
    profile?.role === 'owner' || profile?.role === 'front_desk' || profile?.role === 'bar_staff';

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* Member Portal Top Bar */}
      <header className="sticky top-0 z-30 bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4 sm:gap-6">
          <button
            type="button"
            onClick={onViewPublicSite}
            className="focus:outline-none shrink-0"
          >
            <ClubLogo size="md" />
          </button>

          <nav className="hidden md:flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
            {(
              [
                { id: 'courts', label: 'Courts & Social Play', icon: CalendarDays },
                { id: 'shop', label: 'Online Gear Shop', icon: ShoppingBag },
                { id: 'history', label: 'My Activity & Tabs', icon: CreditCard },
              ] as const
            ).map((t) => {
              const Icon = t.icon;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setActiveTab(t.id)}
                  className={`inline-flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                    activeTab === t.id
                      ? 'bg-white text-blue-700 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {t.label}
                </button>
              );
            })}
          </nav>

          <div className="flex items-center gap-2.5 shrink-0">
            {isStaffAccount && onOpenAdminConsole && (
              <button
                type="button"
                onClick={onOpenAdminConsole}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg whitespace-nowrap"
              >
                <Shield className="w-3.5 h-3.5 text-blue-700" />
                Admin Console
              </button>
            )}
            <button
              type="button"
              onClick={onViewPublicSite}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:border-slate-400 rounded-lg whitespace-nowrap"
            >
              <Globe className="w-3.5 h-3.5" />
              Club Site
            </button>
            <button
              type="button"
              onClick={() => void signOut()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:text-red-700 rounded-lg whitespace-nowrap"
            >
              <LogOut className="w-3.5 h-3.5" />
              Sign Out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {/* Digital Membership Card Hero */}
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="rounded-2xl p-6 sm:p-8 bg-gradient-to-r from-slate-950 via-blue-950 to-blue-900 text-white flex flex-col lg:flex-row lg:items-center justify-between gap-6"
        >
          <div>
            <div className="text-xs font-mono text-lime-300 mb-1">
              {linkedMember
                ? `${linkedMember.memberCode} · ${TIER_ENTITLEMENTS[linkedMember.tier].name.toUpperCase()} MEMBERSHIP`
                : 'REGISTERED PLAYER ACCOUNT'}
            </div>
            <h1 className="font-display text-4xl font-bold tracking-tight">
              Welcome back, {profile?.displayName}
            </h1>
            <p className="text-xs text-blue-100 mt-1">
              {linkedMember
                ? `Valid through ${linkedMember.expiryDate} · ${
                    TIER_ENTITLEMENTS[linkedMember.tier].courtDiscountPercent === 100
                      ? '₹0 Court Access'
                      : `${TIER_ENTITLEMENTS[linkedMember.tier].courtDiscountPercent}% off Courts`
                  } · ${TIER_ENTITLEMENTS[linkedMember.tier].shopDiscountPercent}% off Gear Shop · ${
                    TIER_ENTITLEMENTS[linkedMember.tier].barDiscountPercent
                  }% off Clubhouse Bar`
                : 'Book courts at standard walk-in rates or activate a Gold, Silver, or Junior membership for instant savings.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            {linkedMember ? (
              <div className="grid grid-cols-2 gap-4 bg-white/10 border border-white/15 rounded-xl px-5 py-3 text-xs">
                <div>
                  <div className="text-blue-200">Club Visits</div>
                  <div className="font-mono text-xl font-semibold tabular-nums">
                    {linkedMember.visitsCount}
                  </div>
                </div>
                <div>
                  <div className="text-blue-200">Total Spend</div>
                  <div className="font-mono text-xl font-semibold tabular-nums">
                    {formatInr(linkedMember.totalSpentInr)}
                  </div>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowActivate(true)}
                className="inline-flex items-center gap-2 px-5 py-3 text-sm font-semibold text-slate-950 bg-lime-400 hover:bg-lime-300 rounded-xl transition-colors whitespace-nowrap"
              >
                <Sparkles className="w-4 h-4" />
                Activate Membership Plan
              </button>
            )}
          </div>
        </motion.section>

        {/* Mobile Tab Switcher */}
        <div className="flex md:hidden items-center gap-1 p-1 bg-slate-200/70 rounded-lg overflow-x-auto">
          {(
            [
              { id: 'courts', label: 'Courts & Social' },
              { id: 'shop', label: 'Online Shop' },
              { id: 'history', label: 'My Activity' },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveTab(t.id)}
              className={`flex-1 px-3 py-2 text-xs font-semibold rounded-md whitespace-nowrap ${
                activeTab === t.id ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600'
              }`}
            >
              {t.label}
            </button>
          ))}
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

        {activeTab === 'courts' && <CourtBookingView mode="member" linkedMember={linkedMember} />}
        {activeTab === 'shop' && <GearShopView mode="online" linkedMember={linkedMember} />}

        {activeTab === 'history' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
              <h3 className="font-display text-2xl font-bold text-slate-900">
                Court Bookings ({myBookings.length})
              </h3>
              {myBookings.length === 0 ? (
                <p className="text-xs text-slate-500">No court reservations yet.</p>
              ) : (
                myBookings.slice(0, 12).map((b) => (
                  <div key={b.id} className="border-t border-slate-100 pt-2.5 text-xs space-y-2">
                    <div className="flex justify-between gap-2">
                      <div>
                        <div className="font-semibold text-slate-900">{b.courtName}</div>
                        <div className="font-mono text-slate-500">
                          {b.date} · {b.startTime}–{b.endTime}
                        </div>
                        {b.status === 'cancelled' && b.cancellationReason && (
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            Reason: {b.cancellationReason}
                          </div>
                        )}
                      </div>
                      <div className="text-right font-mono shrink-0">
                        <div className="font-semibold">{formatInr(b.finalAmountInr)}</div>
                        <div
                          className={`capitalize font-sans font-semibold ${
                            b.status === 'confirmed'
                              ? 'text-emerald-700'
                              : b.status === 'cancelled'
                              ? 'text-red-600'
                              : 'text-slate-500'
                          }`}
                        >
                          {b.status}
                        </div>
                      </div>
                    </div>
                    {b.status === 'confirmed' && (
                      <div className="flex justify-end">
                        <button
                          type="button"
                          disabled={cancelBusy}
                          onClick={() => setCancelTarget(b)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-red-700 bg-red-50 border border-red-200 hover:bg-red-100 rounded-md transition-colors"
                        >
                          <CalendarX2 className="w-3 h-3" />
                          Cancel &amp; Free Slot
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
              <h3 className="font-display text-2xl font-bold text-slate-900">
                Gear Shop Orders ({myOrders.length})
              </h3>
              {myOrders.length === 0 ? (
                <p className="text-xs text-slate-500">No gear shop orders yet.</p>
              ) : (
                myOrders.slice(0, 8).map((o) => (
                  <div key={o.id} className="border-t border-slate-100 pt-2.5 text-xs flex justify-between">
                    <div>
                      <div className="font-mono font-semibold text-blue-700">{o.orderCode}</div>
                      <div className="text-slate-600 capitalize">{o.fulfillment.replace('_', ' ')}</div>
                    </div>
                    <div className="text-right font-mono">
                      <div className="font-semibold">{formatInr(o.totalInr)}</div>
                      <div className="capitalize text-slate-500">{o.status.replace(/_/g, ' ')}</div>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
              <h3 className="font-display text-2xl font-bold text-slate-900">
                Clubhouse Bar Tabs ({myBarTabs.length})
              </h3>
              {myBarTabs.length === 0 ? (
                <p className="text-xs text-slate-500">No linked bar tabs yet.</p>
              ) : (
                myBarTabs.slice(0, 8).map((t) => (
                  <div key={t.id} className="border-t border-slate-100 pt-2.5 text-xs flex justify-between">
                    <div>
                      <div className="font-mono font-semibold text-slate-900">
                        {t.ticketCode} · {t.tableNumber}
                      </div>
                      <div className="text-emerald-700">Saved {formatInr(t.discountInr)}</div>
                    </div>
                    <div className="text-right font-mono">
                      <div className="font-semibold">{formatInr(t.totalInr)}</div>
                      <div className="capitalize text-slate-500">{t.tabStatus}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </main>

      {/* Self-Enroll Membership Modal */}
      {showActivate && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md p-6 shadow-xl">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-200">
              <h3 className="font-display text-2xl font-bold text-slate-900">
                Activate Club Membership
              </h3>
              <button type="button" onClick={() => setShowActivate(false)}>
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>
            <form onSubmit={handleActivateMembership} className="space-y-4">
              {formErr && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-xs px-3 py-2 rounded-lg">
                  {formErr}
                </div>
              )}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Choose Plan</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['gold', 'silver', 'junior'] as MembershipTier[]).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setPlanTier(t)}
                      className={`p-2.5 rounded-lg border text-left ${
                        planTier === t
                          ? 'bg-blue-700 text-white border-blue-700'
                          : 'bg-white text-slate-800 border-slate-300'
                      }`}
                    >
                      <div className="text-xs font-semibold">{TIER_ENTITLEMENTS[t].name}</div>
                      <div className="font-mono text-[11px]">
                        {formatInr(TIER_ENTITLEMENTS[t].monthlyPriceInr)}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Mobile Number *</label>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg"
                />
              </div>
              {planTier === 'junior' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Date of Birth (Must be Under 18) *
                  </label>
                  <input
                    type="date"
                    required
                    value={dob}
                    onChange={(e) => setDob(e.target.value)}
                    className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg"
                  />
                </div>
              )}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Payment Mode</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['upi', 'card', 'cash'] as const).map((pm) => (
                    <button
                      key={pm}
                      type="button"
                      onClick={() => setPaymentMethod(pm)}
                      className={`py-2 text-xs font-semibold uppercase rounded-lg border ${
                        paymentMethod === pm
                          ? 'bg-slate-900 text-white border-slate-900'
                          : 'bg-white text-slate-700 border-slate-300'
                      }`}
                    >
                      {pm}
                    </button>
                  ))}
                </div>
              </div>
              <button
                type="submit"
                disabled={busy}
                className="w-full inline-flex items-center justify-center gap-2 py-2.5 text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg"
              >
                <UserCheck className="w-4 h-4" />
                {busy
                  ? 'Activating...'
                  : `Activate ${TIER_ENTITLEMENTS[planTier].name} (${formatInr(
                      Math.round(TIER_ENTITLEMENTS[planTier].monthlyPriceInr * 1.18)
                    )} incl. GST)`}
              </button>
            </form>
          </div>
        </div>
      )}

      {cancelTarget && (
        <CancelBookingModal
          booking={cancelTarget}
          busy={cancelBusy}
          onClose={() => setCancelTarget(null)}
          onConfirm={handleConfirmCancelBooking}
        />
      )}
    </div>
  );
}
