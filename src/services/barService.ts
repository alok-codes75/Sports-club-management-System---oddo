import { doc, runTransaction, serverTimestamp } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '@/src/services/firebase';
import type { BarOrder, Member, OrderLineItem, PaymentMethod, PlayerTier } from '@/src/types/club';
import { getBarDiscountPercent, getDateKey } from '@/src/utils/clubHelpers';

export async function createBarTicket(params: {
  tableNumber: string;
  shiftId?: string;
  member?: Member | null;
  guestName: string;
  items: OrderLineItem[];
  settleImmediately: boolean;
  paymentMethod: PaymentMethod;
  staffUid: string;
}): Promise<string> {
  const {
    tableNumber,
    shiftId,
    member,
    guestName,
    items,
    settleImmediately,
    paymentMethod,
    staffUid,
  } = params;

  if (items.length === 0) throw new Error('Add at least one food or drink item.');

  const tier: PlayerTier = member ? member.tier : 'walk_in';
  const subtotalInr = items.reduce((sum, i) => sum + i.lineTotalInr, 0);
  const discountPct = getBarDiscountPercent(tier);
  const discountInr = Math.round((subtotalInr * discountPct) / 100);
  const taxable = Math.max(0, subtotalInr - discountInr);
  const gstInr = Math.round(taxable * 0.05);
  const totalInr = taxable + gstInr;

  const ticketCode = `BAR-${Math.floor(1000 + Math.random() * 8999)}`;
  const orderId = `bar-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;

  try {
    await runTransaction(db, async (tx) => {
      const shiftRef = shiftId ? doc(db, 'barShifts', shiftId) : null;
      const shiftSnap = shiftRef ? await tx.get(shiftRef) : null;

      const orderPayload: Record<string, unknown> = {
        ticketCode,
        tableNumber: tableNumber.trim().slice(0, 20),
        guestName: (member ? member.fullName : guestName).trim().slice(0, 100),
        tier,
        items,
        subtotalInr,
        discountInr,
        gstInr,
        totalInr,
        kitchenStatus: 'queued',
        tabStatus: settleImmediately ? 'settled' : 'open',
        paymentMethod: settleImmediately ? paymentMethod : 'unpaid',
        staffUid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      if (shiftId) orderPayload.shiftId = shiftId;
      if (member) {
        orderPayload.memberId = member.id;
        if (member.userId) orderPayload.userId = member.userId;
      }

      tx.set(doc(db, 'barOrders', orderId), orderPayload);

      if (settleImmediately) {
        tx.set(doc(db, 'transactions', `tx-${orderId}`), {
          source: 'bar',
          paymentMethod,
          subtotalInr: taxable,
          discountInr,
          gstInr,
          totalInr,
          referenceId: ticketCode,
          description: `Bar & Cafe (${tableNumber}) · ${member ? member.fullName : guestName}`,
          dateKey: getDateKey(new Date()),
          recordedByUid: staffUid,
          createdAt: serverTimestamp(),
        });

        if (shiftRef && shiftSnap?.exists()) {
          const sData = shiftSnap.data() as {
            cashTotalInr: number;
            cardTotalInr: number;
            upiTotalInr: number;
            ordersCount: number;
            status: string;
          };
          if (sData.status === 'open') {
            tx.update(shiftRef, {
              cashTotalInr: sData.cashTotalInr + (paymentMethod === 'cash' ? totalInr : 0),
              cardTotalInr: sData.cardTotalInr + (paymentMethod === 'card' ? totalInr : 0),
              upiTotalInr: sData.upiTotalInr + (paymentMethod === 'upi' ? totalInr : 0),
              ordersCount: sData.ordersCount + 1,
              updatedAt: serverTimestamp(),
            });
          }
        }
      }
    });

    if (settleImmediately && member) {
      try {
        await runTransaction(db, async (tx) => {
          const mRef = doc(db, 'members', member.id);
          const mSnap = await tx.get(mRef);
          if (mSnap.exists()) {
            const mData = mSnap.data() as Member;
            tx.update(mRef, {
              totalSpentInr: (mData.totalSpentInr || 0) + totalInr,
              updatedAt: serverTimestamp(),
            });
          }
        });
      } catch {
        // Non-blocking spend sync
      }
    }

    return ticketCode;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, `barOrders/${orderId}`);
  }
}

export async function settleOpenBarTab(params: {
  order: BarOrder;
  paymentMethod: PaymentMethod;
  activeShiftId?: string;
  staffUid: string;
}): Promise<void> {
  const { order, paymentMethod, activeShiftId, staffUid } = params;
  const targetShiftId = activeShiftId || order.shiftId;

  try {
    await runTransaction(db, async (tx) => {
      const shiftRef = targetShiftId ? doc(db, 'barShifts', targetShiftId) : null;
      const shiftSnap = shiftRef ? await tx.get(shiftRef) : null;

      tx.update(doc(db, 'barOrders', order.id), {
        tabStatus: 'settled',
        paymentMethod,
        updatedAt: serverTimestamp(),
      });

      const taxable = Math.max(0, order.subtotalInr - order.discountInr);
      tx.set(doc(db, 'transactions', `tx-settle-${order.id}`), {
        source: 'bar',
        paymentMethod,
        subtotalInr: taxable,
        discountInr: order.discountInr,
        gstInr: order.gstInr,
        totalInr: order.totalInr,
        referenceId: order.ticketCode,
        description: `Bar Tab Settled (${order.tableNumber}) · ${order.guestName}`,
        dateKey: getDateKey(new Date()),
        recordedByUid: staffUid,
        createdAt: serverTimestamp(),
      });

      if (shiftRef && shiftSnap?.exists()) {
        const sData = shiftSnap.data() as {
          cashTotalInr: number;
          cardTotalInr: number;
          upiTotalInr: number;
          ordersCount: number;
          status: string;
        };
        if (sData.status === 'open') {
          tx.update(shiftRef, {
            cashTotalInr: sData.cashTotalInr + (paymentMethod === 'cash' ? order.totalInr : 0),
            cardTotalInr: sData.cardTotalInr + (paymentMethod === 'card' ? order.totalInr : 0),
            upiTotalInr: sData.upiTotalInr + (paymentMethod === 'upi' ? order.totalInr : 0),
            ordersCount: sData.ordersCount + 1,
            updatedAt: serverTimestamp(),
          });
        }
      }
    });

    if (order.memberId) {
      try {
        await runTransaction(db, async (tx) => {
          const mRef = doc(db, 'members', order.memberId!);
          const mSnap = await tx.get(mRef);
          if (mSnap.exists()) {
            const mData = mSnap.data() as Member;
            tx.update(mRef, {
              totalSpentInr: (mData.totalSpentInr || 0) + order.totalInr,
              updatedAt: serverTimestamp(),
            });
          }
        });
      } catch {
        // Non-blocking spend sync
      }
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `barOrders/${order.id}`);
  }
}
