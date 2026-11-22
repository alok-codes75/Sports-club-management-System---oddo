import { doc, serverTimestamp, writeBatch } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '@/src/services/firebase';
import type { Invoice, PaymentMethod } from '@/src/types/club';
import { getDateKey } from '@/src/utils/clubHelpers';

export async function markInvoicePaid(
  invoice: Invoice,
  paymentMethod: PaymentMethod | 'bank_transfer',
  recordedByUid: string
): Promise<void> {
  try {
    const batch = writeBatch(db);
    batch.update(doc(db, 'invoices', invoice.id), {
      status: 'paid',
      paymentMethod,
      updatedAt: serverTimestamp(),
    });
    batch.set(doc(db, 'transactions', `tx-inv-${invoice.id}`), {
      source: invoice.clientType === 'corporate' ? 'corporate' : 'membership',
      paymentMethod,
      subtotalInr: invoice.subtotalInr,
      discountInr: 0,
      gstInr: invoice.gstInr,
      totalInr: invoice.totalInr,
      referenceId: invoice.invoiceNumber,
      description: `Invoice ${invoice.invoiceNumber} · ${invoice.clientName}`,
      dateKey: getDateKey(new Date()),
      recordedByUid,
      createdAt: serverTimestamp(),
    });
    await batch.commit();
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `invoices/${invoice.id}`);
  }
}
