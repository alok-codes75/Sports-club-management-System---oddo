import {
  collection,
  doc,
  getDocs,
  query,
  runTransaction,
  serverTimestamp,
  where,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '@/src/services/firebase';
import {
  TIER_ENTITLEMENTS,
  type Booking,
  type BookingPaymentMethod,
  type Court,
  type Member,
  type PlayerTier,
  type SocialSession,
} from '@/src/types/club';
import {
  addMinutes,
  addOneHour,
  getCourtPriceForTier,
  getDateKey,
} from '@/src/utils/clubHelpers';

export interface CreateBookingInput {
  court: Court;
  date: string;
  startTime: string;
  userId: string;
  memberId?: string;
  playerName: string;
  playerPhone?: string;
  tier: PlayerTier;
  paymentMethod: BookingPaymentMethod;
  recordedByUid: string;
}

export async function createAtomicCourtBooking(input: CreateBookingInput): Promise<string> {
  const {
    court,
    date,
    startTime,
    userId,
    memberId,
    playerName,
    playerPhone,
    tier,
    paymentMethod,
    recordedByUid,
  } = input;

  const endTime = addOneHour(startTime);
  const secondHalfStart = addMinutes(startTime, 30);
  const lock1Id = `${court.id}_${date}_${startTime.replace(':', '')}`;
  const lock2Id = `${court.id}_${date}_${secondHalfStart.replace(':', '')}`;

  // Club policy limits members to 2 confirmed sessions per day
  if (tier !== 'walk_in') {
    const existingQ = memberId
      ? query(
          collection(db, 'bookings'),
          where('date', '==', date),
          where('memberId', '==', memberId),
          where('status', '==', 'confirmed')
        )
      : query(
          collection(db, 'bookings'),
          where('date', '==', date),
          where('userId', '==', userId),
          where('status', '==', 'confirmed')
        );

    try {
      const snap = await getDocs(existingQ);
      if (snap.size >= 2) {
        throw new Error('Daily limit reached: each member can book at most 2 court sessions per day.');
      }
    } catch (err) {
      if (err instanceof Error && err.message.startsWith('Daily limit reached')) {
        throw err;
      }
      handleFirestoreError(err, OperationType.LIST, 'bookings');
    }
  }

  const bookingId = `bk-${court.id}-${date.replace(/-/g, '')}-${startTime.replace(':', '')}-${Math.floor(100 + Math.random() * 900)}`;
  const { discountInr, finalAmountInr } = getCourtPriceForTier(court.hourlyRateInr, tier);
  const resolvedPayment: BookingPaymentMethod =
    finalAmountInr === 0 ? 'included' : paymentMethod === 'included' ? 'upi' : paymentMethod;

  try {
    await runTransaction(db, async (tx) => {
      const lock1Ref = doc(db, 'slotLocks', lock1Id);
      const lock2Ref = doc(db, 'slotLocks', lock2Id);
      const [lock1Snap, lock2Snap] = await Promise.all([tx.get(lock1Ref), tx.get(lock2Ref)]);

      if (lock1Snap.exists() || lock2Snap.exists()) {
        throw new Error(
          `Slot conflict: ${court.name} is already booked between ${startTime} and ${endTime}.`
        );
      }

      const bookingRef = doc(db, 'bookings', bookingId);
      const pubRef = doc(db, 'publicSchedule', bookingId);

      tx.set(lock1Ref, {
        courtId: court.id,
        date,
        slotTime: startTime,
        bookingId,
        userId,
        createdAt: serverTimestamp(),
      });

      tx.set(lock2Ref, {
        courtId: court.id,
        date,
        slotTime: secondHalfStart,
        bookingId,
        userId,
        createdAt: serverTimestamp(),
      });

      const bookingPayload: Record<string, unknown> = {
        courtId: court.id,
        courtName: court.name,
        sport: court.sport,
        date,
        startTime,
        endTime,
        userId,
        playerName: playerName.trim().slice(0, 100),
        tier,
        baseRateInr: court.hourlyRateInr,
        discountInr,
        finalAmountInr,
        paymentMethod: resolvedPayment,
        status: 'confirmed',
        lockIds: [lock1Id, lock2Id],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      if (memberId) bookingPayload.memberId = memberId;
      if (playerPhone && playerPhone.trim()) {
        bookingPayload.playerPhone = playerPhone.trim().slice(0, 20);
      }

      tx.set(bookingRef, bookingPayload);

      tx.set(pubRef, {
        courtId: court.id,
        courtName: court.name,
        sport: court.sport,
        date,
        startTime,
        endTime,
        slotType: 'booking',
        status: 'occupied',
        updatedAt: serverTimestamp(),
      });

      if (finalAmountInr > 0 && resolvedPayment !== 'included') {
        const txId = `tx-bk-${bookingId}`;
        const gstInr = Math.round((finalAmountInr * 18) / 118);
        const subtotalInr = finalAmountInr - gstInr;
        tx.set(doc(db, 'transactions', txId), {
          source: 'court',
          paymentMethod: resolvedPayment,
          subtotalInr,
          discountInr,
          gstInr,
          totalInr: finalAmountInr,
          referenceId: bookingId,
          description: `${court.name} (${date} ${startTime}–${endTime}) · ${playerName.trim()}`,
          dateKey: getDateKey(new Date()),
          recordedByUid,
          createdAt: serverTimestamp(),
        });
      }
    });

    if (memberId) {
      try {
        await runTransaction(db, async (tx) => {
          const mRef = doc(db, 'members', memberId);
          const mSnap = await tx.get(mRef);
          if (mSnap.exists()) {
            const mData = mSnap.data() as Member;
            tx.update(mRef, {
              totalSpentInr: (mData.totalSpentInr || 0) + finalAmountInr,
              visitsCount: (mData.visitsCount || 0) + 1,
              updatedAt: serverTimestamp(),
            });
          }
        });
      } catch {
        // Non-blocking counter update
      }
    }

    return bookingId;
  } catch (err) {
    if (err instanceof Error && err.message.startsWith('Slot conflict:')) {
      throw err;
    }
    handleFirestoreError(err, OperationType.CREATE, `bookings/${bookingId}`);
  }
}

export async function cancelCourtBooking(booking: Booking, reason?: string): Promise<void> {
  const sanitizedReason = reason ? reason.trim().slice(0, 200) : '';

  try {
    await runTransaction(db, async (tx) => {
      const bookingRef = doc(db, 'bookings', booking.id);
      const pubRef = doc(db, 'publicSchedule', booking.id);
      const lockRefs = (booking.lockIds || []).map((lockId) => doc(db, 'slotLocks', lockId));

      const [bookingSnap, pubSnap, ...lockSnaps] = await Promise.all([
        tx.get(bookingRef),
        tx.get(pubRef),
        ...lockRefs.map((ref) => tx.get(ref)),
      ]);

      if (!bookingSnap.exists()) {
        throw new Error('Booking record not found.');
      }

      const currentBooking = bookingSnap.data() as Omit<Booking, 'id'>;
      if (currentBooking.status !== 'confirmed') {
        throw new Error('This booking has already been cancelled or completed.');
      }

      const bookingUpdate: Record<string, unknown> = {
        status: 'cancelled',
        updatedAt: serverTimestamp(),
      };
      if (sanitizedReason) {
        bookingUpdate.cancellationReason = sanitizedReason;
      }

      tx.update(bookingRef, bookingUpdate);

      if (pubSnap.exists()) {
        tx.update(pubRef, {
          status: 'cancelled',
          updatedAt: serverTimestamp(),
        });
      }

      lockSnaps.forEach((lockSnap, idx) => {
        if (lockSnap.exists()) {
          tx.delete(lockRefs[idx]);
        }
      });
    });

    if (booking.memberId) {
      try {
        await runTransaction(db, async (tx) => {
          const mRef = doc(db, 'members', booking.memberId!);
          const mSnap = await tx.get(mRef);
          if (mSnap.exists()) {
            const mData = mSnap.data() as Member;
            tx.update(mRef, {
              visitsCount: Math.max(0, (mData.visitsCount || 0) - 1),
              updatedAt: serverTimestamp(),
            });
          }
        });
      } catch {
        // Non-blocking counter adjustment
      }
    }
  } catch (err) {
    if (
      err instanceof Error &&
      (err.message.includes('already been cancelled') || err.message.includes('not found'))
    ) {
      throw err;
    }
    handleFirestoreError(err, OperationType.UPDATE, `bookings/${booking.id}`);
  }
}

export async function joinSocialPlaySession(params: {
  session: SocialSession;
  userId: string;
  playerName: string;
  tier: PlayerTier;
  paymentMethod: BookingPaymentMethod;
  recordedByUid: string;
}): Promise<void> {
  const { session, userId, playerName, tier, paymentMethod, recordedByUid } = params;
  const paidInr =
    tier === 'gold'
      ? 0
      : tier === 'silver'
      ? TIER_ENTITLEMENTS.silver.socialPlayFeeInr
      : tier === 'junior'
      ? TIER_ENTITLEMENTS.junior.socialPlayFeeInr
      : session.feeInr;

  const resolvedMethod: BookingPaymentMethod =
    paidInr === 0 ? 'included' : paymentMethod === 'included' ? 'upi' : paymentMethod;
  const participantId = userId;

  try {
    await runTransaction(db, async (tx) => {
      const sessionRef = doc(db, 'socialSessions', session.id);
      const partRef = doc(db, 'socialSessions', session.id, 'participants', participantId);
      const pubRef = doc(db, 'publicSchedule', session.id);

      const [sessionSnap, partSnap, pubSnap] = await Promise.all([
        tx.get(sessionRef),
        tx.get(partRef),
        tx.get(pubRef),
      ]);

      if (!sessionSnap.exists()) throw new Error('Social play session not found.');
      if (partSnap.exists()) {
        throw new Error('You are already registered for this Friday Social Play session.');
      }

      const data = sessionSnap.data() as SocialSession;
      if (data.status !== 'open' || data.spotsFilled >= data.maxPlayers) {
        throw new Error('This Friday Social Play session is full.');
      }

      const nextSpots = data.spotsFilled + 1;
      const nextStatus = nextSpots >= data.maxPlayers ? 'full' : 'open';

      tx.set(partRef, {
        sessionId: session.id,
        userId,
        playerName: playerName.trim().slice(0, 100),
        tier,
        paidInr,
        paymentMethod: resolvedMethod,
        createdAt: serverTimestamp(),
      });

      tx.update(sessionRef, {
        spotsFilled: nextSpots,
        status: nextStatus,
        updatedAt: serverTimestamp(),
      });

      if (pubSnap.exists()) {
        tx.update(pubRef, {
          spotsFilled: nextSpots,
          status: 'social_open',
          updatedAt: serverTimestamp(),
        });
      }

      if (paidInr > 0 && resolvedMethod !== 'included') {
        const gstInr = Math.round((paidInr * 18) / 118);
        tx.set(doc(db, 'transactions', `tx-soc-${session.id}-${userId.slice(0, 12)}`), {
          source: 'court',
          paymentMethod: resolvedMethod,
          subtotalInr: paidInr - gstInr,
          discountInr: Math.max(0, session.feeInr - paidInr),
          gstInr,
          totalInr: paidInr,
          referenceId: session.id,
          description: `Friday Social Play (${session.title}) · ${playerName.trim()}`,
          dateKey: getDateKey(new Date()),
          recordedByUid,
          createdAt: serverTimestamp(),
        });
      }
    });
  } catch (err) {
    if (
      err instanceof Error &&
      (err.message.includes('already registered') || err.message.includes('full'))
    ) {
      throw err;
    }
    handleFirestoreError(err, OperationType.WRITE, `socialSessions/${session.id}`);
  }
}
