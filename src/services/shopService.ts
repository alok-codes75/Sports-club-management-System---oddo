import { doc, runTransaction, serverTimestamp } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '@/src/services/firebase';
import type { Member, OrderLineItem, PaymentMethod, PlayerTier } from '@/src/types/club';
import { getDateKey, getShopDiscountPercent } from '@/src/utils/clubHelpers';

export async function checkoutShopOrder(params: {
  items: { productId: string; quantity: number }[];
  userId: string;
  memberId?: string;
  customerName: string;
  tier: PlayerTier;
  channel: 'counter' | 'online';
  fulfillment: 'counter_pickup' | 'club_collect' | 'delivery';
  deliveryAddress?: string;
  paymentMethod: PaymentMethod;
  recordedByUid: string;
}): Promise<string> {
  const {
    items,
    userId,
    memberId,
    customerName,
    tier,
    channel,
    fulfillment,
    deliveryAddress,
    paymentMethod,
    recordedByUid,
  } = params;

  if (items.length === 0) throw new Error('Cart is empty.');
  const orderCode = `SHP-${Math.floor(10000 + Math.random() * 89999)}`;
  const orderId = `shop-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;

  try {
    let grandTotal = 0;

    await runTransaction(db, async (tx) => {
      const resolvedLines: OrderLineItem[] = [];
      let subtotalInr = 0;

      const productRefs = items.map((i) => doc(db, 'products', i.productId));
      const productSnaps = await Promise.all(productRefs.map((ref) => tx.get(ref)));

      productSnaps.forEach((snap, idx) => {
        if (!snap.exists()) {
          throw new Error('One of the items in your cart is no longer available.');
        }
        const pData = snap.data() as { name: string; sku: string; priceInr: number; stock: number };
        const reqQty = items[idx].quantity;
        if (pData.stock < reqQty) {
          throw new Error(`Insufficient shelf stock for ${pData.name} (only ${pData.stock} left).`);
        }

        const lineTotal = pData.priceInr * reqQty;
        subtotalInr += lineTotal;
        resolvedLines.push({
          productId: snap.id,
          sku: pData.sku,
          name: pData.name,
          unitPriceInr: pData.priceInr,
          quantity: reqQty,
          lineTotalInr: lineTotal,
        });

        tx.update(productRefs[idx], {
          stock: pData.stock - reqQty,
          updatedAt: serverTimestamp(),
        });
      });

      const discountPct = getShopDiscountPercent(tier);
      const discountInr = Math.round((subtotalInr * discountPct) / 100);
      const taxable = Math.max(0, subtotalInr - discountInr);
      const gstInr = Math.round(taxable * 0.18);
      const totalInr = taxable + gstInr;
      grandTotal = totalInr;

      const orderPayload: Record<string, unknown> = {
        orderCode,
        userId,
        customerName: customerName.trim().slice(0, 100),
        tier,
        channel,
        fulfillment,
        items: resolvedLines,
        subtotalInr,
        discountInr,
        gstInr,
        totalInr,
        paymentMethod,
        status: channel === 'counter' ? 'completed' : 'confirmed',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      if (memberId) orderPayload.memberId = memberId;
      if (deliveryAddress && deliveryAddress.trim()) {
        orderPayload.deliveryAddress = deliveryAddress.trim().slice(0, 300);
      }

      tx.set(doc(db, 'shopOrders', orderId), orderPayload);

      tx.set(doc(db, 'transactions', `tx-${orderId}`), {
        source: 'shop',
        paymentMethod,
        subtotalInr: taxable,
        discountInr,
        gstInr,
        totalInr,
        referenceId: orderCode,
        description: `Gear Shop (${channel === 'counter' ? 'Counter POS' : fulfillment}) · ${customerName.trim()}`,
        dateKey: getDateKey(new Date()),
        recordedByUid,
        createdAt: serverTimestamp(),
      });
    });

    if (memberId && grandTotal > 0) {
      try {
        await runTransaction(db, async (tx) => {
          const mRef = doc(db, 'members', memberId);
          const mSnap = await tx.get(mRef);
          if (mSnap.exists()) {
            const mData = mSnap.data() as Member;
            tx.update(mRef, {
              totalSpentInr: (mData.totalSpentInr || 0) + grandTotal,
              updatedAt: serverTimestamp(),
            });
          }
        });
      } catch {
        // Non-blocking spend sync
      }
    }

    return orderCode;
  } catch (err) {
    if (err instanceof Error && err.message.startsWith('Insufficient shelf stock')) {
      throw err;
    }
    handleFirestoreError(err, OperationType.WRITE, `shopOrders/${orderId}`);
  }
}
