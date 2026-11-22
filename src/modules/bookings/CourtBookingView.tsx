import React, { useEffect, useMemo, useState } from 'react';
import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  where,
} from 'firebase/firestore';
import { CalendarDays, CalendarX2, Check, Plus, Users, X, XCircle } from 'lucide-react';
import { db, handleFirestoreError, OperationType } from '@/src/services/firebase';
import { useAuth } from '@/src/contexts/AuthContext';
import { CancelBookingModal } from '@/src/components/bookings/CancelBookingModal';
import {
  cancelCourtBooking,
  createAtomicCourtBooking,
  joinSocialPlaySession,
} from '@/src/services/clubServices';
import {
  addOneHour,
  formatInr,
  getCourtPriceForTier,
  getNextFridayDateKey,
  getNextSevenDays,
  HALF_HOUR_START_SLOTS,
  slotsOverlap,
  SPORT_LABELS,
  TIER_ENTITLEMENTS,
  type Booking,
  type BookingPaymentMethod,
  type Court,
  type Member,
  type PlayerTier,
  type PublicScheduleSlot,
  type SocialSession,
  type SportType,
} from '@/src/types/club';

interface CourtBookingViewProps {
  mode: 'staff' | 'member';
  linkedMember?: Member | null;
}

type DayPeriod = 'morning' | 'afternoon' | 'evening';

const PERIOD_SLOTS: Record<DayPeriod, string[]> = {
  morning: HALF_HOUR_START_SLOTS.filter((t) => t >= '06:00' && t < '12:00'),
  afternoon: HALF_HOUR_START_SLOTS.filter((t) => t >= '12:00' && t < '17:00'),
  evening: HALF_HOUR_START_SLOTS.filter((t) => t >= '17:00' && t <= '21:00'),
};

