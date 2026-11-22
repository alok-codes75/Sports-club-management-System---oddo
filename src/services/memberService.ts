import { doc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '@/src/services/firebase';
import { TIER_ENTITLEMENTS, type MembershipTier, type PaymentMethod } from '@/src/types/club';
import { addDaysToDateKey, getDateKey } from '@/src/utils/clubHelpers';

export async function enrollMemberRecord(params: {
  fullName: string;
  email: string;
  phone: string;
  dob?: string;
  tier: MembershipTier;
  durationMonths: number;
  paymentMethod: PaymentMethod;
  userId?: string;
  notes?: string;
  recordedByUid: string;
  sourceEnquiryId?: string;
}): Promise<{ memberId: string; memberCode: string }> {
  const {
    fullName,
    email,
    phone,
    dob,
    tier,
    durationMonths,
    paymentMethod,
    userId,
    notes,
    recordedByUid,
    sourceEnquiryId,
  } = params;

  const startDate = getDateKey(new Date());
  const expiryDate = addDaysToDateKey(startDate, durationMonths * 30);
  const rand = Math.floor(1000 + Math.random() * 8999);
  const memberCode = `USC-${tier.slice(0, 1).toUpperCase()}${rand}`;
  const memberId = `mem-${Date.now()}-${rand}`;

  const plan = TIER_ENTITLEMENTS[tier];
  const basePrice =
    durationMonths === 12 ? plan.annualPriceInr : plan.monthlyPriceInr * durationMonths;
  const gstInr = Math.round(basePrice * 0.18);
  const totalInr = basePrice + gstInr;

  const payload: Record<string, unknown> = {
    memberCode,
    fullName: fullName.trim().slice(0, 100),
    email: email.trim().slice(0, 160),
    phone: phone.trim().slice(0, 20),
    tier,
    status: 'active',
    startDate,
    expiryDate,
    totalSpentInr: totalInr,
    visitsCount: 1,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  if (dob && dob.trim()) payload.dob = dob.trim();
  if (userId) payload.userId = userId;
  if (notes && notes.trim()) payload.notes = notes.trim().slice(0, 500);

  try {
    await setDoc(doc(db, 'members', memberId), payload);

    await setDoc(doc(db, 'transactions', `tx-mem-${memberId}`), {
      source: 'membership',
      paymentMethod,
      subtotalInr: basePrice,
      discountInr: 0,
      gstInr,
      totalInr,
      referenceId: memberCode,
      description: `${plan.name} Membership (${durationMonths} mo) · ${fullName.trim()}`,
      dateKey: startDate,
      recordedByUid,
      createdAt: serverTimestamp(),
    });

    if (sourceEnquiryId) {
      await updateDoc(doc(db, 'enquiries', sourceEnquiryId), {
        stage: 'converted',
        convertedMemberId: memberId,
        updatedAt: serverTimestamp(),
      });
    }

    return { memberId, memberCode };
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, `members/${memberId}`);
  }
}