export function CourtBookingView({ mode, linkedMember }: CourtBookingViewProps) {
  const { firebaseUser, profile } = useAuth();
  const [subTab, setSubTab] = useState<'grid' | 'bookings' | 'social'>('grid');

  const sevenDays = useMemo(() => getNextSevenDays(), []);
  const [selectedDate, setSelectedDate] = useState(sevenDays[0].dateKey);
  const [sportFilter, setSportFilter] = useState<SportType | 'all'>('all');
  const [period, setPeriod] = useState<DayPeriod>('evening');

  const [courts, setCourts] = useState<Court[]>([]);
  const [scheduleSlots, setScheduleSlots] = useState<PublicScheduleSlot[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [socialSessions, setSocialSessions] = useState<SocialSession[]>([]);

  // Booking Modal State
  const [draftSlot, setDraftSlot] = useState<{ court: Court; startTime: string } | null>(null);
  const [bookingType, setBookingType] = useState<'member' | 'walk_in'>('member');
  const [selectedMemberId, setSelectedMemberId] = useState<string>('');
  const [walkInName, setWalkInName] = useState('');
  const [walkInPhone, setWalkInPhone] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<BookingPaymentMethod>('upi');
  const [cancelTarget, setCancelTarget] = useState<Booking | null>(null);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Staff New Friday Social Play Form
  const [showSocialModal, setShowSocialModal] = useState(false);
  const [socialTitle, setSocialTitle] = useState('Friday Night Mixed Social Play');
  const [socialCourtId, setSocialCourtId] = useState('court-tennis-1');
  const [socialDate, setSocialDate] = useState(getNextFridayDateKey());
  const [socialStart, setSocialStart] = useState('19:00');
  const [socialFee, setSocialFee] = useState('250');
  const [socialMax, setSocialMax] = useState('16');

  useEffect(() => {
    const unsubCourts = onSnapshot(
      collection(db, 'courts'),
      (snap) => setCourts(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Court, 'id'>) })).filter((c) => c.active)),
      (err) => handleFirestoreError(err, OperationType.LIST, 'courts')
    );

    const unsubSocial = onSnapshot(
      query(collection(db, 'socialSessions'), orderBy('date', 'asc')),
      (snap) => setSocialSessions(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<SocialSession, 'id'>) }))),
      (err) => handleFirestoreError(err, OperationType.LIST, 'socialSessions')
    );

    return () => {
      unsubCourts();
      unsubSocial();
    };
  }, []);

  useEffect(() => {
    const q = query(collection(db, 'publicSchedule'), where('date', '==', selectedDate));
    const unsub = onSnapshot(
      q,
      (snap) =>
        setScheduleSlots(
          snap.docs
            .map((d) => ({ id: d.id, ...(d.data() as Omit<PublicScheduleSlot, 'id'>) }))
            .filter((s) => s.status !== 'cancelled')
        ),
      (err) => handleFirestoreError(err, OperationType.LIST, 'publicSchedule')
    );
    return () => unsub();
  }, [selectedDate]);

  useEffect(() => {
    if (!firebaseUser) return;
    const bQuery =
      mode === 'staff'
        ? query(collection(db, 'bookings'), orderBy('createdAt', 'desc'))
        : query(collection(db, 'bookings'), where('userId', '==', firebaseUser.uid));

    const unsubBookings = onSnapshot(
      bQuery,
      (snap) => {
        const list = snap.docs
          .map((d) => ({ id: d.id, ...(d.data() as Omit<Booking, 'id'>) }))
          .sort((a, b) => (b.date + b.startTime).localeCompare(a.date + a.startTime));
        setBookings(list);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'bookings')
    );

    let unsubMembers: (() => void) | null = null;
    if (mode === 'staff') {
      unsubMembers = onSnapshot(
        collection(db, 'members'),
        (snap) => {
          const list = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Member, 'id'>) }));
          setMembers(list);
          if (list.length > 0 && !selectedMemberId) {
            setSelectedMemberId(list[0].id);
          }
        },
        (err) => handleFirestoreError(err, OperationType.LIST, 'members')
      );
    }

    return () => {
      unsubBookings();
      if (unsubMembers) unsubMembers();
    };
  }, [firebaseUser, mode, selectedMemberId]);

  const filteredCourts = useMemo(
    () => (sportFilter === 'all' ? courts : courts.filter((c) => c.sport === sportFilter)),
    [courts, sportFilter]
  );

  const activeConfirmedBookings = useMemo(
    () => bookings.filter((b) => b.status === 'confirmed'),
    [bookings]
  );

  const memberTodayCount = useMemo(() => {
    if (mode !== 'member') return 0;
    return activeConfirmedBookings.filter((b) => b.date === selectedDate).length;
  }, [activeConfirmedBookings, mode, selectedDate]);

  const getSlotStatus = (courtId: string, startTime: string): 'available' | 'booked' | 'social' => {
    const endTime = addOneHour(startTime);
    const match = scheduleSlots.find(
      (s) => s.courtId === courtId && slotsOverlap(startTime, endTime, s.startTime, s.endTime)
    );
    if (!match) return 'available';
    return match.slotType === 'social' ? 'social' : 'booked';
  };

  const getManageableBookingForSlot = (courtId: string, startTime: string): Booking | null => {
    const endTime = addOneHour(startTime);
    return (
      activeConfirmedBookings.find(
        (b) =>
          b.courtId === courtId &&
          b.date === selectedDate &&
          slotsOverlap(startTime, endTime, b.startTime, b.endTime)
      ) ?? null
    );
  };

  const resolvedBookingTier: PlayerTier = useMemo(() => {
    if (mode === 'member') {
      return linkedMember ? linkedMember.tier : 'walk_in';
    }
    if (bookingType === 'walk_in') return 'walk_in';
    const found = members.find((m) => m.id === selectedMemberId);
    return found ? found.tier : 'walk_in';
  }, [mode, linkedMember, bookingType, members, selectedMemberId]);

  const draftPricing = useMemo(() => {
    if (!draftSlot) return { discountInr: 0, finalAmountInr: 0 };
    return getCourtPriceForTier(draftSlot.court.hourlyRateInr, resolvedBookingTier);
  }, [draftSlot, resolvedBookingTier]);

  const handleConfirmBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!draftSlot || !firebaseUser) return;

    setBusy(true);
    setFeedback(null);
    try {
      const targetMember =
        mode === 'member'
          ? linkedMember
          : bookingType === 'member'
          ? members.find((m) => m.id === selectedMemberId) ?? null
          : null;

      const playerName =
        mode === 'member'
          ? linkedMember?.fullName ?? profile?.displayName ?? 'Club Player'
          : bookingType === 'member' && targetMember
          ? targetMember.fullName
          : walkInName.trim();

      if (playerName.length < 2) {
        setFeedback({ type: 'error', text: 'Please enter the walk-in player name.' });
        setBusy(false);
        return;
      }

      const bookingId = await createAtomicCourtBooking({
        court: draftSlot.court,
        date: selectedDate,
        startTime: draftSlot.startTime,
        userId: targetMember?.userId || firebaseUser.uid,
        memberId: targetMember?.id,
        playerName,
        playerPhone: targetMember?.phone || walkInPhone.trim() || undefined,
        tier: resolvedBookingTier,
        paymentMethod: draftPricing.finalAmountInr === 0 ? 'included' : paymentMethod,
        recordedByUid: firebaseUser.uid,
      });

      setFeedback({
        type: 'success',
        text: `Confirmed ${draftSlot.court.name} (${selectedDate} ${draftSlot.startTime}–${addOneHour(
          draftSlot.startTime
        )}) · Ref ${bookingId.slice(0, 18)}.`,
      });
      setDraftSlot(null);
      setWalkInName('');
      setWalkInPhone('');
    } catch (err) {
      setFeedback({
        type: 'error',
        text: err instanceof Error ? err.message : 'Unable to lock court slot.',
      });
    } finally {
      setBusy(false);
    }
  };

  const handleConfirmCancel = async (reason: string) => {
    if (!cancelTarget) return;
    const target = cancelTarget;
    setBusy(true);
    setFeedback(null);
    try {
      await cancelCourtBooking(target, reason);
      setCancelTarget(null);
      setFeedback({
        type: 'success',
        text: `Cancelled ${target.courtName} (${target.date} ${target.startTime}–${target.endTime}). Court slot is now open for others to book.`,
      });
    } catch (err) {
      setFeedback({ type: 'error', text: err instanceof Error ? err.message : 'Cancel failed.' });
    } finally {
      setBusy(false);
    }
  };

  const handleJoinSocial = async (session: SocialSession) => {
    if (!firebaseUser) return;
    setBusy(true);
    setFeedback(null);
    try {
      await joinSocialPlaySession({
        session,
        userId: firebaseUser.uid,
        playerName: linkedMember?.fullName ?? profile?.displayName ?? 'Club Member',
        tier: linkedMember ? linkedMember.tier : 'walk_in',
        paymentMethod: 'upi',
        recordedByUid: firebaseUser.uid,
      });
      setFeedback({
        type: 'success',
        text: `Spot confirmed for ${session.title} (${session.date} ${session.startTime}).`,
      });
    } catch (err) {
      setFeedback({ type: 'error', text: err instanceof Error ? err.message : 'Could not join.' });
    } finally {
      setBusy(false);
    }
  };

  const handleCreateSocial = async (e: React.FormEvent) => {
    e.preventDefault();
    const court = courts.find((c) => c.id === socialCourtId) ?? courts[0];
    if (!court) return;
    setBusy(true);
    const id = `social-${court.id}-${socialDate.replace(/-/g, '')}-${socialStart.replace(':', '')}`;
    const endTime = addOneHour(addOneHour(socialStart));
    try {
      await setDoc(doc(db, 'socialSessions', id), {
        title: socialTitle.trim().slice(0, 120),
        courtId: court.id,
        courtName: court.name,
        sport: court.sport,
        date: socialDate,
        startTime: socialStart,
        endTime,
        feeInr: Number(socialFee) || 250,
        maxPlayers: Number(socialMax) || 16,
        spotsFilled: 0,
        status: 'open',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      await setDoc(doc(db, 'publicSchedule', id), {
        courtId: court.id,
        courtName: court.name,
        sport: court.sport,
        date: socialDate,
        startTime: socialStart,
        endTime,
        slotType: 'social',
        status: 'social_open',
        spotsFilled: 0,
        maxSpots: Number(socialMax) || 16,
        updatedAt: serverTimestamp(),
      });
      setShowSocialModal(false);
      setFeedback({ type: 'success', text: `Published Friday Social Play on ${court.name}.` });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `socialSessions/${id}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-3xl font-bold text-slate-900">
            {mode === 'staff' ? 'Court Booking Engine & Front Desk Grid' : 'Book a Court'}
          </h2>
          <p className="text-sm text-slate-600">
            1-hour sessions open every 30 minutes · Atomic double-booking locks · Max 2 sessions/day
            per member.
          </p>
        </div>

        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg self-start">
          {(
            [
              { id: 'grid', label: 'Live Court Grid' },
              { id: 'bookings', label: mode === 'staff' ? `Reservations (${bookings.length})` : `My Bookings (${bookings.length})` },
              { id: 'social', label: 'Friday Social Play' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setSubTab(tab.id)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                subTab === tab.id
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {feedback && (
        <div
          className={`flex items-center justify-between gap-3 px-4 py-3 rounded-lg border text-xs font-semibold ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-red-50 border-red-200 text-red-700'
          }`}
        >
          <span className="inline-flex items-center gap-2">
            {feedback.type === 'success' ? <Check className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
            {feedback.text}
          </span>
          <button type="button" onClick={() => setFeedback(null)} className="underline">
            Dismiss
          </button>
        </div>
      )}

      {mode === 'member' && (
        <div className="bg-blue-50/70 border border-blue-200 rounded-xl px-4 py-3 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div>
            <span className="font-semibold text-slate-900">
              {linkedMember
                ? `${TIER_ENTITLEMENTS[linkedMember.tier].name} Member Rate Active`
                : 'Standard Walk-In Rate Active'}
            </span>
            <span className="text-slate-600 ml-2">
              {linkedMember
                ? TIER_ENTITLEMENTS[linkedMember.tier].courtDiscountPercent === 100
                  ? 'All courts ₹0 included'
                  : `${TIER_ENTITLEMENTS[linkedMember.tier].courtDiscountPercent}% discount applied automatically`
                : 'Activate a membership in your portal header for 50%–100% off courts'}
            </span>
          </div>
          <div className="font-mono font-semibold text-blue-800">
            Daily cap on {selectedDate}: {memberTodayCount} / 2 sessions used
          </div>
        </div>
      )}

      {mode === 'member' && activeConfirmedBookings.length > 0 && subTab === 'grid' && (
        <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <div className="text-xs font-semibold text-slate-900">
              Your Confirmed Court Bookings ({activeConfirmedBookings.length})
            </div>
            <button
              type="button"
              onClick={() => setSubTab('bookings')}
              className="text-xs font-semibold text-blue-700 hover:underline"
            >
              View All History
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {activeConfirmedBookings.slice(0, 4).map((b) => (
              <div
                key={b.id}
                className="flex items-center justify-between gap-3 bg-slate-50 border border-slate-200 rounded-lg px-3.5 py-2.5 text-xs"
              >
                <div className="min-w-0">
                  <div className="font-semibold text-slate-900 truncate">{b.courtName}</div>
                  <div className="font-mono text-slate-600 tabular-nums">
                    {b.date} · {b.startTime}–{b.endTime}
                  </div>
                </div>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setCancelTarget(b)}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-red-700 bg-white border border-red-200 hover:bg-red-50 hover:border-red-300 rounded-md transition-colors whitespace-nowrap shrink-0"
                >
                  <CalendarX2 className="w-3.5 h-3.5" />
                  Cancel &amp; Free
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {subTab === 'grid' && (
        <div className="space-y-4">
          {/* Date Strip & Filters */}
          <div className="flex overflow-x-auto pb-1 sm:pb-0 snap-x snap-mandatory sm:grid sm:grid-cols-7 gap-2">
            {sevenDays.map((d) => {
              const active = selectedDate === d.dateKey;
              return (
                <button
                  key={d.dateKey}
                  type="button"
                  onClick={() => setSelectedDate(d.dateKey)}
                  className={`min-w-[100px] sm:min-w-0 shrink-0 snap-start px-3 py-2 rounded-lg border text-left transition-colors ${
                    active
                      ? 'bg-blue-700 text-white border-blue-700'
                      : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className={`text-[11px] ${active ? 'text-blue-100' : 'text-slate-500'}`}>
                    {d.dayLabel}
                    {d.isFriday ? ' · Social' : ''}
                  </div>
                  <div className="font-mono text-xs font-semibold tabular-nums">{d.dateNum}</div>
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-lg">
              {(['all', 'tennis', 'cricket', 'padel', 'badminton'] as const).map((sp) => (
                <button
                  key={sp}
                  type="button"
                  onClick={() => setSportFilter(sp)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                    sportFilter === sp
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {sp === 'all' ? 'All Sports' : SPORT_LABELS[sp]}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
              {(
                [
                  { id: 'morning', label: 'Morning 06–12' },
                  { id: 'afternoon', label: 'Day 12–17' },
                  { id: 'evening', label: 'Evening 17–21' },
                ] as const
              ).map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPeriod(p.id)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                    period === p.id
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[820px]">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs text-slate-600">
                  <th className="py-3 px-4 font-semibold w-56">Court</th>
                  {PERIOD_SLOTS[period].map((slot) => (
                    <th key={slot} className="py-3 px-2 font-mono font-medium text-center tabular-nums">
                      {slot}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-sm">
                {filteredCourts.map((court) => (
                  <tr key={court.id} className="hover:bg-slate-50/70">
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">{court.name}</div>
                      <div className="text-xs text-slate-500">
                        {SPORT_LABELS[court.sport]} ·{' '}
                        <span className="font-mono text-slate-700">{formatInr(court.hourlyRateInr)}/hr</span>
                      </div>
                    </td>
                    {PERIOD_SLOTS[period].map((slot) => {
                      const status = getSlotStatus(court.id, slot);
                      const manageableBooking =
                        status === 'booked' ? getManageableBookingForSlot(court.id, slot) : null;

                      if (manageableBooking) {
                        return (
                          <td key={slot} className="p-1.5 text-center">
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => setCancelTarget(manageableBooking)}
                              title={`Click to cancel ${manageableBooking.courtName} (${manageableBooking.startTime}–${manageableBooking.endTime}) and free slot`}
                              className="w-full h-9 rounded bg-amber-50 border border-amber-300 hover:bg-red-50 hover:border-red-400 hover:text-red-700 text-[11px] font-semibold text-amber-900 transition-colors px-1 truncate"
                            >
                              {mode === 'member'
                                ? 'Yours · Cancel'
                                : `${manageableBooking.playerName.split(' ')[0]} · Cancel`}
                            </button>
                          </td>
                        );
                      }
                      if (status === 'booked') {
                        return (
                          <td key={slot} className="p-1.5 text-center">
                            <div className="h-9 rounded bg-slate-100 border border-slate-200 text-[11px] font-medium text-slate-400 flex items-center justify-center">
                              Booked
                            </div>
                          </td>
                        );
                      }
                      if (status === 'social') {
                        return (
                          <td key={slot} className="p-1.5 text-center">
                            <button
                              type="button"
                              onClick={() => setSubTab('social')}
                              className="w-full h-9 rounded bg-lime-100 border border-lime-300 text-[11px] font-semibold text-lime-900 hover:bg-lime-200"
                            >
                              Social
                            </button>
                          </td>
                        );
                      }
                      return (
                        <td key={slot} className="p-1.5 text-center">
                          <button
                            type="button"
                            onClick={() => setDraftSlot({ court, startTime: slot })}
                            className="w-full h-9 rounded bg-white border border-slate-200 hover:border-blue-600 hover:bg-blue-50 text-[11px] font-semibold text-blue-700 transition-colors"
                          >
                            Book
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {subTab === 'bookings' && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          {bookings.length === 0 ? (
            <div className="p-10 text-center text-sm text-slate-500">
              <CalendarDays className="w-7 h-7 text-slate-300 mx-auto mb-2" />
              No court reservations yet. Pick an open slot on the Live Court Grid to book.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-xs text-slate-500">
                    <th className="py-3 px-4 font-semibold">Court &amp; Time</th>
                    <th className="py-3 px-4 font-semibold">Player &amp; Tier</th>
                    <th className="py-3 px-4 font-semibold text-right">Amount</th>
                    <th className="py-3 px-4 font-semibold">Status</th>
                    <th className="py-3 px-4 font-semibold text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {bookings.map((b) => (
                    <tr key={b.id} className="hover:bg-slate-50">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900">{b.courtName}</div>
                        <div className="text-xs font-mono text-slate-500">
                          {b.date} · {b.startTime}–{b.endTime}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-medium text-slate-900">{b.playerName}</div>
                        <div className="text-xs text-slate-500 capitalize">
                          {b.tier.replace('_', ' ')} · {b.paymentMethod}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-xs tabular-nums">
                        <div className="font-semibold text-slate-900">{formatInr(b.finalAmountInr)}</div>
                        {b.discountInr > 0 && (
                          <div className="text-emerald-700">Saved {formatInr(b.discountInr)}</div>
                        )}
                      </td>
                      <td className="py-3 px-4 text-xs">
                        <span
                          className={`font-semibold ${
                            b.status === 'confirmed'
                              ? 'text-emerald-700'
                              : b.status === 'cancelled'
                              ? 'text-red-600'
                              : 'text-slate-600'
                          }`}
                        >
                          {b.status === 'confirmed'
                            ? 'Confirmed'
                            : b.status === 'cancelled'
                            ? 'Cancelled'
                            : 'Completed'}
                        </span>
                        {b.status === 'cancelled' && b.cancellationReason && (
                          <div className="text-[11px] text-slate-500 mt-0.5 max-w-[200px] truncate" title={b.cancellationReason}>
                            {b.cancellationReason}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {b.status === 'confirmed' ? (
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => setCancelTarget(b)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-red-700 bg-red-50 border border-red-200 hover:bg-red-100 rounded-md transition-colors disabled:opacity-50"
                          >
                            <CalendarX2 className="w-3.5 h-3.5" />
                            Cancel &amp; Free Slot
                          </button>
                        ) : (
                          <span className="text-[11px] text-slate-400">Slot released</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {subTab === 'social' && (
        <div className="space-y-4">
          {mode === 'staff' && (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setShowSocialModal(true)}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg"
              >
                <Plus className="w-4 h-4" />
                Schedule Friday Social Play
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {socialSessions.map((s) => (
              <div
                key={s.id}
                className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col justify-between"
              >
                <div>
                  <div className="text-xs font-mono text-blue-700 font-semibold mb-1">
                    {s.date} · {s.startTime}–{s.endTime} · {SPORT_LABELS[s.sport]}
                  </div>
                  <h3 className="font-display text-2xl font-bold text-slate-900 mb-1">{s.title}</h3>
                  <p className="text-xs text-slate-600 mb-4">{s.courtName} · Shared Multi-Player Court</p>
                  <div className="flex items-center justify-between text-xs border-t border-slate-100 pt-3 mb-4">
                    <span className="inline-flex items-center gap-1.5 font-mono font-semibold text-slate-800">
                      <Users className="w-4 h-4 text-blue-700" />
                      {s.spotsFilled} / {s.maxPlayers} players joined
                    </span>
                    <span className="font-mono text-slate-700">
                      Gold ₹0 · Silver ₹150 · Guest {formatInr(s.feeInr)}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  disabled={busy || s.status !== 'open'}
                  onClick={() => void handleJoinSocial(s)}
                  className="w-full py-2.5 px-4 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 disabled:bg-slate-300 rounded-lg transition-colors"
                >
                  {s.status === 'open' ? 'Join This Friday Social Play' : 'Session Full'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Confirm Booking Modal */}
      {draftSlot && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md p-6 shadow-xl">
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-200">
              <div>
                <div className="text-xs font-mono text-blue-700 font-semibold">
                  {selectedDate} · {draftSlot.startTime}–{addOneHour(draftSlot.startTime)}
                </div>
                <h3 className="font-display text-2xl font-bold text-slate-900">
                  {draftSlot.court.name}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setDraftSlot(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmBooking} className="space-y-4">
              {mode === 'staff' && (
                <>
                  <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
                    <button
                      type="button"
                      onClick={() => setBookingType('member')}
                      className={`flex-1 py-1.5 text-xs font-semibold rounded-md ${
                        bookingType === 'member' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
                      }`}
                    >
                      Registered Member
                    </button>
                    <button
                      type="button"
                      onClick={() => setBookingType('walk_in')}
                      className={`flex-1 py-1.5 text-xs font-semibold rounded-md ${
                        bookingType === 'walk_in' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
                      }`}
                    >
                      Walk-In Guest
                    </button>
                  </div>

                  {bookingType === 'member' ? (
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Select Member
                      </label>
                      <select
                        value={selectedMemberId}
                        onChange={(e) => setSelectedMemberId(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
                      >
                        {members.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.fullName} ({m.memberCode} · {TIER_ENTITLEMENTS[m.tier].name})
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Walk-In Name *
                        </label>
                        <input
                          type="text"
                          required
                          value={walkInName}
                          onChange={(e) => setWalkInName(e.target.value)}
                          placeholder="e.g. Siddharth Rao"
                          className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Phone (Optional)
                        </label>
                        <input
                          type="tel"
                          value={walkInPhone}
                          onChange={(e) => setWalkInPhone(e.target.value)}
                          placeholder="+91 98765 43210"
                          className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg"
                        />
                      </div>
                    </div>
                  )}
                </>
              )}

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-600">Standard Walk-In Rate</span>
                  <span className="font-mono text-slate-900">{formatInr(draftSlot.court.hourlyRateInr)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Tier Discount ({resolvedBookingTier.replace('_', ' ')})</span>
                  <span className="font-mono text-emerald-700">− {formatInr(draftPricing.discountInr)}</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-slate-200 text-sm font-semibold">
                  <span className="text-slate-900">Payable Now</span>
                  <span className="font-mono text-blue-700">{formatInr(draftPricing.finalAmountInr)}</span>
                </div>
              </div>

              {draftPricing.finalAmountInr > 0 && (
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
                            ? 'bg-blue-700 text-white border-blue-700'
                            : 'bg-white text-slate-700 border-slate-300'
                        }`}
                      >
                        {pm}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={busy}
                className="w-full py-2.5 px-4 text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 disabled:opacity-60 rounded-lg"
              >
                {busy ? 'Locking Court Slot...' : 'Confirm Atomic Booking'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Staff Schedule Friday Social Play Modal */}
      {showSocialModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md p-6 shadow-xl">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-200">
              <h3 className="font-display text-2xl font-bold text-slate-900">
                Schedule Friday Social Play
              </h3>
              <button type="button" onClick={() => setShowSocialModal(false)}>
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>
            <form onSubmit={handleCreateSocial} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Session Title</label>
                <input
                  type="text"
                  required
                  value={socialTitle}
                  onChange={(e) => setSocialTitle(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Court</label>
                <select
                  value={socialCourtId}
                  onChange={(e) => setSocialCourtId(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
                >
                  {courts.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({SPORT_LABELS[c.sport]})
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Date</label>
                  <input
                    type="date"
                    required
                    value={socialDate}
                    onChange={(e) => setSocialDate(e.target.value)}
                    className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Start (2 Hr)</label>
                  <select
                    value={socialStart}
                    onChange={(e) => setSocialStart(e.target.value)}
                    className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg bg-white"
                  >
                    {['18:00', '18:30', '19:00', '19:30', '20:00'].map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Guest Fee (INR)</label>
                  <input
                    type="number"
                    min={0}
                    value={socialFee}
                    onChange={(e) => setSocialFee(e.target.value)}
                    className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Max Players</label>
                  <input
                    type="number"
                    min={4}
                    max={40}
                    value={socialMax}
                    onChange={(e) => setSocialMax(e.target.value)}
                    className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={busy}
                className="w-full py-2.5 text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg mt-2"
              >
                Publish Shared Session
              </button>
            </form>
          </div>
        </div>
      )}

      {cancelTarget && (
        <CancelBookingModal
          booking={cancelTarget}
          busy={busy}
          isStaff={mode === 'staff'}
          onClose={() => setCancelTarget(null)}
          onConfirm={handleConfirmCancel}
        />
      )}
    </div>
  );
}
